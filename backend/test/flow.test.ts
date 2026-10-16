import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

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
const { toMinorUnits, fromMinorUnits } = await import('../src/services/amounts.js');
const shared = await import('@relevo/shared');

type App = Awaited<ReturnType<typeof buildServer>>;
let app: App;
let publicKey: CryptoKey;

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
  const cfg = (await app.inject({ method: 'GET', url: '/api/config' })).json();
  publicKey = await shared.importPublicKeyFromJwk(cfg.backendPublicKeyJwk);
});

after(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('amount helpers convert between decimals and minor units exactly', () => {
  assert.equal(toMinorUnits('15.00', 2), 1500n);
  assert.equal(toMinorUnits('0.1', 2), 10n);
  assert.equal(toMinorUnits('7', 0), 7n);
  assert.throws(() => toMinorUnits('1.234', 2));
  assert.equal(fromMinorUnits(5n, 2), '0.05');
  assert.equal(fromMinorUnits('1550', 2), '15.50');
});

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
  assert.equal(receipt.amountReceived, '15.00');

  const result = await shared.verifyReceiptOffline(receipt, sale, publicKey, new Set());
  assert.equal(result.valid, true);

  // Callback replay is harmless and does not issue a second receipt.
  await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
  const again = (await app.inject({ method: 'GET', url: `/api/receipts/${sale.saleId}` })).json();
  assert.equal(again.receipt.receiptId, receipt.receiptId);

  // A paid sale cannot be quoted again.
  const requote = await app.inject({ method: 'POST', url: '/api/payments/quote', payload: { sale, payerWalletAddress: PAYER_EUR } });
  assert.equal(requote.statusCode, 409);
});

test('tampered receipts fail offline verification and are rejected by /api/sync', async () => {
  const sale = newSale();
  const { redirectUrl } = await quoteAndAuthorize(sale);
  await app.inject({ method: 'GET', url: callbackPath(redirectUrl) });
  const { receipt } = (await app.inject({ method: 'GET', url: `/api/receipts/${sale.saleId}` })).json();

  const forged = { ...receipt, amountReceived: '1500.00' };
  const offline = await shared.verifyReceiptOffline(forged, { ...sale, amount: '1500.00' }, publicKey);
  assert.equal(offline.valid, false);

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

test('payer rejecting the grant fails the attempt but keeps the sale payable', async () => {
  const sale = newSale();
  const { paymentId } = await quoteAndAuthorize(sale);

  const cb = await app.inject({ method: 'GET', url: `/api/payments/callback?paymentId=${paymentId}&result=grant_rejected` });
  assert.equal(new URL(cb.headers.location as string).searchParams.get('payment'), 'failed');

  const status = (await app.inject({ method: 'GET', url: `/api/payments/${paymentId}` })).json();
  assert.equal(status.status, 'FAILED');
  const { sale: stored, receipt } = (await app.inject({ method: 'GET', url: `/api/sales/${sale.saleId}` })).json();
  assert.equal(stored.status, 'WAITING_PAYMENT');
  assert.equal(receipt, null);
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
