/**
 * QR Code Serialization, Parsing & Offline Verification for RELEVO
 */

import {
  PaymentSaleRequest,
  UnsignedSale,
  VerifiedReceipt,
  UnsignedReceipt,
  ReceiptKeyInfo,
  ReceiptValidationResult,
} from './types.js';
import {
  canonicalJson,
  computeSha256,
  computeJwkThumbprint,
  exportKeyToJwk,
  importPublicKeyFromJwk,
  signData,
  verifySignature,
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
} from './crypto.js';
import { formatAmount, isAtLeast, toMinorUnits } from './amounts.js';

const RECEIPT_QR_PREFIX = 'relevo:receipt:v2:';

/**
 * Format string payload to string using Base64URL
 */
function toBase64UrlString(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return arrayBufferToBase64Url(bytes);
}

function fromBase64UrlString(b64: string): string {
  const bytes = base64UrlToArrayBuffer(b64);
  return new TextDecoder().decode(bytes);
}

const SALE_QR_PREFIX = 'relevo:sale:v2:';

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Generates the merchant device key: ECDSA P-256, private key NON-extractable
 * (it can sign but can never be exported, even by our own code). Store the
 * CryptoKeyPair in IndexedDB as is; register the public key while online.
 */
export async function generateMerchantKeyPair(): Promise<{ keyPair: CryptoKeyPair; publicKeyJwk: JsonWebKey; keyId: string }> {
  const keyPair = (await getSubtleForSales().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])) as CryptoKeyPair;
  const publicKeyJwk = await exportKeyToJwk(keyPair.publicKey);
  return { keyPair, publicKeyJwk, keyId: await computeJwkThumbprint(publicKeyJwk) };
}

function getSubtleForSales(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.');
  return globalThis.crypto.subtle;
}

/** Canonical content covered by the merchant signature (explicit field list). */
export function getSalePayloadForSigning(sale: UnsignedSale & { merchantKeyId: string }): string {
  return canonicalJson({
    version: sale.version,
    saleId: sale.saleId,
    merchantId: sale.merchantId,
    merchantName: sale.merchantName,
    merchantWalletAddress: sale.merchantWalletAddress,
    amount: sale.amount,
    currency: sale.currency,
    assetScale: sale.assetScale,
    createdAt: sale.createdAt,
    expiresAt: sale.expiresAt,
    nonce: sale.nonce,
    merchantKeyId: sale.merchantKeyId,
  });
}

/** Signs a sale on the merchant device with its (non-extractable) private key. */
export async function signSale(unsigned: UnsignedSale, privateKey: CryptoKey, merchantKeyId: string): Promise<PaymentSaleRequest> {
  const withKey = { ...unsigned, merchantKeyId };
  const digest = await computeSha256(getSalePayloadForSigning(withKey));
  return { ...withKey, merchantSignature: await signData(digest, privateKey) };
}

/** Structural validation of an untrusted object claiming to be a signed v2 sale. */
export function isSaleV2(value: unknown): value is PaymentSaleRequest {
  const s = value as Partial<PaymentSaleRequest> | null;
  return (
    !!s &&
    typeof s === 'object' &&
    s.version === '2' &&
    isStr(s.saleId) &&
    typeof s.merchantId === 'string' &&
    typeof s.merchantName === 'string' &&
    isStr(s.merchantWalletAddress) &&
    isStr(s.amount) &&
    isStr(s.currency) &&
    Number.isInteger(s.assetScale) &&
    Number.isFinite(s.createdAt) &&
    Number.isFinite(s.expiresAt) &&
    isStr(s.nonce) &&
    isStr(s.merchantKeyId) &&
    isStr(s.merchantSignature)
  );
}

/** True only if the sale is a well-formed v2 sale signed by `publicKey`. */
export async function verifySale(sale: unknown, publicKey: CryptoKey): Promise<boolean> {
  if (!isSaleV2(sale)) return false;
  const digest = await computeSha256(getSalePayloadForSigning(sale));
  return verifySignature(digest, sale.merchantSignature, publicKey);
}

/** Same signed content? (ECDSA signatures are randomized, so compare the payload, not the signature.) */
export function sameSaleContent(a: PaymentSaleRequest, b: PaymentSaleRequest): boolean {
  return getSalePayloadForSigning(a) === getSalePayloadForSigning(b);
}

/**
 * Encode a signed sale into a compact QR payload
 */
export function encodeSaleToQr(sale: PaymentSaleRequest): string {
  return `${SALE_QR_PREFIX}${toBase64UrlString(JSON.stringify(sale))}`;
}

/**
 * Parse a sale QR (structure only; the backend verifies the signature on quote)
 */
