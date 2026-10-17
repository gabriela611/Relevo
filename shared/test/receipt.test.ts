import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEcdsaKeyPair,
  exportKeyToJwk,
  computeJwkThumbprint,
  importPinnedReceiptKey,
  signReceipt,
  encodeReceiptToQr,
  parseReceiptFromQr,
  verifyReceiptOffline,
  base64UrlToArrayBuffer,
  RECEIPT_ERROR_MESSAGES,
  type PaymentSaleRequest,
  type VerifiedReceipt,
  type PinnedReceiptKey,
  type OfflineVerificationContext,
} from '../src/index.js';

const MERCHANT = 'https://ilp.interledger-test.dev/tienda';

let privateKey: CryptoKey;
let pinned: PinnedReceiptKey;
let otherPinned: PinnedReceiptKey;

const sale: PaymentSaleRequest = {
  version: '2',
  saleId: 'sale-1',
  merchantId: 'm',
  merchantName: 'Tienda',
  merchantWalletAddress: MERCHANT,
  amount: '15.00',
  currency: 'USD',
  assetScale: 2,
  createdAt: 0,
  expiresAt: Date.now() + 60_000,
  nonce: 'n',
  // The receipt verifier doesn't re-check the sale signature (the backend did on quote).
  merchantKeyId: 'k',
  merchantSignature: 's',
};

async function makePinned(): Promise<{ privateKey: CryptoKey; pinned: PinnedReceiptKey }> {
  const kp = await generateEcdsaKeyPair();
  const publicKeyJwk = await exportKeyToJwk(kp.publicKey);
  return { privateKey: kp.privateKey, pinned: await importPinnedReceiptKey({ keyId: await computeJwkThumbprint(publicKeyJwk), publicKeyJwk }) };
}

function issue(overrides: Partial<VerifiedReceipt> = {}, key = privateKey, keyId = pinned.keyId) {
  return signReceipt(
    {
      version: '2',
      receiptId: 'rcpt-1',
      saleId: 'sale-1',
      merchantWallet: MERCHANT,
      amountReceived: { value: '1500', assetCode: 'USD', assetScale: 2 },
      incomingPaymentId: `${MERCHANT}/incoming-payments/1`,
      outgoingPaymentId: 'https://ilp.interledger-test.dev/turista/outgoing-payments/1',
      issuedAt: 1_700_000_000_000,
      keyId,
      mode: 'live',
      ...overrides,
    },
    key
  );
}

function ctx(over: Partial<OfflineVerificationContext> = {}): OfflineVerificationContext {
  return {
    pinnedKey: pinned,
    deviceWallet: MERCHANT,
    getDeviceSale: (id) => (id === sale.saleId ? sale : null),
    isRedeemed: () => false,
    ...over,
  };
}

async function expectError(receipt: unknown, code: string, c = ctx()) {
  const r = await verifyReceiptOffline(receipt, c);
  assert.equal(r.valid, false, `expected ${code}`);
  assert.equal(!r.valid && r.error, code);
  return r;
}

before(async () => {
  ({ privateKey, pinned } = await makePinned());
  ({ pinned: otherPinned } = await makePinned());
});

test('valid live receipt survives QR round trip and verifies as LIVE_PAYMENT', async () => {
  const receipt = await issue();
  assert.equal(base64UrlToArrayBuffer(receipt.backendSignature).byteLength, 64);
  const scanned = parseReceiptFromQr(encodeReceiptToQr(receipt));
  const r = await verifyReceiptOffline(scanned, ctx());
  assert.equal(r.valid, true);
  assert.equal(r.valid && r.kind, 'LIVE_PAYMENT');
});

test('simulator receipt is valid but flagged SIMULATED_PAYMENT', async () => {
  const r = await verifyReceiptOffline(await issue({ mode: 'simulator' }), ctx());
  assert.equal(r.valid && r.kind, 'SIMULATED_PAYMENT');
  assert.match(r.valid ? r.message : '', /SIMULACIÓN/);
});

