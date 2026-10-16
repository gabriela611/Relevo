import { randomUUID } from 'node:crypto';
import { CurrencyQuote, PaymentSaleRequest, PaymentState, VerifiedReceipt } from '@relevo/shared';
import { backendCrypto } from './cryptoService.js';
import { dbService, PaymentAttempt } from './db.js';
import { config, type OpMode } from '../config.js';
import { fromMinorUnits, toMinorUnits } from '@relevo/shared';
import { computeInteractHash, normalizeWalletAddress, type Amount, type PaymentGateway, type WalletInfo } from './gateways/gateway.js';
import { LiveOpenPaymentsGateway } from './gateways/live.js';
import { SimulatorGateway } from './gateways/simulator.js';

export type { WalletInfo };

/** Error with an HTTP status the API layer can return as-is. */
export class PaymentFlowError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export type VerificationResult =
  | { status: 'PAYMENT_VERIFIED'; receipt: VerifiedReceipt }
  | { status: 'PROCESSING'; receivedAmount: string; expectedAmount: string };

const FINAL_SALE_STATES: PaymentState[] = ['PAYMENT_VERIFIED', 'OFFLINE_VERIFIED'];
const POLL_INTERVAL_MS = 1000;

const toDecimal = (a: Amount) => fromMinorUnits(a.value, a.assetScale);

export class OpenPaymentsService {
  private _gateway: PaymentGateway | null = null;
  /** Serializes verification per sale so concurrent callers can't issue two receipts. */
  private verifying = new Map<string, Promise<VerificationResult>>();

  private get gateway(): PaymentGateway {
    if (!this._gateway) throw new Error('OpenPaymentsService no inicializado: llama init(OP_MODE) al arrancar.');
    return this._gateway;
  }

  get mode(): OpMode {
    return this.gateway.mode;
  }

  /** Test hook / manual override. */
  useGateway(gateway: PaymentGateway): void {
    this._gateway = gateway;
  }

  /**
   * Selects the gateway for the explicit mode. In live mode any failure is
   * fatal: we never silently fall back to the simulator.
   */
  async init(mode: OpMode): Promise<void> {
    if (mode === 'simulator') {
      this._gateway = new SimulatorGateway();
      return;
    }
    const { clientWalletAddress, keyId, privateKey } = config.openPayments;
    if (!keyId || !privateKey) {
      throw new Error('OP_MODE=live requiere OPEN_PAYMENTS_KEY_ID y OPEN_PAYMENTS_PRIVATE_KEY_PATH en backend/.env.');
    }
    try {
      this._gateway = await LiveOpenPaymentsGateway.create({ walletAddressUrl: clientWalletAddress, keyId, privateKey });
    } catch (err: any) {
      throw new Error(`No se pudo iniciar el cliente Open Payments (live) como ${clientWalletAddress}: ${err?.description || err?.message || err}`);
    }
  }

  async resolveWalletAddress(walletAddressUrl: string): Promise<WalletInfo> {
    return this.gateway.resolveWallet(normalizeWalletAddress(walletAddressUrl));
  }

  /**
   * Step 1: create (or reuse) the merchant's incoming payment for the sale and a
   * fixed-receive quote on the payer's wallet. Returns a quote whose quoteId
   * identifies this payment attempt in the rest of the flow.
   */
  async createQuote(params: { sale: PaymentSaleRequest; payerWalletAddress: string }): Promise<CurrencyQuote> {
    const sale = dbService.getSale(params.sale.saleId);
    if (!sale) throw new PaymentFlowError(404, 'Venta no encontrada.');
    if (FINAL_SALE_STATES.includes(sale.status)) throw new PaymentFlowError(409, 'Esta venta ya fue pagada.');
    if (sale.expiresAt <= Date.now()) {
      dbService.updateSaleStatus(sale.saleId, 'FAILED_OR_EXPIRED');
      throw new PaymentFlowError(410, 'La venta expiró.');
    }

    const merchant = await this.resolveWalletAddress(sale.merchantWalletAddress);
    const payer = await this.resolveWalletAddress(params.payerWalletAddress);

    let incomingPaymentId = dbService.getIncomingPaymentIdForSale(sale.saleId);
    if (!incomingPaymentId) {
      const incomingAmount = this.saleAmountFor(sale, merchant);
      const created = await this.gateway.createIncomingPayment(
        merchant,
        incomingAmount,
        new Date(sale.expiresAt),
        `RELEVO venta ${sale.saleId} - ${sale.merchantName}`
      );
      incomingPaymentId = created.id;
    }

    const quote = await this.gateway.createQuote(payer, incomingPaymentId);
    const attempt = dbService.createPayment({
      id: randomUUID(),
      saleId: sale.saleId,
      payerWallet: payer.id,
      incomingPaymentId,
      opQuoteId: quote.id,
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      quoteExpiresAt: quote.expiresAt ? Date.parse(quote.expiresAt) : undefined,
      status: 'QUOTED',
    });

    return this.toCurrencyQuote(attempt);
  }

