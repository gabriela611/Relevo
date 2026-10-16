import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
// Tests set RELEVO_SKIP_DOTENV so a developer's backend/.env can't leak into them.
if (process.env.RELEVO_SKIP_DOTENV !== '1') dotenv.config();

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
  /**
   * Public HTTPS URL of the PWA (e.g. the cloudflared tunnel). The payer's browser
   * is sent here after the callback, and it is the CORS origin allowed besides localhost.
   */
  publicFrontendUrl: string;
  /**
   * Public URL that reaches this backend, used for the GNAP finish (callback) URL.
   * Defaults to publicFrontendUrl because Vite proxies /api, so one tunnel serves both.
   */
  publicBackendUrl: string;
  /** Origins allowed by CORS. */
  corsOrigins: string[];
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

const stripSlash = (u: string) => u.replace(/\/+$/, '');
const publicFrontendUrl = stripSlash(process.env.PUBLIC_FRONTEND_URL || 'http://localhost:5173');

const defaultMerchantWallet = process.env.MERCHANT_WALLET || 'https://ilp.interledger-test.dev/relevo-merchant';

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  opMode: parseOpMode(process.env.OP_MODE),
  dbPath: process.env.DB_PATH || 'relevo.sqlite',
  keysFile: path.resolve(BACKEND_DIR, process.env.RELEVO_KEYS_FILE || '.relevo-backend-keys.json'),
  defaultMerchantWallet,
  defaultMerchantName: process.env.MERCHANT_NAME || 'Doña Elena - Tienda Local',
  publicFrontendUrl,
  publicBackendUrl: stripSlash(process.env.PUBLIC_BACKEND_URL || publicFrontendUrl),
  corsOrigins: [...new Set([new URL(publicFrontendUrl).origin, 'http://localhost:5173', 'http://127.0.0.1:5173'])],
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
