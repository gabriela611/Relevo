/**
 * RELEVO Domain Types & Protocols
 * Open Payments + Offline Cryptographic Verification
 */

export type PaymentState =
  | 'WAITING_PAYMENT'        // Merchant created sale, waiting for buyer
  | 'AUTHORIZATION_PENDING'  // Buyer consent / GNAP grant required
  | 'PROCESSING'             // Outgoing payment sent, confirming ILP packet
  | 'PAYMENT_VERIFIED'       // Backend verified incoming payment funds received
  | 'OFFLINE_VERIFIED'       // Merchant scanned & validated ECDSA signature offline
  | 'FAILED_OR_EXPIRED';     // Payment failed, rejected or timed out

/** A merchant device key registered with the backend (POST /api/merchants/register). */
export interface MerchantKeyRegistration {
  merchantWallet: string;     // Open Payments wallet address of the merchant
  keyId: string;              // RFC 7638 thumbprint of publicKeyJwk
  publicKeyJwk: JsonWebKey;   // Merchant device's ECDSA P-256 public key
  registeredAt: number;
}

/**
 * Sale v2, created and signed on the merchant device. Every field except
 * merchantSignature is covered by the signature (see getSalePayloadForSigning).
 */
export interface PaymentSaleRequest {
  version: '2';
  saleId: string;             // Unique sale identifier (UUID)
  merchantId: string;
  merchantName: string;
  merchantWalletAddress: string;
  amount: string;             // Exact amount requested as a decimal string ("15.00")
  currency: string;           // ISO 4217 code (e.g. USD, EUR, MXN, COP)
  assetScale: number;         // Decimal places (usually 2)
  createdAt: number;          // Unix timestamp in ms
  expiresAt: number;          // Expiration timestamp in ms
  nonce: string;              // Anti-replay random string
  merchantKeyId: string;      // RFC 7638 thumbprint of the merchant device key
  merchantSignature: string;  // ECDSA P-256 / SHA-256, IEEE P1363, base64url
}

export type UnsignedSale = Omit<PaymentSaleRequest, 'merchantKeyId' | 'merchantSignature'>;

export interface CurrencyQuote {
  quoteId: string;
  debitAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  receiveAmount: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
  /**
   * Merchant currency received per 1 unit of buyer currency debited, as a decimal
   * string computed with BigInt (truncated to 6 decimals). Includes all fees.
   */
  effectiveRate: string;
  /**
   * Explicit fee, only for same-currency quotes (debit - receive). null for
   * cross-currency quotes: Open Payments doesn't itemize fees, they are inside
   * the rate (see feesIncluded).
   */
  fees: {
    value: string;
    assetCode: string;
    assetScale: number;
  } | null;
  /** true when fees are embedded in effectiveRate rather than shown in `fees`. */
  feesIncluded: boolean;
  expiresAt: number;
}

/** Which rail produced a receipt. Simulator receipts are never real money. */
export type PaymentMode = 'live' | 'simulator';

/** Open Payments amount: integer `value` in minor units ("1500" + scale 2 = 15.00). */
export interface ReceiptAmount {
  value: string;
  assetCode: string;
  assetScale: number;
}

/**
 * Receipt v2. Every field except payloadDigest/backendSignature is covered by
 * the signature. It deliberately carries no payer data (it is shown as a QR).
 */
export interface VerifiedReceipt {
  version: '2';
  receiptId: string;            // Unique receipt identifier (UUID)
  saleId: string;               // Binds the receipt to one sale created on the merchant device
  merchantWallet: string;       // Wallet address that received the funds
  amountReceived: ReceiptAmount; // Read from the merchant's incoming payment, not from the quote
  incomingPaymentId: string;    // Open Payments incoming payment URL (merchant side)
  outgoingPaymentId: string;    // Open Payments outgoing payment URL (payer side)
  issuedAt: number;             // Unix ms
  keyId: string;                // RFC 7638 thumbprint of the backend signing key
  mode: PaymentMode;
  payloadDigest: string;        // SHA-256 (hex) of the canonical signed fields
  backendSignature: string;     // ECDSA P-256 / SHA-256, IEEE P1363 (r||s, 64 bytes), base64url
}

export type UnsignedReceipt = Omit<VerifiedReceipt, 'payloadDigest' | 'backendSignature'>;

/** Public key the merchant device pins while online (GET /api/receipt-key). */
export interface ReceiptKeyInfo {
  keyId: string;
  alg: 'ES256';
  publicKeyJwk: JsonWebKey;
}

export type ReceiptErrorCode =
  | 'INVALID_FORMAT'
  | 'KEY_MISMATCH'
  | 'INVALID_SIGNATURE'
  | 'UNKNOWN_SALE'
  | 'ALREADY_REDEEMED'
  | 'MERCHANT_MISMATCH'
  | 'ASSET_MISMATCH'
  | 'AMOUNT_INSUFFICIENT';

export type ReceiptValidationResult =
  | {
      valid: true;
      /** SIMULATED_PAYMENT must be shown as a simulation, never as money received. */
      kind: 'LIVE_PAYMENT' | 'SIMULATED_PAYMENT';
      receipt: VerifiedReceipt;
      sale: PaymentSaleRequest;
      message: string;
    }
  | { valid: false; error: ReceiptErrorCode; message: string };

export interface OfflineSyncRecord {
  saleId: string;
  receiptId?: string;
  status: PaymentState;
  saleRequest: PaymentSaleRequest;
  verifiedReceipt?: VerifiedReceipt;
  verifiedAt?: number;
  syncedWithBackend: boolean;
}
