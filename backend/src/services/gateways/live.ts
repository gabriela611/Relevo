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
import { DEFAULT_RETRY_POLICY, withRetry, type RetryPolicy } from './retry.js';

/**
 * Real Open Payments flow against Interledger wallets (e.g. wallet.interledger-test.dev):
 *  1. non-interactive grant + incoming payment on the merchant wallet
 *  2. non-interactive grant + quote on the payer wallet (fixed-receive, since the incoming payment has an amount)
 *  3. interactive outgoing-payment grant: payer approves in their wallet
 *  4. grant continuation + outgoing payment
 *  5. read the incoming payment to verify funds actually arrived
 *
 * Retries: only idempotent-enough calls go through `safe()` (wallet lookups,
 * non-interactive grants, incoming payment / quote creation, reads). The
 * interactive grant, grant.continue and outgoingPayment.create are called
 * exactly once: retrying them after an ambiguous timeout could pay twice.
 */
export class LiveOpenPaymentsGateway implements PaymentGateway {
  readonly mode = 'live' as const;
  private readTokens = new Map<string, { token: string; expiresAt: number }>();

  private constructor(
    private client: AuthenticatedClient,
    private retryPolicy: RetryPolicy
  ) {}

  static async create(opts: {
    walletAddressUrl: string;
    keyId: string;
    privateKey: string;
    requestTimeoutMs: number;
    retryPolicy?: RetryPolicy;
  }): Promise<LiveOpenPaymentsGateway> {
    const client = await createAuthenticatedClient({
      walletAddressUrl: opts.walletAddressUrl,
      keyId: opts.keyId,
      privateKey: opts.privateKey,
      requestTimeoutMs: opts.requestTimeoutMs,
      logLevel: 'warn',
    });
    return new LiveOpenPaymentsGateway(client, opts.retryPolicy ?? DEFAULT_RETRY_POLICY);
  }

  /** Test hook: wrap an existing (or fake) SDK client. */
  static withClient(client: AuthenticatedClient, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): LiveOpenPaymentsGateway {
    return new LiveOpenPaymentsGateway(client, retryPolicy);
  }

  private safe<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return withRetry(label, fn, this.retryPolicy);
  }

  async resolveWallet(walletAddressUrl: string): Promise<WalletInfo> {
    const wallet = await this.safe('walletAddress.get', () => this.client.walletAddress.get({ url: walletAddressUrl }));
    return {
      id: wallet.id,
      assetCode: wallet.assetCode,
      assetScale: wallet.assetScale,
      authServer: wallet.authServer,
      resourceServer: wallet.resourceServer,
    };
  }

  async createIncomingPayment(merchant: WalletInfo, incomingAmount: Amount, expiresAt: Date, description: string) {
    const grant = await this.safe('grant.request(incoming-payment)', () =>
      this.client.grant.request(
        { url: merchant.authServer },
        { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read'] }] } }
      )
    );
    if (!isFinalizedGrantWithAccessToken(grant)) {
      throw new Error('La billetera del comercio requiere interacción para crear cobros.');
    }
    // A duplicate from a retried timeout is an unpaid, unused incoming payment: harmless.
    const incoming = await this.safe('incomingPayment.create', () =>
      this.client.incomingPayment.create(
        { url: merchant.resourceServer, accessToken: grant.access_token.value },
        {
          walletAddress: merchant.id,
          incomingAmount,
          expiresAt: expiresAt.toISOString(),
          metadata: { description },
        }
      )
    );
    return { id: incoming.id };
  }

  async createQuote(payer: WalletInfo, incomingPaymentId: string): Promise<GatewayQuote> {
    const grant = await this.safe('grant.request(quote)', () =>
      this.client.grant.request(
        { url: payer.authServer },
        { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } }
      )
    );
    if (!isFinalizedGrantWithAccessToken(grant)) {
      throw new Error('La billetera del pagador requiere interacción para cotizar.');
    }
    const quote = await this.safe('quote.create', () =>
      this.client.quote.create(
        { url: payer.resourceServer, accessToken: grant.access_token.value },
        { walletAddress: payer.id, receiver: incomingPaymentId, method: 'ilp' }
      )
    );
    return {
      id: quote.id,
      debitAmount: quote.debitAmount,
      receiveAmount: quote.receiveAmount,
      expiresAt: quote.expiresAt,
    };
  }

  async requestOutgoingGrant(payer: WalletInfo, debitAmount: Amount, finish: { uri: string; nonce: string }): Promise<PendingOutgoingGrant> {
    // NOT retried: each call starts a new consent interaction for the buyer.
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
    // NOT retried: an interact_ref can be redeemed once; a blind retry fails or double-consumes.
    const finalized = await this.client.grant.continue(
      { url: args.continueUri, accessToken: args.continueToken },
      { interact_ref: args.interactRef }
    );
    if (!isFinalizedGrantWithAccessToken(finalized)) {
      throw new Error('La autorización del pagador no fue concedida.');
    }
    // NOT retried: if the first request reached the wallet, a retry could pay twice.
    const outgoing = await this.client.outgoingPayment.create(
      { url: args.payer.resourceServer, accessToken: finalized.access_token.value },
      { walletAddress: args.payer.id, quoteId: args.quoteId }
    );
    return { outgoingPaymentId: outgoing.id };
  }

  async getIncomingPayment(merchant: WalletInfo, incomingPaymentId: string): Promise<IncomingPaymentStatus> {
    const token = await this.getIncomingReadToken(merchant.authServer);
    const incoming = await this.safe('incomingPayment.get', () =>
      this.client.incomingPayment.get({ url: incomingPaymentId, accessToken: token })
    );
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

    const grant = await this.safe('grant.request(incoming-payment read)', () =>
      this.client.grant.request(
        { url: authServer },
        { access_token: { access: [{ type: 'incoming-payment', actions: ['read', 'read-all'] }] } }
      )
    );
    if (!isFinalizedGrantWithAccessToken(grant)) {
      throw new Error('No se pudo obtener acceso de lectura a los cobros del comercio.');
    }
    const ttlMs = ((grant.access_token.expires_in ?? 60) - 5) * 1000;
    this.readTokens.set(authServer, { token: grant.access_token.value, expiresAt: Date.now() + ttlMs });
    return grant.access_token.value;
  }
}
