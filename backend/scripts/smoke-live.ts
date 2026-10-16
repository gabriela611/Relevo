/**
 * Live end-to-end smoke test against the Interledger Test Wallet, no frontend needed:
 *   npm run smoke:live --workspace=backend
 *
 * sale -> incoming payment (merchant) -> quote (buyer) -> interactive grant
 * -> local callback -> outgoing payment -> verify received amount
 * -> signed receipt -> verify it offline with @relevo/shared.
 *
 * Reads SMOKE_MERCHANT_WALLET, SMOKE_BUYER_WALLET (and the usual OPEN_PAYMENTS_*)
 * from backend/.env. Prints ids, statuses and formatted amounts only: never
 * tokens, nonces or keys.
 */

// Must be set before any backend module loads config (dotenv never overrides these).
const PORT = Number(process.env.SMOKE_PORT || 3457);
const BASE = `http://localhost:${PORT}`;
process.env.OP_MODE = 'live';
process.env.DB_PATH = ':memory:';
process.env.PUBLIC_BACKEND_URL = BASE;
process.env.PUBLIC_FRONTEND_URL = `${BASE}/smoke-done`;

const { config, MODE_LABEL } = await import('../src/config.js');
const { buildServer } = await import('../src/app.js');
const { backendCrypto } = await import('../src/services/cryptoService.js');
const { openPaymentsService } = await import('../src/services/openPayments.js');
const shared = await import('@relevo/shared');

const CONSENT_TIMEOUT_MS = 5 * 60 * 1000;

const log = (msg = '') => console.log(msg);
const fail = (msg: string): never => {
  console.error(`\n❌ FAIL: ${msg}`);
  process.exit(1);
};

const merchantWallet = process.env.SMOKE_MERCHANT_WALLET;
const buyerWallet = process.env.SMOKE_BUYER_WALLET;
if (!merchantWallet || !buyerWallet) {
  fail('Define SMOKE_MERCHANT_WALLET y SMOKE_BUYER_WALLET en backend/.env.');
}

async function api<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) fail(`${method} ${path} -> HTTP ${res.status}: ${json?.error ?? res.statusText}`);
  return json as T;
}

const fmt = (a: { value: string; assetCode: string }) => `${a.value} ${a.assetCode}`;

// ---------------------------------------------------------------------------
log('RELEVO · live smoke test');
try {
  await backendCrypto.init();
  await openPaymentsService.init('live');
} catch (err: any) {
  fail(err?.message || String(err));
}
log(`mode: ${MODE_LABEL[openPaymentsService.mode]}`);
log(`receipt keyId: ${backendCrypto.getKeyId()}`);
log(`STRICT_HASH: ${config.strictHash}`);

const app = await buildServer();
let resolveDone: (q: Record<string, string>) => void;
const done = new Promise<Record<string, string>>((r) => (resolveDone = r));
app.get('/smoke-done', async (req, reply) => {
  resolveDone(req.query as Record<string, string>);
  return reply.type('text/html').send('<h2>RELEVO smoke test: listo. Vuelve a la terminal.</h2>');
});
await app.listen({ port: PORT, host: '127.0.0.1' });

