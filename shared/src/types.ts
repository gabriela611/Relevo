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

export interface MerchantProfile {
  id: string;
  name: string;
  walletAddress: string;      // Open Payments wallet address (e.g., https://ilp.rafiki.money/merchant)
  publicKeyJwk: JsonWebKey;   // Merchant's public verification key
  createdAt: number;
}

export interface PaymentSaleRequest {
  version: '1';
  saleId: string;             // Unique sale identifier (UUID / nano-id)
  merchantId: string;
  merchantName: string;
  merchantWalletAddress: string;
  amount: string;             // Exact amount requested (e.g. "15.00" or raw units with assetScale)
  currency: string;           // ISO 4217 code (e.g. USD, EUR, MXN, COP)
  assetScale: number;         // Decimal places (usually 2)
  createdAt: number;          // Unix timestamp in ms
  expiresAt: number;          // Expiration timestamp in ms
  nonce: string;              // Anti-replay random string
  merchantSignature?: string; // Optional merchant signature
}

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
  estimatedRate: number;      // Exchange rate from buyer currency to merchant currency
  fees: {
    value: string;
    assetCode: string;
    assetScale: number;
  };
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
