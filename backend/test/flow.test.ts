import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import type { WalletInfo } from '../src/services/gateways/gateway.js';

// Configure before any backend module reads config.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relevo-test-'));
process.env.DB_PATH = ':memory:';
process.env.RELEVO_KEYS_FILE = path.join(tmpDir, 'keys.json');
process.env.OP_MODE = 'simulator';
process.env.PUBLIC_BACKEND_URL = 'http://backend.test';
process.env.FRONTEND_URL = 'http://frontend.test';

const { buildServer } = await import('../src/app.js');
const { backendCrypto } = await import('../src/services/cryptoService.js');
const { openPaymentsService } = await import('../src/services/openPayments.js');
const { SimulatorGateway } = await import('../src/services/gateways/simulator.js');
const shared = await import('@relevo/shared');

type App = Awaited<ReturnType<typeof buildServer>>;
let app: App;
let pinnedKey: Awaited<ReturnType<typeof shared.importPinnedReceiptKey>>;

const MERCHANT = 'https://ilp.interledger-test.dev/tienda-usd';
const PAYER_EUR = 'https://ilp.interledger-test.dev/turista-eur';

function newSale(overrides: Record<string, unknown> = {}) {
  return {
    version: '1' as const,
    saleId: `sale-${crypto.randomUUID()}`,
    merchantId: 'merchant-default',
    merchantName: 'Tienda Test',
    merchantWalletAddress: MERCHANT,
    amount: '15.00',
    currency: 'USD',
    assetScale: 2,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomUUID(),
    ...overrides,
  };
}

/** Runs quote + authorize and returns the GNAP redirect the payer would follow. */
async function quoteAndAuthorize(sale: ReturnType<typeof newSale>) {
  const quoteRes = await app.inject({ method: 'POST', url: '/api/payments/quote', payload: { sale, payerWalletAddress: PAYER_EUR } });
  assert.equal(quoteRes.statusCode, 200, quoteRes.body);
  const { quote } = quoteRes.json();
  const authRes = await app.inject({ method: 'POST', url: '/api/payments/authorize', payload: { quoteId: quote.quoteId } });
  assert.equal(authRes.statusCode, 200, authRes.body);
  return { quote, ...authRes.json() };
}

function callbackPath(redirectUrl: string) {
  const u = new URL(redirectUrl);
  return u.pathname + u.search;
}

before(async () => {
  await backendCrypto.init();
  await openPaymentsService.init('simulator');
  app = await buildServer();
  // The merchant device pins only this, while online.
  const keyInfo = (await app.inject({ method: 'GET', url: '/api/receipt-key' })).json();
  assert.equal(keyInfo.alg, 'ES256');
  pinnedKey = await shared.importPinnedReceiptKey(keyInfo);
});