test('tampering any signed field -> INVALID_SIGNATURE', async () => {
  const receipt = await issue();
  const cases: Partial<VerifiedReceipt>[] = [
    { amountReceived: { value: '150000', assetCode: 'USD', assetScale: 2 } },
    { amountReceived: { value: '1500', assetCode: 'EUR', assetScale: 2 } },
    { amountReceived: { value: '1500', assetCode: 'USD', assetScale: 0 } },
    { saleId: 'sale-2' },
    { merchantWallet: 'https://ilp.interledger-test.dev/otro' },
    { mode: 'simulator' },
    { incomingPaymentId: 'x' },
    { issuedAt: 1 },
  ];
  for (const c of cases) {
    const forged = { ...receipt, ...c };
    const deviceSales = (id: string) => ({ ...sale, saleId: id });
    await expectError(forged, 'INVALID_SIGNATURE', ctx({ getDeviceSale: deviceSales }));
  }
});

test('attacker recomputing the digest still fails the signature', async () => {
  const receipt = await issue();
  const { computeSha256, getReceiptPayloadForSigning } = await import('../src/index.js');
  const forged = { ...receipt, amountReceived: { ...receipt.amountReceived, value: '999999' } };
  forged.payloadDigest = await computeSha256(getReceiptPayloadForSigning(forged));
  await expectError(forged, 'INVALID_SIGNATURE');
});

test('receipt signed by another key -> KEY_MISMATCH with the user-facing message', async () => {
  const r = await expectError(await issue(), 'KEY_MISMATCH', ctx({ pinnedKey: otherPinned }));
  assert.equal(r.message, 'Este comercio tiene una llave desactualizada. Conéctate a internet una vez para actualizarla.');
  assert.equal(RECEIPT_ERROR_MESSAGES.KEY_MISMATCH, r.message);
});

test('forged keyId claiming the pinned key but signed with another key -> INVALID_SIGNATURE', async () => {
  const attacker = await makePinned();
  await expectError(await issue({}, attacker.privateKey, pinned.keyId), 'INVALID_SIGNATURE');
});

test('binding checks: unknown sale, redeemed, other merchant, other asset, insufficient amount', async () => {
  await expectError(await issue({ saleId: 'sale-from-elsewhere' }), 'UNKNOWN_SALE');
  await expectError(await issue(), 'ALREADY_REDEEMED', ctx({ isRedeemed: (r) => r.receiptId === 'rcpt-1' }));
  await expectError(await issue({ merchantWallet: 'https://ilp.interledger-test.dev/otra-tienda' }), 'MERCHANT_MISMATCH');
  await expectError(await issue({ amountReceived: { value: '1500', assetCode: 'EUR', assetScale: 2 } }), 'ASSET_MISMATCH');
  await expectError(await issue({ amountReceived: { value: '1499', assetCode: 'USD', assetScale: 2 } }), 'AMOUNT_INSUFFICIENT');
});

test('amount check is exact across scales and wallet formats are normalized', async () => {
  const r = await verifyReceiptOffline(
    await issue({ amountReceived: { value: '15000', assetCode: 'USD', assetScale: 3 } }),
    ctx({ deviceWallet: '$ilp.interledger-test.dev/tienda/' })
  );
  assert.equal(r.valid, true);
});

test('garbage and v1 receipts -> INVALID_FORMAT / unparseable', async () => {
  assert.equal(parseReceiptFromQr('hola'), null);
  assert.equal(parseReceiptFromQr('relevo:receipt:v1:e30'), null);
  await expectError({ version: '1', receiptId: 'x' }, 'INVALID_FORMAT');
  await expectError(null, 'INVALID_FORMAT');
});

test('importPinnedReceiptKey rejects a keyId that is not the key thumbprint', async () => {
  const kp = await generateEcdsaKeyPair();
  const publicKeyJwk = await exportKeyToJwk(kp.publicKey);
  await assert.rejects(importPinnedReceiptKey({ keyId: pinned.keyId, publicKeyJwk }));
});
