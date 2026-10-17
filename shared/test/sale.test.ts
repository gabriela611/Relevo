import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateMerchantKeyPair,
  signSale,
  verifySale,
  sameSaleContent,
  encodeSaleToQr,
  parseSaleFromQr,
  base64UrlToArrayBuffer,
  type UnsignedSale,
} from '../src/index.js';

let merchant: Awaited<ReturnType<typeof generateMerchantKeyPair>>;
let other: Awaited<ReturnType<typeof generateMerchantKeyPair>>;

const unsigned: UnsignedSale = {
  version: '2',
  saleId: 'sale-1',
  merchantId: 'm1',
  merchantName: 'Doña Elena',
  merchantWalletAddress: 'https://ilp.interledger-test.dev/tienda',
  amount: '15.00',
  currency: 'USD',
  assetScale: 2,
  createdAt: 1_700_000_000_000,
  expiresAt: 1_700_000_900_000,
  nonce: 'n-1',
};

before(async () => {
  merchant = await generateMerchantKeyPair();
  other = await generateMerchantKeyPair();
});

test('merchant private key is non-extractable; public key and keyId are exportable', async () => {
  assert.equal(merchant.keyPair.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('jwk', merchant.keyPair.privateKey));
  assert.equal(merchant.publicKeyJwk.d, undefined);
  assert.match(merchant.keyId, /^[A-Za-z0-9_-]{43}$/);
});

test('signed sale survives the QR round trip and verifies', async () => {
  const sale = await signSale(unsigned, merchant.keyPair.privateKey, merchant.keyId);
  assert.equal(sale.merchantKeyId, merchant.keyId);
  assert.equal(base64UrlToArrayBuffer(sale.merchantSignature).byteLength, 64);
  const scanned = parseSaleFromQr(encodeSaleToQr(sale));
  assert.ok(scanned);
  assert.equal(await verifySale(scanned, merchant.keyPair.publicKey), true);
});

test('tampering merchant wallet, amount, currency, scale, expiry or keyId breaks the signature', async () => {
  const sale = await signSale(unsigned, merchant.keyPair.privateKey, merchant.keyId);
  const tampered = [
    { merchantWalletAddress: 'https://ilp.interledger-test.dev/atacante' },
    { amount: '1.50' },
    { currency: 'EUR' },
    { assetScale: 0 },
    { expiresAt: unsigned.expiresAt + 3_600_000 },
    { merchantKeyId: other.keyId },
  ];
  for (const t of tampered) {
    assert.equal(await verifySale({ ...sale, ...t }, merchant.keyPair.publicKey), false, JSON.stringify(t));
  }
});

test('a sale signed by another key does not verify', async () => {
  const forged = await signSale(unsigned, other.keyPair.privateKey, merchant.keyId);
  assert.equal(await verifySale(forged, merchant.keyPair.publicKey), false);
});

test('unsigned, v1 and garbage sale QRs are rejected', async () => {
  assert.equal(parseSaleFromQr('relevo:sale:v1:e30'), null);
  assert.equal(parseSaleFromQr('{"saleId":"x","amount":"1"}'), null);
  assert.equal(parseSaleFromQr('hola'), null);
  assert.equal(await verifySale({ ...unsigned }, merchant.keyPair.publicKey), false);
});

test('sameSaleContent ignores the (randomized) signature but not the content', async () => {
  const a = await signSale(unsigned, merchant.keyPair.privateKey, merchant.keyId);
  const b = await signSale(unsigned, merchant.keyPair.privateKey, merchant.keyId);
  assert.notEqual(a.merchantSignature, b.merchantSignature);
  assert.equal(sameSaleContent(a, b), true);
  assert.equal(sameSaleContent(a, { ...b, amount: '16.00' }), false);
});
