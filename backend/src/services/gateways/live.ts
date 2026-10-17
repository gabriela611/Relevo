import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
  isPendingGrant,
  type AuthenticatedClient,
} from '@interledger/open-payments';
import type {
  Amount,
  GatewayQuote,
  IncomingPaymentStatus,
  PaymentGateway,
  PendingOutgoingGrant,
  WalletInfo,
} from './gateway.js';

/**
 * Real Open Payments flow against Interledger wallets (e.g. wallet.interledger-test.dev):
 *  1. non-interactive grant + incoming payment on the merchant wallet
 *  2. non-interactive grant + quote on the payer wallet (fixed-receive, since the incoming payment has an amount)
 *  3. interactive outgoing-payment grant: payer approves in their wallet
 *  4. grant continuation + outgoing payment
 *  5. read the incoming payment to verify funds actually arrived
 */
export class LiveOpenPaymentsGateway implements PaymentGateway {
  readonly mode = 'live' as const;
  private readTokens = new Map<string, { token: string; expiresAt: number }>();

  private constructor(private client: AuthenticatedClient) {}

  static async create(opts: { walletAddressUrl: string; keyId: string; privateKey: string }): Promise<LiveOpenPaymentsGateway> {
    const client = await createAuthenticatedClient({
      walletAddressUrl: opts.walletAddressUrl,
      keyId: opts.keyId,
      privateKey: opts.privateKey,
      logLevel: 'warn',
    });
    return new LiveOpenPaymentsGateway(client);
  }

  async resolveWallet(walletAddressUrl: string): Promise<WalletInfo> {
    const wallet = await this.client.walletAddress.get({ url: walletAddressUrl });
    return {
      id: wallet.id,
      assetCode: wallet.assetCode,
      assetScale: wallet.assetScale,
      authServer: wallet.authServer,
      resourceServer: wallet.resourceServer,
    };
  }

  async createIncomingPayment(merchant: WalletInfo, incomingAmount: Amount, expiresAt: Date, description: string) {
    const grant = await this.client.grant.request(
      { url: merchant.authServer },
      { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read'] }] } }
    );
    if (!isFinalizedGrantWithAccessToken(grant)) {
      throw new Error('La billetera del comercio requiere interacción para crear cobros.');
    }
    const incoming = await this.client.incomingPayment.create(
      { url: merchant.resourceServer, accessToken: grant.access_token.value },
      {
        walletAddress: merchant.id,
        incomingAmount,
        expiresAt: expiresAt.toISOString(),
        metadata: { description },
      }
    );
    return { id: incoming.id };
  }

  async createQuote(payer: WalletInfo, incomingPaymentId: string): Promise<GatewayQuote> {
    const grant = await this.client.grant.request(
      { url: payer.authServer },
      { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } }
    );
    if (!isFinalizedGrantWithAccessToken(grant)) {
      throw new Error('La billetera del pagador requiere interacción para cotizar.');
    }
    const quote = await this.client.quote.create(
      { url: payer.resourceServer, accessToken: grant.access_token.value },
      { walletAddress: payer.id, receiver: incomingPaymentId, method: 'ilp' }
    );
    return {
      id: quote.id,
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      expiresAt: quote.expiresAt,
    };
  }

  async requestOutgoingGrant(payer: WalletInfo, debitAmount: Amount, finish: { uri: string; nonce: string }): Promise<PendingOutgoingGrant> {
    const grant = await this.client.grant.request(
      { url: payer.authServer },
      {
        access_token: {
          access: [
            {
              type: 'outgoing-payment',
              actions: ['create', 'read'],
              identifier: payer.id,
              limits: { debitAmount },
            },
          ],
        },
        interact: {
          start: ['redirect'],
          finish: { method: 'redirect', uri: finish.uri, nonce: finish.nonce },
        },
      }
    );
    if (!isPendingGrant(grant)) {
      throw new Error('Se esperaba una autorización interactiva (GNAP) del pagador.');
    }
    return {
      redirectUrl: grant.interact.redirect,
      continueUri: grant.continue.uri,
      continueToken: grant.continue.access_token.value,
      finishNonce: grant.interact.finish,
    };
  }

  async continueGrantAndPay(args: {
    payer: WalletInfo;
    continueUri: string;
    continueToken: string;
    interactRef: string;
    quoteId: string;
  }) {
    const finalized = await this.client.grant.continue(
      { url: args.continueUri, accessToken: args.continueToken },
      { interact_ref: args.interactRef }
    );
    if (!isFinalizedGrantWithAccessToken(finalized)) {
      throw new Error('La autorización del pagador no fue concedida.');
    }
    const outgoing = await this.client.outgoingPayment.create(
      { url: args.payer.resourceServer, accessToken: finalized.access_token.value },
      { walletAddress: args.payer.id, quoteId: args.quoteId }
    );
    return { outgoingPaymentId: outgoing.id };
  }

  async getIncomingPayment(merchant: WalletInfo, incomingPaymentId: string): Promise<IncomingPaymentStatus> {
    const token = await this.getIncomingReadToken(merchant.authServer);
    const incoming = await this.client.incomingPayment.get({ url: incomingPaymentId, accessToken: token });
    return {
      id: incoming.id,
      receivedAmount: incoming.receivedAmount,
      incomingAmount: incoming.incomingAmount,
      completed: incoming.completed,
    };
  }

  private async getIncomingReadToken(authServer: string): Promise<string> {
    const cached = this.readTokens.get(authServer);
    if (cached && cached.expiresAt > Date.now()) return cached.token;

    const grant = await this.client.grant.request(
      { url: authServer },
      { access_token: { access: [{ type: 'incoming-payment', actions: ['read', 'read-all'] }] } }
    );
    if (!isFinalizedGrantWithAccessToken(grant)) {
      throw new Error('No se pudo obtener acceso de lectura a los cobros del comercio.');
    }
    const ttlMs = ((grant.access_token.expires_in ?? 60) - 5) * 1000;
    this.readTokens.set(authServer, { token: grant.access_token.value, expiresAt: Date.now() + ttlMs });
    return grant.access_token.value;
  }
}
