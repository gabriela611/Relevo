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

const MERCHANT_WALLET = 'https://ilp.interledger-test.dev/dona-elena';
const BUYER_WALLET = 'https://ilp.interledger-test.dev/alex-turista';

let privateKey: CryptoKey;
let pinnedKey: PinnedReceiptKey;
let rogueKey: CryptoKey;
let roguePinnedKey: PinnedReceiptKey;

const baseSale: PaymentSaleRequest = {
  version: '2',
  saleId: 'sale-security-101',
  merchantId: 'merchant-dona-elena',
  merchantName: 'Doña Elena - Arepas',
  merchantWalletAddress: MERCHANT_WALLET,
  amount: '15.00',
  currency: 'USD',
  assetScale: 2,
  createdAt: 1_700_000_000_000,
  expiresAt: 1_700_000_900_000, // +15 min
  nonce: 'secure-random-nonce-xyz',
  merchantKeyId: 'k',
  merchantSignature: 's',
};

async function createPinnedKeypair(): Promise<{ privateKey: CryptoKey; pinned: PinnedReceiptKey }> {
  const kp = await generateEcdsaKeyPair();
  const jwk = await exportKeyToJwk(kp.publicKey);
  const keyId = await computeJwkThumbprint(jwk);
  const pinned = await importPinnedReceiptKey({ keyId, publicKeyJwk: jwk });
  return { privateKey: kp.privateKey, pinned };
}

function buildValidReceipt(overrides: Partial<VerifiedReceipt> = {}, key = privateKey, keyId = pinnedKey.keyId) {
  return signReceipt(
    {
      version: '2',
      receiptId: 'rcpt-legit-001',
      saleId: baseSale.saleId,
      merchantWallet: MERCHANT_WALLET,
      amountReceived: { value: '1500', assetCode: 'USD', assetScale: 2 },
      incomingPaymentId: `${MERCHANT_WALLET}/incoming-payments/ip-101`,
      outgoingPaymentId: `${BUYER_WALLET}/outgoing-payments/op-202`,
      issuedAt: 1_700_000_050_000,
      keyId,
      mode: 'live',
      ...overrides,
    },
    key
  );
}

function getVerificationContext(overrides: Partial<OfflineVerificationContext> = {}): OfflineVerificationContext {
  const redeemedSet = new Set<string>();
  return {
    pinnedKey,
    deviceWallet: MERCHANT_WALLET,
    getDeviceSale: (id) => (id === baseSale.saleId ? baseSale : null),
    isRedeemed: (r) => redeemedSet.has(r.receiptId),
    ...overrides,
  };
}

before(async () => {
  ({ privateKey, pinned: pinnedKey } = await createPinnedKeypair());
  ({ privateKey: rogueKey, pinned: roguePinnedKey } = await createPinnedKeypair());
});

test('ANTI-FRAUD: 1-cent tampering attack is detected and rejected', async () => {
  const validReceipt = await buildValidReceipt();

  // Attacker intercepts receipt and modifies 15.00 -> 15.01 (or 14.99)
  const tamperedPlusCent: VerifiedReceipt = {
    ...validReceipt,
    amountReceived: { ...validReceipt.amountReceived, value: '1501' },
  };

  const resultPlus = await verifyReceiptOffline(tamperedPlusCent, getVerificationContext());
  assert.equal(resultPlus.valid, false);
  assert.equal(!resultPlus.valid && resultPlus.error, 'INVALID_SIGNATURE');

  const tamperedMinusCent: VerifiedReceipt = {
    ...validReceipt,
    amountReceived: { ...validReceipt.amountReceived, value: '1499' },
  };

  const resultMinus = await verifyReceiptOffline(tamperedMinusCent, getVerificationContext());
  assert.equal(resultMinus.valid, false);
  assert.equal(!resultMinus.valid && resultMinus.error, 'INVALID_SIGNATURE');
});

test('ANTI-FRAUD: Currency substitution attack (paying 1500 COP or EUR for 15.00 USD)', async () => {
  const validReceipt = await buildValidReceipt();

  const swappedCurrency: VerifiedReceipt = {
    ...validReceipt,
    amountReceived: { ...validReceipt.amountReceived, assetCode: 'COP' },
  };

  const res = await verifyReceiptOffline(swappedCurrency, getVerificationContext());
  assert.equal(res.valid, false);
  assert.equal(!res.valid && res.error, 'INVALID_SIGNATURE');
});

test('ANTI-FRAUD: Asset scale trick (scale: 4 instead of scale: 2 to pay 100x less)', async () => {
  const validReceipt = await buildValidReceipt();

  const scaleTrick: VerifiedReceipt = {
    ...validReceipt,
    amountReceived: { ...validReceipt.amountReceived, assetScale: 4 },
  };

  const res = await verifyReceiptOffline(scaleTrick, getVerificationContext());
  assert.equal(res.valid, false);
  assert.equal(!res.valid && res.error, 'INVALID_SIGNATURE');
});

