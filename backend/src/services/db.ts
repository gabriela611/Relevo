import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { PaymentSaleRequest, VerifiedReceipt, PaymentState, MerchantProfile } from '@relevo/shared';
import type { Amount } from './gateways/gateway.js';

export type PaymentAttemptStatus = 'QUOTED' | 'AUTHORIZATION_PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** Result of checking the GNAP interaction hash on the callback. */
export type HashCheck = 'MATCH' | 'MISMATCH' | 'ABSENT';

export interface PaymentAttempt {
  id: string;
  saleId: string;
  payerWallet: string;
  incomingPaymentId: string;
  opQuoteId: string;
  debitAmount: Amount;
  receiveAmount: Amount;
  quoteExpiresAt?: number;
  status: PaymentAttemptStatus;
  clientNonce?: string;
  finishNonce?: string;
  continueUri?: string;
  continueToken?: string;
  redirectUrl?: string;
  outgoingPaymentId?: string;
  hashCheck?: HashCheck;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const PAYMENT_UPDATABLE_COLUMNS = {
  status: 'status',
  clientNonce: 'client_nonce',
  finishNonce: 'finish_nonce',
  continueUri: 'continue_uri',
  continueToken: 'continue_token',
  redirectUrl: 'redirect_url',
  outgoingPaymentId: 'outgoing_payment_id',
  hashCheck: 'hash_check',
  error: 'error',
} as const;

function rowToPayment(row: Record<string, unknown>): PaymentAttempt {
  const opt = (v: unknown) => (v === null || v === undefined ? undefined : (v as string));
  return {
    id: row.id as string,
    saleId: row.sale_id as string,
    payerWallet: row.payer_wallet as string,
    incomingPaymentId: row.incoming_payment_id as string,
    opQuoteId: row.op_quote_id as string,
    debitAmount: JSON.parse(row.debit_amount_json as string),
    receiveAmount: JSON.parse(row.receive_amount_json as string),
    quoteExpiresAt: row.quote_expires_at === null ? undefined : Number(row.quote_expires_at),
    status: row.status as PaymentAttemptStatus,
    clientNonce: opt(row.client_nonce),
    finishNonce: opt(row.finish_nonce),
    continueUri: opt(row.continue_uri),
    continueToken: opt(row.continue_token),
    redirectUrl: opt(row.redirect_url),
    outgoingPaymentId: opt(row.outgoing_payment_id),
    hashCheck: opt(row.hash_check) as HashCheck | undefined,
    error: opt(row.error),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

// Initialize SQLite database
const db = new DatabaseSync(config.dbPath);

// v1 receipts (with payer data, decimal amounts) are incompatible with receipt v2 and
// were never valid for the new verifier: drop the old table on local dev databases.
const legacyReceiptCols = db.prepare(`PRAGMA table_info(receipts)`).all() as Array<{ name: string }>;
if (legacyReceiptCols.some((c) => c.name === 'payer_wallet')) {
  db.exec(`DROP TABLE receipts`);
}

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    public_key_jwk TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    sale_id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    merchant_wallet_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    currency TEXT NOT NULL,
    asset_scale INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    nonce TEXT NOT NULL,
    merchant_signature TEXT
  );

  -- One row per payment attempt (quote -> GNAP authorization -> outgoing payment).
  -- The row id is the quoteId handed to the frontend.
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    payer_wallet TEXT NOT NULL,
    incoming_payment_id TEXT NOT NULL,
    op_quote_id TEXT NOT NULL,
    debit_amount_json TEXT NOT NULL,
    receive_amount_json TEXT NOT NULL,
    quote_expires_at INTEGER,
    status TEXT NOT NULL,
    client_nonce TEXT,
    finish_nonce TEXT,
    continue_uri TEXT,
    continue_token TEXT,
    redirect_url TEXT,
    outgoing_payment_id TEXT,
    hash_check TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(sale_id)
  );

  CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL UNIQUE,
    merchant_wallet TEXT NOT NULL,
    amount_value TEXT NOT NULL,
    asset_code TEXT NOT NULL,
    asset_scale INTEGER NOT NULL,
    mode TEXT NOT NULL,
    key_id TEXT NOT NULL,
    payload_digest TEXT NOT NULL,
    backend_signature TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(sale_id)
  );
