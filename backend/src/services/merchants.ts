import {
  computeJwkThumbprint,
  importPublicKeyFromJwk,
  isSaleV2,
  isValidDecimalAmount,
  normalizeWalletAddress,
  sameSaleContent,
  verifySale,
  type PaymentSaleRequest,
} from '@relevo/shared';
import { config } from '../config.js';
import { dbService } from './db.js';
import { PaymentFlowError } from './openPayments.js';

export type SaleRejectReason =
  | 'SALE_SIGNATURE_MISSING'
  | 'INVALID_SALE'
  | 'MERCHANT_NOT_REGISTERED'
  | 'MERCHANT_KEY_MISMATCH'
  | 'INVALID_SALE_SIGNATURE'
  | 'SALE_ID_REUSED';

/** Canonical key used to store and compare wallet addresses. */
const walletKey = (w: string) => normalizeWalletAddress(w).toLowerCase();

const reject = (reason: SaleRejectReason, message: string) => new PaymentFlowError(400, message, reason);

/**
 * Registers the merchant device's public key for a wallet.
 * Known limitation: anyone can register an allowlisted wallet first; there is no
 * proof of wallet ownership yet (next step: Open Payments wallet address ownership
 * verification instead of the MERCHANT_WALLETS allowlist). No key rotation.
 */
export async function registerMerchant(body: unknown): Promise<{ statusCode: 200 | 201; merchantWallet: string; keyId: string; alreadyRegistered: boolean }> {
  const { merchantWallet, publicKeyJwk } = (body ?? {}) as { merchantWallet?: unknown; publicKeyJwk?: JsonWebKey };
  if (typeof merchantWallet !== 'string' || !merchantWallet.trim()) {
    throw new PaymentFlowError(400, 'merchantWallet es requerido.', 'INVALID_REQUEST');
  }
  if (!publicKeyJwk || typeof publicKeyJwk !== 'object' || publicKeyJwk.kty !== 'EC' || publicKeyJwk.crv !== 'P-256' || 'd' in publicKeyJwk) {
    throw new PaymentFlowError(400, 'publicKeyJwk debe ser una llave PÚBLICA ECDSA P-256 (sin "d").', 'INVALID_KEY');
  }
  try {
    await importPublicKeyFromJwk(publicKeyJwk);
  } catch {
    throw new PaymentFlowError(400, 'publicKeyJwk no es una llave P-256 válida.', 'INVALID_KEY');
  }

  const wallet = walletKey(merchantWallet);
  if (!config.merchantWallets.map(walletKey).includes(wallet)) {
    throw new PaymentFlowError(403, 'Esta billetera no está habilitada como comercio en RELEVO (MERCHANT_WALLETS).', 'MERCHANT_NOT_ALLOWED');
  }

  // Store only the public members so nothing else from the request is persisted.
  const cleanJwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x: publicKeyJwk.x, y: publicKeyJwk.y };
  const keyId = await computeJwkThumbprint(cleanJwk);
  if (dbService.registerMerchantKey({ merchantWallet: wallet, keyId, publicKeyJwk: cleanJwk, registeredAt: Date.now() })) {
    return { statusCode: 201, merchantWallet: wallet, keyId, alreadyRegistered: false };
  }
  const existing = dbService.getMerchantKey(wallet)!;
  if (existing.keyId === keyId) {
    return { statusCode: 200, merchantWallet: wallet, keyId, alreadyRegistered: true };
  }
  throw new PaymentFlowError(409, 'Esta billetera ya tiene otra llave registrada. La rotación de llaves no está soportada en esta versión.', 'KEY_ALREADY_REGISTERED');
}

/**
 * Accepts a sale only if it is signed by the device key registered for its
 * merchant wallet, then stores it. Checks, in order:
 * signature present -> well-formed -> merchant registered -> keyId matches ->
 * signature valid -> saleId not reused with different content.
 */
export async function acceptSignedSale(raw: unknown): Promise<PaymentSaleRequest> {
  const r = (raw ?? {}) as Partial<PaymentSaleRequest>;
  if (typeof r.merchantSignature !== 'string' || !r.merchantSignature || typeof r.merchantKeyId !== 'string' || !r.merchantKeyId) {
    throw reject('SALE_SIGNATURE_MISSING', 'La venta no está firmada por el comercio (falta merchantSignature/merchantKeyId).');
  }
  if (!isSaleV2(raw)) throw reject('INVALID_SALE', 'La venta no tiene el formato v2 esperado.');
  const sale = raw;
  if (!isValidDecimalAmount(sale.amount)) throw reject('INVALID_SALE', 'amount debe ser un decimal positivo, ej. "15.00".');
  if (!/^[A-Z]{3}$/.test(sale.currency)) throw reject('INVALID_SALE', 'currency debe ser un código ISO de 3 letras en mayúsculas.');
  if (sale.assetScale < 0 || sale.assetScale > 9) throw reject('INVALID_SALE', 'assetScale inválido.');

  const registered = dbService.getMerchantKey(walletKey(sale.merchantWalletAddress));
  if (!registered) {
    throw reject('MERCHANT_NOT_REGISTERED', 'La billetera de esta venta no corresponde a un comercio registrado en RELEVO.');
  }
  if (registered.keyId !== sale.merchantKeyId) {
    throw reject('MERCHANT_KEY_MISMATCH', 'La venta fue firmada con una llave que no es la registrada para este comercio.');
  }
  if (!(await verifySale(sale, await importPublicKeyFromJwk(registered.publicKeyJwk)))) {
    throw reject('INVALID_SALE_SIGNATURE', 'La firma de la venta no es válida: el QR fue alterado o no lo generó este comercio.');
  }

  const existing = dbService.getSale(sale.saleId);
  if (existing && !sameSaleContent(existing, sale)) {
    throw reject('SALE_ID_REUSED', 'Ya existe una venta con este ID y contenido distinto.');
  }
  if (!existing) dbService.createSale(sale, 'WAITING_PAYMENT');
  return sale;
}
