import { createHash } from 'node:crypto';

/** Open Payments amount: integer value in minor units. */
export interface Amount {
  value: string;
  assetCode: string;
  assetScale: number;
}

export interface WalletInfo {
  id: string;
  assetCode: string;
  assetScale: number;
  authServer: string;
  resourceServer: string;
}

export interface GatewayQuote {
  id: string;
  debitAmount: Amount;
  receiveAmount: Amount;
  expiresAt?: string;
}

export interface PendingOutgoingGrant {
  /** URL the payer must visit to approve the payment in their wallet. */
  redirectUrl: string;
  continueUri: string;
  continueToken: string;
  /** Nonce from the AS, needed to verify the interaction hash on callback. */
  finishNonce: string;
}

export interface IncomingPaymentStatus {
  id: string;
  receivedAmount: Amount;
  incomingAmount?: Amount;
  completed: boolean;
}

/**
 * Everything RELEVO needs from an Open Payments provider. The live
 * implementation talks to real wallets; the simulator mirrors the same
 * GNAP flow in memory so the demo works without network or credentials.
 */
export interface PaymentGateway {
  readonly mode: 'live' | 'simulator';
  resolveWallet(walletAddressUrl: string): Promise<WalletInfo>;
  createIncomingPayment(merchant: WalletInfo, incomingAmount: Amount, expiresAt: Date, description: string): Promise<{ id: string }>;
  createQuote(payer: WalletInfo, incomingPaymentId: string): Promise<GatewayQuote>;
  requestOutgoingGrant(payer: WalletInfo, debitAmount: Amount, finish: { uri: string; nonce: string }): Promise<PendingOutgoingGrant>;
  continueGrantAndPay(args: {
    payer: WalletInfo;
    continueUri: string;
    continueToken: string;
    interactRef: string;
    quoteId: string;
  }): Promise<{ outgoingPaymentId: string }>;
  getIncomingPayment(merchant: WalletInfo, incomingPaymentId: string): Promise<IncomingPaymentStatus>;
}

/**
 * GNAP interaction hash (RFC 9635 §4.2.3) as computed by Rafiki:
 * base64(sha256(clientNonce \n finishNonce \n interactRef \n grantEndpointUrl))
 */
export function computeInteractHash(clientNonce: string, finishNonce: string, interactRef: string, authServerUrl: string): string {
  return createHash('sha256')
    .update(`${clientNonce}\n${finishNonce}\n${interactRef}\n${authServerUrl}`)
    .digest('base64');
}

export { normalizeWalletAddress } from '@relevo/shared';
