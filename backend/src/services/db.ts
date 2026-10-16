import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { PaymentSaleRequest, VerifiedReceipt, PaymentState, MerchantProfile } from '@relevo/shared';

// Initialize SQLite database
const db = new DatabaseSync(config.dbPath);

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

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    incoming_payment_id TEXT NOT NULL,
    outgoing_payment_id TEXT,
    payer_wallet TEXT NOT NULL,
    amount_received TEXT NOT NULL,
    currency TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(sale_id)
  );

  CREATE TABLE IF NOT EXISTS receipts (
    receipt_id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL UNIQUE,
    merchant_wallet TEXT NOT NULL,
    payer_wallet TEXT NOT NULL,
    amount_received TEXT NOT NULL,
    currency TEXT NOT NULL,
    payload_digest TEXT NOT NULL,
    backend_signature TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(sale_id)
  );
`);

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

  // Receipts operations
  saveReceipt(receipt: VerifiedReceipt): void {
    const stmt = db.prepare(`
      INSERT INTO receipts (
        receipt_id, sale_id, merchant_wallet, payer_wallet,
        amount_received, currency, payload_digest, backend_signature, raw_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sale_id) DO UPDATE SET
        backend_signature = excluded.backend_signature,
        payload_digest = excluded.payload_digest,
        raw_json = excluded.raw_json
    `);
    stmt.run(
      receipt.receiptId,
      receipt.saleId,
      receipt.merchantWalletAddress,
      receipt.payerWalletAddress,
      receipt.amountReceived,
      receipt.currency,
      receipt.payloadDigest,
      receipt.backendSignature,
      JSON.stringify(receipt),
      receipt.timestamp
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