export function parseSaleFromQr(qrContent: string): PaymentSaleRequest | null {
  try {
    const trimmed = qrContent.trim();
    if (!trimmed.startsWith(SALE_QR_PREFIX)) return null;
    const parsed: unknown = JSON.parse(fromBase64UrlString(trimmed.substring(SALE_QR_PREFIX.length)));
    return isSaleV2(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Normalizes "$ilp.example/alice", "ilp.example/alice/" etc. to "https://ilp.example/alice". */
export function normalizeWalletAddress(walletAddress: string): string {
  let w = walletAddress.trim();
  if (w.startsWith('$')) w = 'https://' + w.substring(1);
  else if (!/^https?:\/\//i.test(w)) w = 'https://' + w;
  return w.replace(/\/+$/, '');
}

export function sameWalletAddress(a: string, b: string): boolean {
  return normalizeWalletAddress(a).toLowerCase() === normalizeWalletAddress(b).toLowerCase();
}

/**
 * Canonical content covered by the signature. Fields are listed explicitly so
 * anything extra injected into a QR is ignored rather than trusted.
 */
export function getReceiptPayloadForSigning(receipt: UnsignedReceipt): string {
  return canonicalJson({
    version: receipt.version,
    receiptId: receipt.receiptId,
    saleId: receipt.saleId,
    merchantWallet: receipt.merchantWallet,
    amountReceived: {
      value: receipt.amountReceived.value,
      assetCode: receipt.amountReceived.assetCode,
      assetScale: receipt.amountReceived.assetScale,
    },
    incomingPaymentId: receipt.incomingPaymentId,
    outgoingPaymentId: receipt.outgoingPaymentId,
    issuedAt: receipt.issuedAt,
    keyId: receipt.keyId,
    mode: receipt.mode,
  });
}

/** Signs a receipt (backend side). Same Web Crypto code path the browser verifies with. */
export async function signReceipt(unsigned: UnsignedReceipt, privateKey: CryptoKey): Promise<VerifiedReceipt> {
  const payloadDigest = await computeSha256(getReceiptPayloadForSigning(unsigned));
  const backendSignature = await signData(payloadDigest, privateKey);
  return { ...unsigned, payloadDigest, backendSignature };
}

/** Structural validation of an untrusted object claiming to be a v2 receipt. */
export function isReceiptV2(value: unknown): value is VerifiedReceipt {
  const r = value as Partial<VerifiedReceipt> | null;
  if (!r || typeof r !== 'object' || r.version !== '2') return false;
  const a = r.amountReceived;
  return (
    isStr(r.receiptId) &&
    isStr(r.saleId) &&
    isStr(r.merchantWallet) &&
    !!a &&
    typeof a.value === 'string' &&
    /^\d+$/.test(a.value) &&
    isStr(a.assetCode) &&
    Number.isInteger(a.assetScale) &&
    a.assetScale >= 0 &&
    isStr(r.incomingPaymentId) &&
    isStr(r.outgoingPaymentId) &&
    Number.isFinite(r.issuedAt) &&
    isStr(r.keyId) &&
    (r.mode === 'live' || r.mode === 'simulator') &&
    isStr(r.payloadDigest) &&
    isStr(r.backendSignature)
  );
}

/**
 * Encode a VerifiedReceipt into a compact QR payload
 */
export function encodeReceiptToQr(receipt: VerifiedReceipt): string {
  return `${RECEIPT_QR_PREFIX}${toBase64UrlString(JSON.stringify(receipt))}`;
}

/**
 * Parse a QR code string into a VerifiedReceipt (structure only; call verifyReceiptOffline next)
 */
export function parseReceiptFromQr(qrContent: string): VerifiedReceipt | null {
  try {
    const trimmed = qrContent.trim();
    let json: string | null = null;
    if (trimmed.startsWith(RECEIPT_QR_PREFIX)) json = fromBase64UrlString(trimmed.substring(RECEIPT_QR_PREFIX.length));
    else if (trimmed.startsWith('{') && trimmed.endsWith('}')) json = trimmed;
    if (!json) return null;
    const parsed: unknown = JSON.parse(json);
    return isReceiptV2(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** A receipt key pinned on the device, ready for verification. */
export interface PinnedReceiptKey {
  keyId: string;
  publicKey: CryptoKey;
}

/**
 * Imports the key fetched from GET /api/receipt-key (while online) and checks
 * that its keyId really is the thumbprint of the JWK, so a corrupted or swapped
 * pin is detected before it is stored.
 */
export async function importPinnedReceiptKey(info: Pick<ReceiptKeyInfo, 'keyId' | 'publicKeyJwk'>): Promise<PinnedReceiptKey> {
  const thumbprint = await computeJwkThumbprint(info.publicKeyJwk);
  if (thumbprint !== info.keyId) {
    throw new Error('El keyId no corresponde a la llave pública recibida.');
  }
  return { keyId: info.keyId, publicKey: await importPublicKeyFromJwk(info.publicKeyJwk) };
}

export interface OfflineVerificationContext {
  /** Backend key pinned while online. */
  pinnedKey: PinnedReceiptKey;
  /** This device's own merchant wallet address. */
  deviceWallet: string;
  /** Sales created on THIS device (IndexedDB). Unknown sale ids must return null. */
  getDeviceSale: (saleId: string) => PaymentSaleRequest | null | undefined | Promise<PaymentSaleRequest | null | undefined>;
  /** True if this receipt (or its sale) was already redeemed on this device (IndexedDB). */
  isRedeemed: (receipt: VerifiedReceipt) => boolean | Promise<boolean>;
}

export const RECEIPT_ERROR_MESSAGES = {
  INVALID_FORMAT: 'El código escaneado no es un comprobante RELEVO válido.',
  KEY_MISMATCH: 'Este comercio tiene una llave desactualizada. Conéctate a internet una vez para actualizarla.',
  INVALID_SIGNATURE: 'Comprobante falso o alterado: la firma no es válida.',
  UNKNOWN_SALE: 'Este comprobante es de una venta que no se creó en este dispositivo.',
  ALREADY_REDEEMED: 'Este comprobante ya fue usado.',
  MERCHANT_MISMATCH: 'Este comprobante es de un pago a otro comercio.',
  ASSET_MISMATCH: 'El comprobante está en otra moneda distinta a la de la venta.',
  AMOUNT_INSUFFICIENT: 'El monto recibido es menor al de la venta.',
} as const;

const fail = (error: keyof typeof RECEIPT_ERROR_MESSAGES, detail?: string): ReceiptValidationResult => ({
  valid: false,
  error,
  message: detail ? `${RECEIPT_ERROR_MESSAGES[error]} ${detail}` : RECEIPT_ERROR_MESSAGES[error],
});

/**
 * Verifies a receipt completely offline on the merchant device. Checks run in
 * this order and the first failure is returned:
 *  1. INVALID_FORMAT      structure of a v2 receipt
 *  2. KEY_MISMATCH        receipt.keyId equals the pinned key
 *  3. INVALID_SIGNATURE   digest recomputed from content + ECDSA signature with the pinned key
 *  4. UNKNOWN_SALE        saleId was created on this device
 *  5. ALREADY_REDEEMED    not redeemed before on this device
 *  6. MERCHANT_MISMATCH   merchantWallet equals this device's wallet
 *  7. ASSET_MISMATCH      same asset code as the sale
 *  8. AMOUNT_INSUFFICIENT received >= sale amount (exact, scale-independent)
 * A valid simulator receipt returns kind SIMULATED_PAYMENT.
 */
export async function verifyReceiptOffline(
  receipt: unknown,
  ctx: OfflineVerificationContext
): Promise<ReceiptValidationResult> {
  if (!isReceiptV2(receipt)) return fail('INVALID_FORMAT');

  if (receipt.keyId !== ctx.pinnedKey.keyId) return fail('KEY_MISMATCH');

  const digest = await computeSha256(getReceiptPayloadForSigning(receipt));
  if (digest !== receipt.payloadDigest) return fail('INVALID_SIGNATURE');
  if (!(await verifySignature(digest, receipt.backendSignature, ctx.pinnedKey.publicKey))) {
    return fail('INVALID_SIGNATURE');
  }

  const sale = await ctx.getDeviceSale(receipt.saleId);
  if (!sale || sale.saleId !== receipt.saleId) return fail('UNKNOWN_SALE');

  if (await ctx.isRedeemed(receipt)) return fail('ALREADY_REDEEMED');

  if (!sameWalletAddress(receipt.merchantWallet, ctx.deviceWallet)) return fail('MERCHANT_MISMATCH');

  if (receipt.amountReceived.assetCode.toUpperCase() !== sale.currency.toUpperCase()) {
    return fail('ASSET_MISMATCH', `Venta en ${sale.currency}, comprobante en ${receipt.amountReceived.assetCode}.`);
  }

  let saleMinor: bigint;
  try {
    saleMinor = toMinorUnits(sale.amount, sale.assetScale);
  } catch {
    return fail('INVALID_FORMAT', 'La venta guardada tiene un monto inválido.');
  }
  if (!isAtLeast(receipt.amountReceived, { value: saleMinor.toString(), assetScale: sale.assetScale })) {
    return fail(
      'AMOUNT_INSUFFICIENT',
      `Esperado ${sale.amount} ${sale.currency}, recibido ${formatAmount(receipt.amountReceived)}.`
    );
  }

  const simulated = receipt.mode === 'simulator';
  return {
    valid: true,
    kind: simulated ? 'SIMULATED_PAYMENT' : 'LIVE_PAYMENT',
    receipt,
    sale,
    message: simulated
      ? `SIMULACIÓN: comprobante de prueba por ${formatAmount(receipt.amountReceived)}. No es dinero real.`
      : `Pago verificado: ${formatAmount(receipt.amountReceived)} recibidos.`,
  };
}