`);

// Additive migrations for local databases created by earlier versions.
const paymentCols = db.prepare(`PRAGMA table_info(payments)`).all() as Array<{ name: string }>;
if (!paymentCols.some((c) => c.name === 'hash_check')) {
  db.exec(`ALTER TABLE payments ADD COLUMN hash_check TEXT`);
}

export const dbService = {
  // Merchant operations
  upsertMerchant(merchant: MerchantProfile): void {
    const stmt = db.prepare(`
      INSERT INTO merchants (id, name, wallet_address, public_key_jwk, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        wallet_address = excluded.wallet_address,
        public_key_jwk = excluded.public_key_jwk
    `);
    stmt.run(
      merchant.id,
      merchant.name,
      merchant.walletAddress,
      JSON.stringify(merchant.publicKeyJwk),
      merchant.createdAt
    );
  },

  getMerchant(id: string): MerchantProfile | null {
    const stmt = db.prepare(`SELECT * FROM merchants WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      name: row.name as string,
      walletAddress: row.wallet_address as string,
      publicKeyJwk: JSON.parse(row.public_key_jwk as string),
      createdAt: Number(row.created_at),
    };
  },

  // Sales operations
  createSale(sale: PaymentSaleRequest, initialStatus: PaymentState = 'WAITING_PAYMENT'): void {
    const stmt = db.prepare(`
      INSERT INTO sales (
        sale_id, merchant_id, merchant_name, merchant_wallet_address,
        amount, currency, asset_scale, status, created_at, expires_at, nonce, merchant_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sale_id) DO NOTHING
    `);
    stmt.run(
      sale.saleId,
      sale.merchantId,
      sale.merchantName,
      sale.merchantWalletAddress,
      sale.amount,
      sale.currency,
      sale.assetScale,
      initialStatus,
      sale.createdAt,
      sale.expiresAt,
      sale.nonce,
      sale.merchantSignature || null
    );
  },

  getSale(saleId: string): (PaymentSaleRequest & { status: PaymentState }) | null {
    const stmt = db.prepare(`SELECT * FROM sales WHERE sale_id = ?`);
    const row = stmt.get(saleId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      version: '1',
      saleId: row.sale_id as string,
      merchantId: row.merchant_id as string,
      merchantName: row.merchant_name as string,
      merchantWalletAddress: row.merchant_wallet_address as string,
      amount: row.amount as string,
      currency: row.currency as string,
      assetScale: Number(row.asset_scale),
      createdAt: Number(row.created_at),
      expiresAt: Number(row.expires_at),
      nonce: row.nonce as string,
      merchantSignature: (row.merchant_signature as string) || undefined,
      status: row.status as PaymentState,
    };
  },

  updateSaleStatus(saleId: string, status: PaymentState): void {
    const stmt = db.prepare(`UPDATE sales SET status = ? WHERE sale_id = ?`);
    stmt.run(status, saleId);
  },

  // Payment attempt operations
  createPayment(p: Omit<PaymentAttempt, 'createdAt' | 'updatedAt'>): PaymentAttempt {
    const now = Date.now();
    db.prepare(`
      INSERT INTO payments (
        id, sale_id, payer_wallet, incoming_payment_id, op_quote_id,
        debit_amount_json, receive_amount_json, quote_expires_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.id,
      p.saleId,
      p.payerWallet,
      p.incomingPaymentId,
      p.opQuoteId,
      JSON.stringify(p.debitAmount),
      JSON.stringify(p.receiveAmount),
      p.quoteExpiresAt ?? null,
      p.status,
      now,
      now
    );
    return this.getPayment(p.id)!;
  },

  getPayment(id: string): PaymentAttempt | null {
    const row = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? rowToPayment(row) : null;
  },

  updatePayment(id: string, changes: Partial<Pick<PaymentAttempt, keyof typeof PAYMENT_UPDATABLE_COLUMNS>>): void {
    const entries = Object.entries(changes).filter(([k]) => k in PAYMENT_UPDATABLE_COLUMNS);
    if (entries.length === 0) return;
    const sets = entries.map(([k]) => `${PAYMENT_UPDATABLE_COLUMNS[k as keyof typeof PAYMENT_UPDATABLE_COLUMNS]} = ?`);
    db.prepare(`UPDATE payments SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(
      ...entries.map(([, v]) => (v === undefined ? null : (v as string))),
      Date.now(),
      id
    );
  },

  /** Most recent attempt for a sale that has created an outgoing payment. */
  getLatestPaidAttempt(saleId: string): PaymentAttempt | null {
    const row = db
      .prepare(`SELECT * FROM payments WHERE sale_id = ? AND outgoing_payment_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`)
      .get(saleId) as Record<string, unknown> | undefined;
    return row ? rowToPayment(row) : null;
  },

  /** Reuse one incoming payment per sale so two payers can't each pay the same sale. */
  getIncomingPaymentIdForSale(saleId: string): string | null {
    const row = db
      .prepare(`SELECT incoming_payment_id FROM payments WHERE sale_id = ? ORDER BY created_at DESC LIMIT 1`)
      .get(saleId) as { incoming_payment_id: string } | undefined;
    return row?.incoming_payment_id ?? null;
  },

  // Receipts operations
  saveReceipt(receipt: VerifiedReceipt): void {
    const stmt = db.prepare(`
      INSERT INTO receipts (
        receipt_id, sale_id, merchant_wallet, amount_value, asset_code, asset_scale,
        mode, key_id, payload_digest, backend_signature, raw_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `);
    // Receipts are immutable once issued: the payer may already hold the QR of the first one.
    stmt.run(
      receipt.receiptId,
      receipt.saleId,
      receipt.merchantWallet,
      receipt.amountReceived.value,
      receipt.amountReceived.assetCode,
      receipt.amountReceived.assetScale,
      receipt.mode,
      receipt.keyId,
      receipt.payloadDigest,
      receipt.backendSignature,
      JSON.stringify(receipt),
      receipt.issuedAt
    );
  },

  getReceiptBySaleId(saleId: string): VerifiedReceipt | null {
    const stmt = db.prepare(`SELECT raw_json FROM receipts WHERE sale_id = ?`);
    const row = stmt.get(saleId) as { raw_json: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.raw_json) as VerifiedReceipt;
  },

  listAllSales(): Array<PaymentSaleRequest & { status: PaymentState }> {
    const stmt = db.prepare(`SELECT * FROM sales ORDER BY created_at DESC LIMIT 50`);
    const rows = stmt.all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      version: '1',
      saleId: row.sale_id as string,
      merchantId: row.merchant_id as string,
      merchantName: row.merchant_name as string,
      merchantWalletAddress: row.merchant_wallet_address as string,
      amount: row.amount as string,
      currency: row.currency as string,
      assetScale: Number(row.asset_scale),
      createdAt: Number(row.created_at),
      expiresAt: Number(row.expires_at),
      nonce: row.nonce as string,
      merchantSignature: (row.merchant_signature as string) || undefined,
      status: row.status as PaymentState,
    }));
  },
};
