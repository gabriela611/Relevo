import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config();

export type OpMode = 'live' | 'simulator';

export interface ServerConfig {
  port: number;
  host: string;
  /** Required: OP_MODE=live|simulator. null when missing/invalid (startup refuses to run). */
  opMode: OpMode | null;
  dbPath: string;
  /** Absolute path of the receipt-signing key file (resolved against backend/). */
  keysFile: string;
  defaultMerchantWallet: string;
  defaultMerchantName: string;
  /** Public URL of this backend, used to build the GNAP interaction finish (callback) URL. */
  publicBackendUrl: string;
  /** Where the payer's browser is sent after the Open Payments callback completes. */
  frontendUrl: string;
  openPayments: {
    /** Wallet address that identifies RELEVO as an Open Payments client (owner of the developer key). */
    clientWalletAddress: string;
    keyId: string;
    /** Path to the Ed25519 private key file (or the PEM content itself). */
    privateKey: string;
  };
  /** How long to poll the incoming payment for funds after creating the outgoing payment. */
  verifyTimeoutMs: number;
  /**
   * GNAP interaction hash on the callback. false (default): log a warning on
   * mismatch and continue. true: reject the callback. Flip to true only after a
   * live smoke run reports "hash: MATCH".
   */
  strictHash: boolean;
}

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseOpMode(raw: string | undefined): OpMode | null {
  const v = raw?.trim().toLowerCase();
  return v === 'live' || v === 'simulator' ? v : null;
}

const defaultMerchantWallet = process.env.MERCHANT_WALLET || 'https://ilp.interledger-test.dev/relevo-merchant';

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  opMode: parseOpMode(process.env.OP_MODE),
  dbPath: process.env.DB_PATH || 'relevo.sqlite',
  keysFile: path.resolve(BACKEND_DIR, process.env.RELEVO_KEYS_FILE || '.relevo-backend-keys.json'),
  defaultMerchantWallet,
  defaultMerchantName: process.env.MERCHANT_NAME || 'Doña Elena - Tienda Local',
  publicBackendUrl: (process.env.PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  openPayments: {
    clientWalletAddress: process.env.OPEN_PAYMENTS_CLIENT_WALLET || defaultMerchantWallet,
    keyId: process.env.OPEN_PAYMENTS_KEY_ID || '',
    privateKey: process.env.OPEN_PAYMENTS_PRIVATE_KEY_PATH || process.env.OPEN_PAYMENTS_PRIVATE_KEY || '',
  },
  verifyTimeoutMs: parseInt(process.env.VERIFY_TIMEOUT_MS || '15000', 10),
  strictHash: process.env.STRICT_HASH === 'true',
};

/** Returns the configured mode or throws a message meant for the person starting the server. */
export function requireOpMode(): OpMode {
  if (!config.opMode) {
    throw new Error(
      `OP_MODE es obligatorio en backend/.env: OP_MODE=live (Interledger Test Wallet) u OP_MODE=simulator. ` +
        `Valor actual: ${JSON.stringify(process.env.OP_MODE ?? null)}`
    );
  }
  return config.opMode;
}

export const MODE_LABEL: Record<OpMode, string> = {
  live: 'LIVE · Interledger Test Wallet',
  simulator: 'SIMULATOR',
};