after(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Verifier context of a merchant device that created `sale`. */
function deviceCtx(sale: ReturnType<typeof newSale>, redeemed = new Set<string>()) {
  return {
    pinnedKey,
    deviceWallet: MERCHANT,
    getDeviceSale: (id: string) => (id === sale.saleId ? sale : null),
    isRedeemed: (r: { receiptId: string }) => redeemed.has(r.receiptId),
  };
}

async function paidSale() {
  const sale = newSale();
  const { redirectUrl } = await quoteAndAuthorize(sale);
  await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
  const { receipt } = (await app.inject({ method: 'GET', url: `/api/receipts/${sale.saleId}` })).json();
  return { sale, receipt };
}

test('full flow: quote -> authorize -> callback issues a receipt that verifies offline', async () => {
  const sale = newSale();
  const { quote, redirectUrl } = await quoteAndAuthorize(sale);

  assert.equal(quote.receiveAmount.value, '15.00');
  assert.equal(quote.receiveAmount.assetCode, 'USD');
  assert.equal(quote.debitAmount.assetCode, 'EUR');
  assert.ok(redirectUrl.startsWith('http://backend.test/api/payments/callback'));

  const cb = await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
  assert.equal(cb.statusCode, 302);
  const location = new URL(cb.headers.location as string);
  assert.equal(location.origin, 'http://frontend.test');
  assert.equal(location.searchParams.get('payment'), 'success');

  const { sale: stored, receipt } = (await app.inject({ method: 'GET', url: `/api/sales/${sale.saleId}` })).json();
  assert.equal(stored.status, 'PAYMENT_VERIFIED');
  assert.deepEqual(receipt.amountReceived, { value: '1500', assetCode: 'USD', assetScale: 2 });
  assert.equal(receipt.version, '2');
  assert.equal(receipt.mode, 'simulator');
  assert.equal(receipt.keyId, pinnedKey.keyId);
  assert.equal('payerWallet' in receipt || 'payerWalletAddress' in receipt, false);

  // Callback replay is harmless and does not issue a second receipt.
  await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
  const again = (await app.inject({ method: 'GET', url: `/api/receipts/${sale.saleId}` })).json();
  assert.equal(again.receipt.receiptId, receipt.receiptId);

  // A paid sale cannot be quoted again.
  const requote = await app.inject({ method: 'POST', url: '/api/payments/quote', payload: { sale, payerWalletAddress: PAYER_EUR } });
  assert.equal(requote.statusCode, 409);
});

test('interop: backend receipt -> QR -> shared parse -> verify with only the pinned public key', async () => {
  const { sale, receipt } = await paidSale();

  // IEEE P1363 (r||s) signature: exactly 64 bytes, what Web Crypto in the browser expects.
  assert.equal(shared.base64UrlToArrayBuffer(receipt.backendSignature).byteLength, 64);

  const scanned = shared.parseReceiptFromQr(shared.encodeReceiptToQr(receipt));
  assert.ok(scanned);
  const result = await shared.verifyReceiptOffline(scanned, deviceCtx(sale));
  assert.equal(result.valid, true);
  assert.equal(result.valid && result.kind, 'SIMULATED_PAYMENT');

  // Tampering any bound field breaks the signature.
  const tampered = [
    { ...receipt, amountReceived: { ...receipt.amountReceived, value: '150000' } },
    { ...receipt, saleId: `${receipt.saleId}-x` },
    { ...receipt, merchantWallet: 'https://ilp.interledger-test.dev/atacante' },
    { ...receipt, mode: 'live' },
  ];
  for (const forged of tampered) {
    const r = await shared.verifyReceiptOffline(forged, deviceCtx({ ...sale, saleId: forged.saleId }));
    assert.deepEqual([r.valid, !r.valid && r.error], [false, 'INVALID_SIGNATURE'], JSON.stringify(forged).slice(0, 80));
  }
});

test('/api/sync rejects forged receipts and accepts genuine ones', async () => {
  const { sale, receipt } = await paidSale();
  const forged = { ...receipt, amountReceived: { ...receipt.amountReceived, value: '150000' } };

  const sync = await app.inject({
    method: 'POST',
    url: '/api/sync',
    payload: [
      { saleId: sale.saleId, status: 'OFFLINE_VERIFIED', saleRequest: sale, verifiedReceipt: forged, syncedWithBackend: false },
      { saleId: sale.saleId, status: 'OFFLINE_VERIFIED', saleRequest: sale, verifiedReceipt: receipt, syncedWithBackend: false },
    ],
  });
  const body = sync.json();
  assert.equal(body.syncedCount, 1);
  assert.deepEqual(body.rejected, [{ saleId: sale.saleId, reason: 'INVALID_SIGNATURE' }]);

  const { sale: stored } = (await app.inject({ method: 'GET', url: `/api/sales/${sale.saleId}` })).json();
  assert.equal(stored.status, 'OFFLINE_VERIFIED');
});

test('buyer rejecting in the wallet -> payment=failed&reason=GRANT_REJECTED, sale stays payable', async () => {
  const sale = newSale();
  const { paymentId } = await quoteAndAuthorize(sale);

  const cb = await app.inject({ method: 'GET', url: `/api/payments/callback?paymentId=${paymentId}&result=grant_rejected` });
  const loc = new URL(cb.headers.location as string);
  assert.equal(loc.searchParams.get('payment'), 'failed');
  assert.equal(loc.searchParams.get('reason'), 'GRANT_REJECTED');
  assert.match(loc.searchParams.get('error') ?? '', /rechazó/);

  const status = (await app.inject({ method: 'GET', url: `/api/payments/${paymentId}` })).json();
  assert.equal(status.status, 'FAILED');
  const { sale: stored, receipt } = (await app.inject({ method: 'GET', url: `/api/sales/${sale.saleId}` })).json();
  assert.equal(stored.status, 'WAITING_PAYMENT');
  assert.equal(receipt, null);

  // The buyer can try again with a new quote.
  const { redirectUrl } = await quoteAndAuthorize(sale);
  const retry = await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
  assert.equal(new URL(retry.headers.location as string).searchParams.get('payment'), 'success');
});

test('callback without interact_ref -> payment=failed&reason=MISSING_INTERACT_REF', async () => {
  const sale = newSale();
  const { paymentId } = await quoteAndAuthorize(sale);
  const cb = await app.inject({ method: 'GET', url: `/api/payments/callback?paymentId=${paymentId}` });
  const loc = new URL(cb.headers.location as string);
  assert.equal(loc.searchParams.get('payment'), 'failed');
  assert.equal(loc.searchParams.get('reason'), 'MISSING_INTERACT_REF');
});

test('quote expiring within 60 s is re-quoted instead of authorized', async () => {
  class ShortQuoteOnce extends SimulatorGateway {
    private first = true;
    override async createQuote(payer: WalletInfo, incomingPaymentId: string) {
      const q = await super.createQuote(payer, incomingPaymentId);
      if (this.first) {
        this.first = false;
        return { ...q, expiresAt: new Date(Date.now() + 30_000).toISOString() };
      }
      return q;
    }
  }
  openPaymentsService.useGateway(new ShortQuoteOnce());
  try {
    const sale = newSale();
    const { quote } = (await app.inject({ method: 'POST', url: '/api/payments/quote', payload: { sale, payerWalletAddress: PAYER_EUR } })).json();

    const first = (await app.inject({ method: 'POST', url: '/api/payments/authorize', payload: { quoteId: quote.quoteId } })).json();
    assert.equal(first.requoted, true);
    assert.equal(first.redirectUrl, undefined);
    assert.notEqual(first.quote.quoteId, quote.quoteId);
    assert.equal(first.quote.receiveAmount.value, '15.00');
    assert.ok(first.quote.expiresAt - Date.now() > 60_000);

    const old = (await app.inject({ method: 'GET', url: `/api/payments/${quote.quoteId}` })).json();
    assert.equal(old.status, 'FAILED');
    assert.match(old.error, /^QUOTE_EXPIRED/);

    const second = (await app.inject({ method: 'POST', url: '/api/payments/authorize', payload: { quoteId: first.quote.quoteId } })).json();
    assert.equal(second.requoted, false);
    assert.ok(second.redirectUrl);
  } finally {
    openPaymentsService.useGateway(new SimulatorGateway());
  }
});

test('interaction hash: MATCH recorded; mismatch warns when STRICT_HASH=false and rejects when true', async () => {
  const { config } = await import('../src/config.js');

  // Correct hash from the (simulated) wallet.
  {
    const sale = newSale();
    const { paymentId, redirectUrl } = await quoteAndAuthorize(sale);
    await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
    assert.equal((await app.inject({ method: 'GET', url: `/api/payments/${paymentId}` })).json().hashCheck, 'MATCH');
  }

  const tamperedHash = (redirectUrl: string) => {
    const u = new URL(redirectUrl);
    u.searchParams.set('hash', 'AAAA');
    return u.pathname + u.search;
  };

  assert.equal(config.strictHash, false, 'STRICT_HASH must default to false');
  {
    const sale = newSale();
    const { paymentId, redirectUrl } = await quoteAndAuthorize(sale);
    const cb = await app.inject({ method: 'GET', url: tamperedHash(redirectUrl) });
    assert.equal(new URL(cb.headers.location as string).searchParams.get('payment'), 'success');
    assert.equal((await app.inject({ method: 'GET', url: `/api/payments/${paymentId}` })).json().hashCheck, 'MISMATCH');
  }

  config.strictHash = true;
  try {
    const sale = newSale();
    const { paymentId, redirectUrl } = await quoteAndAuthorize(sale);
    const cb = await app.inject({ method: 'GET', url: tamperedHash(redirectUrl) });
    const loc = new URL(cb.headers.location as string);
    assert.equal(loc.searchParams.get('payment'), 'failed');
    assert.equal(loc.searchParams.get('reason'), 'HASH_MISMATCH');
    const status = (await app.inject({ method: 'GET', url: `/api/payments/${paymentId}` })).json();
    assert.equal(status.hashCheck, 'MISMATCH');
    assert.equal(status.status, 'FAILED');
    assert.equal((await app.inject({ method: 'GET', url: `/api/receipts/${sale.saleId}` })).statusCode, 404);
  } finally {
    config.strictHash = false;
  }
});

test('golden rule: no receipt is signed when funds never arrive', async () => {
  class NoFundsGateway extends SimulatorGateway {
    override async continueGrantAndPay() {
      return { outgoingPaymentId: 'https://example.test/outgoing-payments/never-settles' };
    }
  }
  openPaymentsService.useGateway(new NoFundsGateway());
  try {
    const sale = newSale();
    const { redirectUrl } = await quoteAndAuthorize(sale);
    // Shorten the poll window for the test.
    const verify = openPaymentsService.verifyPayment.bind(openPaymentsService);
    openPaymentsService.verifyPayment = (id: string) => verify(id, 0);

    const cb = await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
    assert.equal(new URL(cb.headers.location as string).searchParams.get('payment'), 'pending');

    const v = (await app.inject({ method: 'POST', url: '/api/payments/verify', payload: { saleId: sale.saleId } })).json();
    assert.equal(v.status, 'PROCESSING');
    assert.equal(v.receivedAmount, '0.00');

    const { sale: stored, receipt } = (await app.inject({ method: 'GET', url: `/api/sales/${sale.saleId}` })).json();
    assert.equal(stored.status, 'PROCESSING');
    assert.equal(receipt, null);
  } finally {
    openPaymentsService.useGateway(new SimulatorGateway());
    delete (openPaymentsService as { verifyPayment?: unknown }).verifyPayment;
  }
});

test('health exposes the explicit mode', async () => {
  const health = (await app.inject({ method: 'GET', url: '/api/health' })).json();
  assert.equal(health.mode, 'simulator');
  assert.equal(health.modeLabel, 'SIMULATOR');
});

test('live mode without credentials refuses to initialize instead of falling back', async () => {
  const { OpenPaymentsService } = await import('../src/services/openPayments.js');
  const svc = new OpenPaymentsService();
  await assert.rejects(svc.init('live'), /OPEN_PAYMENTS_KEY_ID/);
  assert.throws(() => svc.mode, /no inicializado/);
});

test('rejects invalid sale payloads', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/sales', payload: newSale({ amount: '-5' }) });
  assert.equal(res.statusCode, 400);
  const expired = newSale({ expiresAt: Date.now() - 1000 });
  const q = await app.inject({ method: 'POST', url: '/api/payments/quote', payload: { sale: expired, payerWalletAddress: PAYER_EUR } });
  assert.equal(q.statusCode, 410);
});

