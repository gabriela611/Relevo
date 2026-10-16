import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  isSimulator: boolean;
  dbPath: string;
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
}

const keyId = process.env.OPEN_PAYMENTS_KEY_ID || '';
const privateKey = process.env.OPEN_PAYMENTS_PRIVATE_KEY_PATH || process.env.OPEN_PAYMENTS_PRIVATE_KEY || '';
const hasLiveCredentials = Boolean(keyId && privateKey);
const defaultMerchantWallet = process.env.MERCHANT_WALLET || 'https://ilp.interledger-test.dev/relevo-merchant';

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  // Live Open Payments is used whenever credentials are present, unless the simulator is forced on.
  isSimulator: process.env.RELEVO_SIMULATOR === 'true' || !hasLiveCredentials,
  dbPath: process.env.DB_PATH || 'relevo.sqlite',
  keysFile: process.env.RELEVO_KEYS_FILE || '.relevo-backend-keys.json',
  defaultMerchantWallet,
  defaultMerchantName: process.env.MERCHANT_NAME || 'Doña Elena - Tienda Local',
  publicBackendUrl: (process.env.PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  openPayments: {
    clientWalletAddress: process.env.OPEN_PAYMENTS_CLIENT_WALLET || defaultMerchantWallet,
    keyId,
    privateKey,
  },
  verifyTimeoutMs: parseInt(process.env.VERIFY_TIMEOUT_MS || '15000', 10),
};
