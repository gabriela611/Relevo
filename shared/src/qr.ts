/**
 * QR Code Serialization, Parsing & Offline Verification for RELEVO
 */

import {
  PaymentSaleRequest,
  VerifiedReceipt,
  ReceiptValidationResult,
} from './types.js';
import {
  canonicalJson,
  computeSha256,
  verifySignature,
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
} from './crypto.js';

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

/**
 * Encode a PaymentSaleRequest into a compact QR payload
 */
export function encodeSaleToQr(sale: PaymentSaleRequest): string {
  const json = JSON.stringify(sale);
  return `relevo:sale:v1:${toBase64UrlString(json)}`;
}

/**
 * Parse a QR code string into a PaymentSaleRequest
 */
export function parseSaleFromQr(qrContent: string): PaymentSaleRequest | null {
  try {
    const trimmed = qrContent.trim();
    if (trimmed.startsWith('relevo:sale:v1:')) {
      const b64 = trimmed.substring('relevo:sale:v1:'.length);
      const json = fromBase64UrlString(b64);
      const parsed = JSON.parse(json) as PaymentSaleRequest;
      if (parsed.version === '1' && parsed.saleId && parsed.amount && parsed.currency) {
        return parsed;
      }
    }
    // Fallback: direct JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed) as PaymentSaleRequest;
      if (parsed.saleId && parsed.amount) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse sale QR payload:', err);
  }
  return null;
}

/**
 * Extract canonical digest payload from a receipt
 */
export function getReceiptPayloadForSigning(receipt: Omit<VerifiedReceipt, 'backendSignature' | 'payloadDigest'>): string {
  return canonicalJson({
    version: receipt.version,
    receiptId: receipt.receiptId,
    saleId: receipt.saleId,
    merchantWalletAddress: receipt.merchantWalletAddress,
    payerWalletAddress: receipt.payerWalletAddress,
    amountReceived: receipt.amountReceived,
    currency: receipt.currency,
    assetScale: receipt.assetScale,
    incomingPaymentId: receipt.incomingPaymentId,
    outgoingPaymentId: receipt.outgoingPaymentId || '',
    timestamp: receipt.timestamp,
  });
}

/**
 * Encode a VerifiedReceipt into a compact QR payload
 */
export function encodeReceiptToQr(receipt: VerifiedReceipt): string {
  const json = JSON.stringify(receipt);
  return `relevo:receipt:v1:${toBase64UrlString(json)}`;
}

/**
 * Parse a QR code string into a VerifiedReceipt
 */
export function parseReceiptFromQr(qrContent: string): VerifiedReceipt | null {
  try {
    const trimmed = qrContent.trim();
    if (trimmed.startsWith('relevo:receipt:v1:')) {
      const b64 = trimmed.substring('relevo:receipt:v1:'.length);
      const json = fromBase64UrlString(b64);
      const parsed = JSON.parse(json) as VerifiedReceipt;
      if (parsed.version === '1' && parsed.receiptId && parsed.saleId && parsed.backendSignature) {
        return parsed;
      }
    }
    // Fallback: direct JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed) as VerifiedReceipt;
      if (parsed.receiptId && parsed.backendSignature) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse receipt QR payload:', err);
  }
  return null;
}

/**
 * Verify a receipt cryptographically and logically against the expected sale
 * Runs completely offline on the merchant device.
 */
export async function verifyReceiptOffline(
  receipt: VerifiedReceipt,
  expectedSale: PaymentSaleRequest,
  backendPublicKey: CryptoKey,
  redeemedReceiptIds?: Set<string>
): Promise<ReceiptValidationResult> {
  // 1. Check double-spending / duplicate replay
  if (redeemedReceiptIds && redeemedReceiptIds.has(receipt.receiptId)) {
    return {
      valid: false,
      error: 'ALREADY_REDEEMED',
      message: `El comprobante con ID ${receipt.receiptId} ya fue redimido previamente.`,
    };
  }

  // 2. Validate sale ID match
  if (receipt.saleId !== expectedSale.saleId) {
    return {
      valid: false,
      error: 'SALE_ID_MISMATCH',
      message: `El comprobante corresponde a la venta ${receipt.saleId}, no a la venta actual ${expectedSale.saleId}.`,
    };
  }

  // 3. Validate currency
  if (receipt.currency.toUpperCase() !== expectedSale.currency.toUpperCase()) {
    return {
      valid: false,
      error: 'CURRENCY_MISMATCH',
      message: `Divisa incompatible: se esperaba ${expectedSale.currency} y se recibió ${receipt.currency}.`,
    };
  }

  // 4. Validate received amount (must be >= requested amount)
  const receivedVal = parseFloat(receipt.amountReceived);
  const expectedVal = parseFloat(expectedSale.amount);
  if (isNaN(receivedVal) || isNaN(expectedVal) || receivedVal < expectedVal) {
    return {
      valid: false,
      error: 'AMOUNT_MISMATCH',
      message: `Monto recibido insuficiente: se esperaba ${expectedSale.amount} y se recibió ${receipt.amountReceived}.`,
    };
  }

  // 5. Validate merchant wallet address match
  if (
    receipt.merchantWalletAddress.toLowerCase() !==
    expectedSale.merchantWalletAddress.toLowerCase()
  ) {
    return {
      valid: false,
      error: 'SALE_ID_MISMATCH',
      message: `La dirección de billetera receptora no coincide con el comercio.`,
    };
  }

  // 6. Validate canonical digest matches receipt content
  const canonicalContent = getReceiptPayloadForSigning(receipt);
  const computedDigest = await computeSha256(canonicalContent);
  if (computedDigest !== receipt.payloadDigest) {
    return {
      valid: false,
      error: 'INVALID_SIGNATURE',
      message: 'El contenido del recibo ha sido alterado o manipulado (falla de integridad SHA-256).',
    };
  }

  // 7. Verify ECDSA signature of the digest by backend trusted key
  const signatureValid = await verifySignature(
    computedDigest,
    receipt.backendSignature,
    backendPublicKey
  );

  if (!signatureValid) {
    return {
      valid: false,
      error: 'INVALID_SIGNATURE',
      message: 'Firma criptográfica inválida. El recibo no fue emitido por una entidad autorizada.',
    };
  }

  return {
    valid: true,
    receipt,
    reason: 'Comprobante válido y verificado criptográficamente offline.',
  };
}