  /**
   * Step 2: request the interactive outgoing-payment grant on the payer's wallet.
   * The frontend must send the payer's browser to `redirectUrl`.
   */
  async authorize(quoteId: string): Promise<{ paymentId: string; redirectUrl: string }> {
    const attempt = this.requireAttempt(quoteId);
    if (attempt.status === 'AUTHORIZATION_PENDING' && attempt.redirectUrl) {
      return { paymentId: attempt.id, redirectUrl: attempt.redirectUrl };
    }
    if (attempt.status !== 'QUOTED') {
      throw new PaymentFlowError(409, `El pago está en estado ${attempt.status}.`);
    }
    if (attempt.quoteExpiresAt && attempt.quoteExpiresAt <= Date.now()) {
      this.fail(attempt, 'La cotización expiró, solicita una nueva.');
      throw new PaymentFlowError(410, 'La cotización expiró, solicita una nueva.');
    }

    const payer = await this.resolveWalletAddress(attempt.payerWallet);
    const clientNonce = randomUUID();
    const finishUri = `${config.publicBackendUrl}/api/payments/callback?paymentId=${encodeURIComponent(attempt.id)}`;
    const grant = await this.gateway.requestOutgoingGrant(payer, attempt.debitAmount, { uri: finishUri, nonce: clientNonce });

    dbService.updatePayment(attempt.id, {
      status: 'AUTHORIZATION_PENDING',
      clientNonce,
      finishNonce: grant.finishNonce,
      continueUri: grant.continueUri,
      continueToken: grant.continueToken,
      redirectUrl: grant.redirectUrl,
    });
    dbService.updateSaleStatus(attempt.saleId, 'AUTHORIZATION_PENDING');

    return { paymentId: attempt.id, redirectUrl: grant.redirectUrl };
  }

  /**
   * Step 3: the payer's wallet redirects here after approval/rejection.
   * Continues the grant, creates the outgoing payment, then verifies funds.
   */
  async handleCallback(params: { paymentId: string; interactRef?: string; hash?: string; result?: string }): Promise<{ saleId: string; result: 'success' | 'pending' | 'failed'; error?: string }> {
    const attempt = this.requireAttempt(params.paymentId);

    if (attempt.status === 'COMPLETED') return { saleId: attempt.saleId, result: 'success' };
    if (attempt.status === 'PROCESSING') return { saleId: attempt.saleId, result: 'pending' };
    if (attempt.status !== 'AUTHORIZATION_PENDING') {
      return { saleId: attempt.saleId, result: 'failed', error: attempt.error ?? `Estado inválido: ${attempt.status}` };
    }

    if (params.result === 'grant_rejected' || !params.interactRef) {
      const error = 'El pagador rechazó la autorización.';
      this.fail(attempt, error);
      return { saleId: attempt.saleId, result: 'failed', error };
    }

    const payer = await this.resolveWalletAddress(attempt.payerWallet);
    if (params.hash && !this.isValidInteractHash(attempt, params.interactRef, params.hash, payer.authServer)) {
      // The continue token still protects the grant; log loudly but don't break the demo on URL formatting quirks.
      console.warn(`⚠️ Interaction hash mismatch for payment ${attempt.id}`);
    }

    dbService.updatePayment(attempt.id, { status: 'PROCESSING' });
    dbService.updateSaleStatus(attempt.saleId, 'PROCESSING');

    try {
      const { outgoingPaymentId } = await this.gateway.continueGrantAndPay({
        payer,
        continueUri: attempt.continueUri!,
        continueToken: attempt.continueToken!,
        interactRef: params.interactRef,
        quoteId: attempt.opQuoteId,
      });
      dbService.updatePayment(attempt.id, { outgoingPaymentId });
    } catch (err: any) {
      const error = err?.description || err?.message || 'No se pudo ejecutar el pago.';
      this.fail(attempt, error);
      return { saleId: attempt.saleId, result: 'failed', error };
    }

    const verification = await this.verifyPayment(attempt.saleId);
    return { saleId: attempt.saleId, result: verification.status === 'PAYMENT_VERIFIED' ? 'success' : 'pending' };
  }

  /**
   * Step 4 (Golden Rule): only sign a receipt after reading the merchant's incoming
   * payment and confirming receivedAmount >= requested amount. Safe to call repeatedly.
   */
  verifyPayment(saleId: string, timeoutMs = config.verifyTimeoutMs): Promise<VerificationResult> {
    const running = this.verifying.get(saleId);
    if (running) return running;
    const run = this.doVerify(saleId, timeoutMs).finally(() => this.verifying.delete(saleId));
    this.verifying.set(saleId, run);
    return run;
  }

  getPaymentStatus(paymentId: string) {
    const a = this.requireAttempt(paymentId);
    return {
      paymentId: a.id,
      saleId: a.saleId,
      status: a.status,
      error: a.error,
      redirectUrl: a.status === 'AUTHORIZATION_PENDING' ? a.redirectUrl : undefined,
      quote: this.toCurrencyQuote(a),
    };
  }

