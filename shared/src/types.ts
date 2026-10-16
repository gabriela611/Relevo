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

export interface VerifiedReceipt {
  version: '1';
  receiptId: string;          // Unique receipt identifier (UUID)
  saleId: string;             // Matches PaymentSaleRequest.saleId exactly
  merchantWalletAddress: string;
  payerWalletAddress: string;
  amountReceived: string;     // Exact amount verified by Open Payments incoming payment
  currency: string;           // Asset code received
  assetScale: number;
  incomingPaymentId: string;  // Open Payments incoming payment identifier URL
  outgoingPaymentId?: string; // Open Payments outgoing payment identifier
  timestamp: number;          // Issuance timestamp (Unix ms)
  backendSignature: string;   // ECDSA P-256 signature by Relevo trusted backend
  payloadDigest: string;      // SHA-256 canonical hash of the payment receipt data
}

export type ReceiptValidationResult =
  | { valid: true; receipt: VerifiedReceipt; reason?: string }
  | {
      valid: false;
      error:
        | 'INVALID_SIGNATURE'
        | 'SALE_ID_MISMATCH'
        | 'AMOUNT_MISMATCH'
        | 'CURRENCY_MISMATCH'
        | 'EXPIRED_RECEIPT'
        | 'ALREADY_REDEEMED'
        | 'INVALID_FORMAT';
      message: string;
    };

export interface OfflineSyncRecord {
  saleId: string;
  receiptId?: string;
  status: PaymentState;
  saleRequest: PaymentSaleRequest;
  verifiedReceipt?: VerifiedReceipt;
  verifiedAt?: number;
  syncedWithBackend: boolean;
}
