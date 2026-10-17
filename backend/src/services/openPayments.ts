import { randomUUID } from 'node:crypto';
import { CurrencyQuote, PaymentSaleRequest, PaymentState, VerifiedReceipt } from '@relevo/shared';
import { backendCrypto } from './cryptoService.js';
import { dbService, type HashCheck, type PaymentAttempt } from './db.js';
import { config, type OpMode } from '../config.js';
import { effectiveRate, fromMinorUnits, isAtLeast, toMinorUnits } from '@relevo/shared';
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

export type AuthorizeResult =
  | { requoted: false; paymentId: string; redirectUrl: string }
  | { requoted: true; quote: CurrencyQuote };

export type CallbackFailureReason =
  | 'GRANT_REJECTED'
  | 'MISSING_INTERACT_REF'
  | 'HASH_MISMATCH'
  | 'PAYMENT_FAILED'
  | 'INVALID_STATE';

export interface CallbackOutcome {
  saleId: string;
  result: 'success' | 'pending' | 'failed';
  reason?: CallbackFailureReason;
  error?: string;
}

const FINAL_SALE_STATES: PaymentState[] = ['PAYMENT_VERIFIED', 'OFFLINE_VERIFIED'];
const POLL_INTERVAL_MS = 1000;
/** Quotes expiring sooner than this are replaced before asking the buyer to consent. */
export const REQUOTE_MARGIN_MS = 60_000;

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
      this._gateway = await LiveOpenPaymentsGateway.create({
        walletAddressUrl: clientWalletAddress,
        keyId,
        privateKey,
        requestTimeoutMs: config.opRequestTimeoutMs,
      });
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
    const sale = this.requirePayableSale(params.sale.saleId);
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

    return this.toCurrencyQuote(await this.newAttempt(sale.saleId, payer, incomingPaymentId));
  }

  /**
   * Step 2: request the interactive outgoing-payment grant on the payer's wallet.
   * The frontend must send the payer's browser to `redirectUrl`.
   * If the quote expires within REQUOTE_MARGIN_MS, no grant is requested: a fresh
   * quote is returned instead so the buyer can confirm the new breakdown first.
   */
  async authorize(quoteId: string): Promise<AuthorizeResult> {
    const attempt = this.requireAttempt(quoteId);
    if (attempt.status === 'AUTHORIZATION_PENDING' && attempt.redirectUrl) {
      return { requoted: false, paymentId: attempt.id, redirectUrl: attempt.redirectUrl };
    }
    if (attempt.status !== 'QUOTED') {
      throw new PaymentFlowError(409, `El pago está en estado ${attempt.status}.`);
    }

    const payer = await this.resolveWalletAddress(attempt.payerWallet);

    if (attempt.quoteExpiresAt !== undefined && attempt.quoteExpiresAt - Date.now() < REQUOTE_MARGIN_MS) {
      this.requirePayableSale(attempt.saleId);
      this.fail(attempt, 'QUOTE_EXPIRED', 'La cotización estaba por vencer; se generó una nueva.');
      const fresh = await this.newAttempt(attempt.saleId, payer, attempt.incomingPaymentId);
      return { requoted: true, quote: this.toCurrencyQuote(fresh) };
    }

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

    return { requoted: false, paymentId: attempt.id, redirectUrl: grant.redirectUrl };
  }

  /**
   * Step 3: the payer's wallet redirects here after approval/rejection.
   * Continues the grant, creates the outgoing payment, then verifies funds.
   */
  async handleCallback(params: { paymentId: string; interactRef?: string; hash?: string; result?: string }): Promise<CallbackOutcome> {
    const attempt = this.requireAttempt(params.paymentId);
    const failed = (reason: CallbackFailureReason, error: string): CallbackOutcome => ({ saleId: attempt.saleId, result: 'failed', reason, error });

    if (attempt.status === 'COMPLETED') return { saleId: attempt.saleId, result: 'success' };
    if (attempt.status === 'PROCESSING') return { saleId: attempt.saleId, result: 'pending' };
    if (attempt.status !== 'AUTHORIZATION_PENDING') {
      return failed('INVALID_STATE', attempt.error ?? `Estado inválido: ${attempt.status}`);
    }

    if (params.result === 'grant_rejected') {
      const error = 'El comprador rechazó el pago en su billetera.';
      this.fail(attempt, 'GRANT_REJECTED', error);
      return failed('GRANT_REJECTED', error);
    }
    if (!params.interactRef) {
      const error = 'La billetera no confirmó la autorización (sin interact_ref). El pago no se realizó.';
      this.fail(attempt, 'MISSING_INTERACT_REF', error);
      return failed('MISSING_INTERACT_REF', error);
    }

    const payer = await this.resolveWalletAddress(attempt.payerWallet);
    const hashCheck: HashCheck = !params.hash
      ? 'ABSENT'
      : this.isValidInteractHash(attempt, params.interactRef, params.hash, payer.authServer)
        ? 'MATCH'
        : 'MISMATCH';
    dbService.updatePayment(attempt.id, { hashCheck });
    if (hashCheck !== 'MATCH') {
      if (config.strictHash) {
        const error = 'La confirmación de la billetera no pasó la verificación de seguridad (hash).';
        this.fail(attempt, 'HASH_MISMATCH', error);
        return failed('HASH_MISMATCH', error);
      }
      // STRICT_HASH=false: the continue token still protects the grant. Warn and continue.
      console.warn(`⚠️ Interaction hash ${hashCheck} for payment ${attempt.id} (STRICT_HASH=false, continuing)`);
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
      this.fail(attempt, 'PAYMENT_FAILED', error);
      return failed('PAYMENT_FAILED', error);
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
      hashCheck: a.hashCheck,
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
    const saleAmount = { value: toMinorUnits(sale.amount, sale.assetScale).toString(), assetScale: sale.assetScale };

    while (true) {
      const incoming = await this.gateway.getIncomingPayment(merchant, attempt.incomingPaymentId);
      const expected = incoming.incomingAmount ?? attempt.receiveAmount;
      const got = incoming.receivedAmount;

      // Golden rule, two independent checks; both must hold before anything is signed:
      // 1. the incoming payment is fully paid (same asset and scale as it requested);
      const coversIncoming =
        got.assetCode === expected.assetCode &&
        got.assetScale === expected.assetScale &&
        BigInt(got.value) >= BigInt(expected.value);
      // 2. what arrived covers the SALE itself, in the sale's currency (scale-normalized),
      //    so a wrong or tampered incoming payment can never produce a receipt.
      const coversSale = got.assetCode.toUpperCase() === sale.currency.toUpperCase() && isAtLeast(got, saleAmount);

      if (coversIncoming && coversSale) {
        const receipt = await backendCrypto.issueSignedReceipt({
          receiptId: randomUUID(),
          saleId,
          merchantWallet: sale.merchantWalletAddress,
          amountReceived: { ...incoming.receivedAmount },
          incomingPaymentId: attempt.incomingPaymentId,
          outgoingPaymentId: attempt.outgoingPaymentId!,
          mode: this.gateway.mode,
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
    // Open Payments doesn't itemize fees. Without FX the fee is simply debit - receive;
    // with FX it is inseparable from the rate, so we report it as included instead of a fake 0.
    const sameAsset = debit.assetCode === receive.assetCode && debit.assetScale === receive.assetScale;
    const feeMinor = sameAsset ? BigInt(debit.value) - BigInt(receive.value) : 0n;

    return {
      quoteId: a.id,
      debitAmount: { value: toDecimal(debit), assetCode: debit.assetCode, assetScale: debit.assetScale },
      receiveAmount: { value: toDecimal(receive), assetCode: receive.assetCode, assetScale: receive.assetScale },
      effectiveRate: effectiveRate(debit, receive),
      fees: sameAsset
        ? { value: fromMinorUnits(feeMinor > 0n ? feeMinor : 0n, debit.assetScale), assetCode: debit.assetCode, assetScale: debit.assetScale }
        : null,
      feesIncluded: !sameAsset,
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

  /** Marks the attempt failed as "REASON: message"; the sale itself can still be paid with a new attempt. */
  private fail(attempt: PaymentAttempt, reason: CallbackFailureReason | 'QUOTE_EXPIRED', error: string): void {
    dbService.updatePayment(attempt.id, { status: 'FAILED', error: `${reason}: ${error}` });
    const sale = dbService.getSale(attempt.saleId);
    if (sale && !FINAL_SALE_STATES.includes(sale.status)) {
      dbService.updateSaleStatus(attempt.saleId, 'WAITING_PAYMENT');
    }
  }

  private requirePayableSale(saleId: string) {
    const sale = dbService.getSale(saleId);
    if (!sale) throw new PaymentFlowError(404, 'Venta no encontrada.');
    if (FINAL_SALE_STATES.includes(sale.status)) throw new PaymentFlowError(409, 'Esta venta ya fue pagada.');
    if (sale.expiresAt <= Date.now()) {
      dbService.updateSaleStatus(sale.saleId, 'FAILED_OR_EXPIRED');
      throw new PaymentFlowError(410, 'La venta expiró.');
    }
    return sale;
  }

  /** Quotes on the payer's wallet against the sale's incoming payment and records a new attempt. */
  private async newAttempt(saleId: string, payer: WalletInfo, incomingPaymentId: string): Promise<PaymentAttempt> {
    const quote = await this.gateway.createQuote(payer, incomingPaymentId);
    return dbService.createPayment({
      id: randomUUID(),
      saleId,
      payerWallet: payer.id,
      incomingPaymentId,
      opQuoteId: quote.id,
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      quoteExpiresAt: quote.expiresAt ? Date.parse(quote.expiresAt) : undefined,
      status: 'QUOTED',
    });
  }
}

export const openPaymentsService = new OpenPaymentsService();