test('receipt key: stable keyId, never overwritten, mandatory in live mode', async () => {
  const { generateKeyFile } = await import('../src/services/cryptoService.js');
  const { config } = await import('../src/config.js');
  const keysFile = path.join(tmpDir, 'other.relevo-backend-keys.json');

  const { keyId } = await generateKeyFile(keysFile);
  const before = fs.readFileSync(keysFile, 'utf-8');
  await assert.rejects(generateKeyFile(keysFile), /No se sobrescribe/);
  assert.equal(fs.readFileSync(keysFile, 'utf-8'), before);
  assert.equal(await shared.computeJwkThumbprint(JSON.parse(before).publicKeyJwk), keyId);

  const keyInfo = (await app.inject({ method: 'GET', url: '/api/config' })).json();
  assert.equal(await shared.computeJwkThumbprint(keyInfo.receiptKey.publicKeyJwk), backendCrypto.getKeyId());

  // A fresh service in live mode with no key file must refuse instead of generating one.
  const original = { opMode: config.opMode, keysFile: config.keysFile };
  config.opMode = 'live';
  config.keysFile = path.join(tmpDir, 'missing.relevo-backend-keys.json');
  try {
    const { backendCrypto: fresh } = await import(`../src/services/cryptoService.js?fresh=${Date.now()}`);
    await assert.rejects(fresh.init(), /keys:generate/);
    assert.equal(fs.existsSync(config.keysFile), false);
  } finally {
    Object.assign(config, original);
  }
});