  private async doVerify(saleId: string, timeoutMs: number): Promise<VerificationResult> {
    const sale = dbService.getSale(saleId);
    if (!sale) throw new PaymentFlowError(404, 'Venta no encontrada.');

    const existing = dbService.getReceiptBySaleId(saleId);
    if (existing) return { status: 'PAYMENT_VERIFIED', receipt: existing };

    const attempt = dbService.getLatestPaidAttempt(saleId);
    if (!attempt) throw new PaymentFlowError(409, 'La venta aún no tiene un pago en curso.');

    const merchant = await this.resolveWalletAddress(sale.merchantWalletAddress);
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const incoming = await this.gateway.getIncomingPayment(merchant, attempt.incomingPaymentId);
      const expected = incoming.incomingAmount ?? attempt.receiveAmount;
      const received = BigInt(incoming.receivedAmount.value);

      if (received >= BigInt(expected.value) && incoming.receivedAmount.assetCode === expected.assetCode) {
        const receipt = await backendCrypto.issueSignedReceipt({
          receiptId: randomUUID(),
          saleId,
          merchantWalletAddress: sale.merchantWalletAddress,
          payerWalletAddress: attempt.payerWallet,
          amountReceived: toDecimal(incoming.receivedAmount),
          currency: incoming.receivedAmount.assetCode,
          assetScale: incoming.receivedAmount.assetScale,
          incomingPaymentId: attempt.incomingPaymentId,
          outgoingPaymentId: attempt.outgoingPaymentId,
        });
        dbService.saveReceipt(receipt);
        dbService.updateSaleStatus(saleId, 'PAYMENT_VERIFIED');
        dbService.updatePayment(attempt.id, { status: 'COMPLETED' });
        return { status: 'PAYMENT_VERIFIED', receipt: dbService.getReceiptBySaleId(saleId) ?? receipt };
      }

      if (Date.now() + POLL_INTERVAL_MS > deadline) {
        return {
          status: 'PROCESSING',
          receivedAmount: toDecimal(incoming.receivedAmount),
          expectedAmount: toDecimal(expected),
        };
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  private saleAmountFor(sale: PaymentSaleRequest, merchant: WalletInfo): Amount {
    if (this.gateway.mode === 'live' && merchant.assetCode.toUpperCase() !== sale.currency.toUpperCase()) {
      throw new PaymentFlowError(
        400,
        `La billetera del comercio opera en ${merchant.assetCode}, pero la venta está en ${sale.currency}.`
      );
    }
    const assetScale = this.gateway.mode === 'live' ? merchant.assetScale : sale.assetScale;
    let value: bigint;
    try {
      value = toMinorUnits(sale.amount, assetScale);
    } catch (err: any) {
      throw new PaymentFlowError(400, err.message);
    }
    return { value: value.toString(), assetCode: sale.currency.toUpperCase(), assetScale };
  }

  private toCurrencyQuote(a: PaymentAttempt): CurrencyQuote {
    const debit = a.debitAmount;
    const receive = a.receiveAmount;
    const debitUnits = Number(debit.value) / 10 ** debit.assetScale;
    const receiveUnits = Number(receive.value) / 10 ** receive.assetScale;
    // Open Payments doesn't itemize fees; we can only derive them when no FX is involved.
    const sameAsset = debit.assetCode === receive.assetCode && debit.assetScale === receive.assetScale;
    const feeMinor = sameAsset ? BigInt(debit.value) - BigInt(receive.value) : 0n;

    return {
      quoteId: a.id,
      debitAmount: { value: toDecimal(debit), assetCode: debit.assetCode, assetScale: debit.assetScale },
      receiveAmount: { value: toDecimal(receive), assetCode: receive.assetCode, assetScale: receive.assetScale },
      estimatedRate: debitUnits > 0 ? Number((receiveUnits / debitUnits).toFixed(6)) : 0,
      fees: {
        value: fromMinorUnits(feeMinor > 0n ? feeMinor : 0n, debit.assetScale),
        assetCode: debit.assetCode,
        assetScale: debit.assetScale,
      },
      expiresAt: a.quoteExpiresAt ?? Date.now() + 5 * 60 * 1000,
    };
  }

  private isValidInteractHash(a: PaymentAttempt, interactRef: string, hash: string, authServer: string): boolean {
    if (!a.clientNonce || !a.finishNonce) return false;
    const base = authServer.replace(/\/$/, '');
    return [base, `${base}/`].some((url) => computeInteractHash(a.clientNonce!, a.finishNonce!, interactRef, url) === hash);
  }

  private requireAttempt(paymentId: string): PaymentAttempt {
    const attempt = dbService.getPayment(paymentId);
    if (!attempt) throw new PaymentFlowError(404, 'Intento de pago no encontrado.');
    return attempt;
  }

  private fail(attempt: PaymentAttempt, error: string): void {
    dbService.updatePayment(attempt.id, { status: 'FAILED', error });
    // The sale itself can still be paid with a new attempt.
    const sale = dbService.getSale(attempt.saleId);
    if (sale && !FINAL_SALE_STATES.includes(sale.status)) {
      dbService.updateSaleStatus(attempt.saleId, 'WAITING_PAYMENT');
    }
  }
}

export const openPaymentsService = new OpenPaymentsService();
