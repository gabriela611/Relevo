import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  isSimulator: boolean;
  dbPath: string;
  defaultMerchantWallet: string;
  defaultMerchantName: string;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  isSimulator: process.env.RELEVO_SIMULATOR !== 'false', // default to simulator enabled for offline/hackathon reliability
  dbPath: process.env.DB_PATH || 'relevo.sqlite',
  defaultMerchantWallet: process.env.MERCHANT_WALLET || 'https://ilp.rafiki.money/relevo-merchant',
  defaultMerchantName: process.env.MERCHANT_NAME || 'Doña Elena - Tienda Local',
};
