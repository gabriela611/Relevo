import { randomUUID } from 'node:crypto';
import {
  computeInteractHash,
  type Amount,
  type GatewayQuote,
  type IncomingPaymentStatus,
  type PaymentGateway,
  type PendingOutgoingGrant,
  type WalletInfo,
} from './gateway.js';

// Demo exchange rates (value of 1 unit in USD)
const BASE_RATES_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  MXN: 0.051,
  COP: 0.00024,
  GBP: 1.29,
};

const SIMULATED_FEE = 0.005; // 0.5%

/**
 * In-memory stand-in for Open Payments. It follows the same steps and
 * state as the live gateway, including the GNAP redirect, so the frontend
 * code path is identical. The "approval" redirect points straight back to
 * our own callback with a valid interaction hash.
 */
export class SimulatorGateway implements PaymentGateway {
  readonly mode = 'simulator' as const;
  private incoming = new Map<string, { incomingAmount: Amount; received: bigint }>();
  private quotes = new Map<string, GatewayQuote & { receiver: string }>();
  private grants = new Map<string, { clientNonce: string; finishNonce: string; finishUri: string; interactRef: string; authServer: string }>();

  async resolveWallet(walletAddressUrl: string): Promise<WalletInfo> {
    const lower = walletAddressUrl.toLowerCase();
    const assetCode = ['eur', 'mxn', 'cop', 'gbp'].find((c) => lower.includes(c))?.toUpperCase() ?? 'USD';
    return {
      id: walletAddressUrl,
      assetCode,
      assetScale: 2,
      authServer: `${walletAddressUrl}/auth`,
      resourceServer: `${walletAddressUrl}/resource`,
    };
  }

  async createIncomingPayment(merchant: WalletInfo, incomingAmount: Amount) {
    const id = `${merchant.resourceServer}/incoming-payments/${randomUUID()}`;
    this.incoming.set(id, { incomingAmount, received: 0n });
    return { id };
  }

  async createQuote(payer: WalletInfo, incomingPaymentId: string): Promise<GatewayQuote> {
    const incoming = this.incoming.get(incomingPaymentId);
    if (!incoming) throw new Error('Incoming payment no encontrado (simulador).');

    const receive = incoming.incomingAmount;
    const receiveUnits = Number(receive.value) / 10 ** receive.assetScale;
    const rate = (BASE_RATES_USD[receive.assetCode] ?? 1) / (BASE_RATES_USD[payer.assetCode] ?? 1);
    const debitUnits = receiveUnits * rate * (1 + SIMULATED_FEE);
    const debitMinor = Math.ceil(debitUnits * 10 ** payer.assetScale);

    const quote = {
      id: `${payer.resourceServer}/quotes/${randomUUID()}`,
      receiver: incomingPaymentId,
      debitAmount: { value: String(debitMinor), assetCode: payer.assetCode, assetScale: payer.assetScale },
      receiveAmount: { ...receive },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
    this.quotes.set(quote.id, quote);
    return quote;
  }

  async requestOutgoingGrant(payer: WalletInfo, _debitAmount: Amount, finish: { uri: string; nonce: string }): Promise<PendingOutgoingGrant> {
    const continueToken = randomUUID();
    const finishNonce = randomUUID();
    const interactRef = `sim_${randomUUID()}`;
    this.grants.set(continueToken, { clientNonce: finish.nonce, finishNonce, finishUri: finish.uri, interactRef, authServer: payer.authServer });

    const hash = computeInteractHash(finish.nonce, finishNonce, interactRef, payer.authServer);
    const redirect = new URL(finish.uri);
    redirect.searchParams.set('interact_ref', interactRef);
    redirect.searchParams.set('hash', hash);

    return {
      redirectUrl: redirect.toString(),
      continueUri: `${payer.authServer}/continue/${continueToken}`,
      continueToken,
      finishNonce,
    };
  }

  async continueGrantAndPay(args: { continueToken: string; interactRef: string; quoteId: string; payer: WalletInfo }) {
    const grant = this.grants.get(args.continueToken);
    if (!grant || grant.interactRef !== args.interactRef) {
      throw new Error('Autorización inválida (simulador).');
    }
    const quote = this.quotes.get(args.quoteId);
    if (!quote) throw new Error('Cotización no encontrada (simulador).');

    const incoming = this.incoming.get(quote.receiver);
    if (!incoming) throw new Error('Incoming payment no encontrado (simulador).');
    incoming.received += BigInt(quote.receiveAmount.value);
    this.grants.delete(args.continueToken);

    return { outgoingPaymentId: `${args.payer.resourceServer}/outgoing-payments/${randomUUID()}` };
  }

  async getIncomingPayment(_merchant: WalletInfo, incomingPaymentId: string): Promise<IncomingPaymentStatus> {
    const incoming = this.incoming.get(incomingPaymentId);
    if (!incoming) throw new Error('Incoming payment no encontrado (simulador).');
    return {
      id: incomingPaymentId,
      incomingAmount: incoming.incomingAmount,
      receivedAmount: { ...incoming.incomingAmount, value: incoming.received.toString() },
      completed: incoming.received >= BigInt(incoming.incomingAmount.value),
    };
  }
}