let exitCode = 1;
try {
  // 1. Wallets
  const { wallet: merchant } = await api('POST', '/api/wallet/resolve', { walletAddress: merchantWallet });
  const { wallet: buyer } = await api('POST', '/api/wallet/resolve', { walletAddress: buyerWallet });
  log(`\n[1] merchant: ${merchant.id} (${merchant.assetCode}, scale ${merchant.assetScale})`);
  log(`    buyer:    ${buyer.id} (${buyer.assetCode}, scale ${buyer.assetScale})`);

  // 2. Sale
  const amount = process.env.SMOKE_AMOUNT || '1.00';
  const sale = {
    version: '1' as const,
    saleId: `smoke-${crypto.randomUUID()}`,
    merchantId: 'smoke',
    merchantName: 'RELEVO smoke test',
    merchantWalletAddress: merchant.id,
    amount,
    currency: merchant.assetCode,
    assetScale: merchant.assetScale,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
    nonce: crypto.randomUUID(),
  };
  await api('POST', '/api/sales', sale);
  log(`[2] sale: ${sale.saleId} · ${amount} ${sale.currency}`);

  // 3. Incoming payment + quote
  let { quote } = await api('POST', '/api/payments/quote', { sale, payerWalletAddress: buyer.id });
  const showQuote = (q: any) =>
    log(`    quote ${q.quoteId}: buyer pays ${fmt(q.debitAmount)} -> merchant receives ${fmt(q.receiveAmount)} (expires ${new Date(q.expiresAt).toISOString()})`);
  log('[3] incoming payment + quote created');
  showQuote(quote);

  // 4. Interactive grant (re-quote if it was about to expire)
  let auth = await api('POST', '/api/payments/authorize', { quoteId: quote.quoteId });
  while (auth.requoted) {
    log('    quote was about to expire -> re-quoted:');
    quote = auth.quote;
    showQuote(quote);
    auth = await api('POST', '/api/payments/authorize', { quoteId: quote.quoteId });
  }
  log(`[4] consent required (payment ${auth.paymentId}).`);
  log('    Open this URL in a browser ON THIS MACHINE, log in as the BUYER and approve:');
  log(`\n    ${auth.redirectUrl}\n`);
  log(`    waiting up to ${CONSENT_TIMEOUT_MS / 60000} min for the wallet to redirect back...`);

  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout esperando la aprobación')), CONSENT_TIMEOUT_MS));
  const cb = await Promise.race([done, timeout]);
  log(`[5] callback: payment=${cb.payment}${cb.reason ? ` reason=${cb.reason}` : ''}`);

  const status = await api('GET', `/api/payments/${auth.paymentId}`);
  log(`    hash: ${status.hashCheck === 'MATCH' ? 'MATCH' : `MISMATCH${status.hashCheck === 'ABSENT' ? ' (no hash in callback)' : ''}`}`);
  if (cb.payment === 'failed') fail(`pago fallido: ${cb.reason} · ${cb.error ?? status.error ?? ''}`);

  // 6. Verify funds (poll if settlement is still in flight)
  let receipt: any = null;
  for (let i = 0; i < 12 && !receipt; i++) {
    const v = await api('POST', '/api/payments/verify', { saleId: sale.saleId });
    if (v.status === 'PAYMENT_VERIFIED') receipt = v.receipt;
    else log(`    funds in flight: received ${v.receivedAmount} / expected ${v.expectedAmount}...`);
  }
  if (!receipt) fail('los fondos no llegaron al incoming payment del comercio.');
  const final = await api('GET', `/api/payments/${auth.paymentId}`);
  log(`[6] attempt status: ${final.status}`);
  log(`    incoming payment: ${receipt.incomingPaymentId}`);
  log(`    outgoing payment: ${receipt.outgoingPaymentId}`);

  // 7. Receipt -> QR -> offline verification with only the pinned public key
  log(`[7] receipt ${receipt.receiptId}: ${shared.formatAmount(receipt.amountReceived)} · mode ${receipt.mode} · keyId ${receipt.keyId}`);
  const keyInfo = await api('GET', '/api/receipt-key');
  const pinnedKey = await shared.importPinnedReceiptKey(keyInfo);
  const scanned = shared.parseReceiptFromQr(shared.encodeReceiptToQr(receipt));
  const ctx = {
    pinnedKey,
    deviceWallet: merchant.id,
    getDeviceSale: (id: string) => (id === sale.saleId ? sale : null),
    isRedeemed: () => false,
  };
  const result = await shared.verifyReceiptOffline(scanned, ctx);
  if (!result.valid) throw new Error(`verificación offline: ${result.error} · ${result.message}`);
  if (result.kind !== 'LIVE_PAYMENT') throw new Error(`se esperaba LIVE_PAYMENT y se obtuvo ${result.kind}`);
  log(`    offline verification: VALID (${result.kind})`);

  const forged = { ...receipt, amountReceived: { ...receipt.amountReceived, value: String(BigInt(receipt.amountReceived.value) * 100n) } };
  const tampered = await shared.verifyReceiptOffline(forged, ctx);
  if (tampered.valid) throw new Error('un recibo alterado pasó la verificación');
  log(`    tamper check (amount x100): ${tampered.error}`);

  log('\n✅ RESULT: PASS');
  exitCode = 0;
} catch (err: any) {
  console.error(`\n❌ FAIL: ${err?.message || err}`);
} finally {
  await app.close();
  process.exit(exitCode);
}