test('ANTI-FRAUD: Replay attack (double spend) is blocked by isRedeemed registry', async () => {
  const validReceipt = await buildValidReceipt();
  const redeemedIds = new Set<string>();

  const ctx: OfflineVerificationContext = {
    pinnedKey,
    deviceWallet: MERCHANT_WALLET,
    getDeviceSale: (id) => (id === baseSale.saleId ? baseSale : null),
    isRedeemed: (r) => redeemedIds.has(r.receiptId),
  };

  // First presentation: valid
  const firstScan = await verifyReceiptOffline(validReceipt, ctx);
  assert.equal(firstScan.valid, true);

  // Merchant marks receipt as redeemed locally
  redeemedIds.add(validReceipt.receiptId);

  // Second presentation (attacker tries to re-use identical receipt): BLOCKED
  const secondScan = await verifyReceiptOffline(validReceipt, ctx);
  assert.equal(secondScan.valid, false);
  assert.equal(!secondScan.valid && secondScan.error, 'ALREADY_REDEEMED');
  assert.equal(!secondScan.valid && secondScan.message, RECEIPT_ERROR_MESSAGES.ALREADY_REDEEMED);
});

test('ANTI-FRAUD: Cross-sale attack (valid receipt from sale B presented for sale A)', async () => {
  // Attacker got a valid receipt for sale B, tries to fulfill sale A
  const receiptForSaleB = await buildValidReceipt({ saleId: 'sale-security-999' });

  const ctx = getVerificationContext();
  const res = await verifyReceiptOffline(receiptForSaleB, ctx);

  assert.equal(res.valid, false);
  assert.equal(!res.valid && res.error, 'UNKNOWN_SALE');
  assert.equal(!res.valid && res.message, RECEIPT_ERROR_MESSAGES.UNKNOWN_SALE);
});

test('ANTI-FRAUD: Cross-merchant attack (receipt paid to merchant B presented to Doña Elena)', async () => {
  // Attacker signed a receipt to another wallet
  const receiptForOtherMerchant = await buildValidReceipt({
    merchantWallet: 'https://ilp.interledger-test.dev/tienda-don-carlos',
  });

  // Even if signature verified against an identical sale ID, device checks wallet address
  const deviceSales = (id: string): PaymentSaleRequest => ({
    ...baseSale,
    saleId: id,
    merchantWalletAddress: 'https://ilp.interledger-test.dev/tienda-don-carlos',
  });

  const ctx = getVerificationContext({
    deviceWallet: MERCHANT_WALLET, // Doña Elena's device
    getDeviceSale: deviceSales,
  });

  const res = await verifyReceiptOffline(receiptForOtherMerchant, ctx);
  assert.equal(res.valid, false);
  assert.equal(!res.valid && res.error, 'MERCHANT_MISMATCH');
});

test('ANTI-FRAUD: Rogue server attack (signed by unauthorized key claiming pinned keyId)', async () => {
  // Attacker signs payload with their own private key, but sets keyId = pinnedKey.keyId
  const forged = await buildValidReceipt({}, rogueKey, pinnedKey.keyId);

  const res = await verifyReceiptOffline(forged, getVerificationContext());
  assert.equal(res.valid, false);
  assert.equal(!res.valid && res.error, 'INVALID_SIGNATURE');
});

test('ANTI-FRAUD: Outdated or rotated key attack (signed with old/different key)', async () => {
  // Receipt signed with rogueKey and sets keyId = roguePinnedKey.keyId
  const legitSignedByRogue = await buildValidReceipt({}, rogueKey, roguePinnedKey.keyId);

  const res = await verifyReceiptOffline(legitSignedByRogue, getVerificationContext({ pinnedKey }));
  assert.equal(res.valid, false);
  assert.equal(!res.valid && res.error, 'KEY_MISMATCH');
  assert.equal(
    !res.valid && res.message,
    RECEIPT_ERROR_MESSAGES.KEY_MISMATCH
  );
});

test('ANTI-FRAUD: QR payload injection and malformed string robustness', async () => {
  const invalidQRs = [
    '',
    '   ',
    'relevo:sale:v1:{}', // sale QR passed to receipt parser
    'relevo:receipt:v2:',
    'relevo:receipt:v2:not-valid-base64-json!@#$%',
    'relevo:receipt:v3:eyJhbGciOiJSUzI1NiJ9', // unknown version
    'https://malicious-phishing-site.com/fake-receipt',
    JSON.stringify({ malicious: true }),
  ];

  for (const qr of invalidQRs) {
    const parsed = parseReceiptFromQr(qr);
    assert.equal(parsed, null, `QR should fail parse: "${qr}"`);
  }
});

test('ANTI-FRAUD: Truncated signature detection', async () => {
  const validReceipt = await buildValidReceipt();
  // Cut signature bytes in half
  const truncatedSig = validReceipt.backendSignature.slice(0, 30);
  const corruptedReceipt = { ...validReceipt, backendSignature: truncatedSig };

  const res = await verifyReceiptOffline(corruptedReceipt, getVerificationContext());
  assert.equal(res.valid, false);
  assert.equal(!res.valid && res.error, 'INVALID_SIGNATURE');
});
