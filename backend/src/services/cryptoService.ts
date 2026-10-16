import fs from 'node:fs';
import path from 'node:path';
import {
  generateEcdsaKeyPair,
  exportKeyToJwk,
  importPrivateKeyFromJwk,
  importPublicKeyFromJwk,
  computeJwkThumbprint,
  computeSha256,
  signData,
  verifySignature,
  getReceiptPayloadForSigning,
} from '@relevo/shared';
import { VerifiedReceipt } from '@relevo/shared';
import { config } from '../config.js';

interface StoredKeys {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: number;
}

/**
 * Creates a new receipt-signing key file. Refuses to overwrite: rotating the key
 * invalidates every merchant device's pinned key until it comes back online.
 */
export async function generateKeyFile(keysFile: string): Promise<{ keyId: string }> {
  if (fs.existsSync(keysFile)) {
    throw new Error(`Ya existe una llave en ${keysFile}. No se sobrescribe; bórrala a mano si de verdad quieres rotarla.`);
  }
  const keyPair = await generateEcdsaKeyPair();
  const stored: StoredKeys = {
    publicKeyJwk: await exportKeyToJwk(keyPair.publicKey),
    privateKeyJwk: await exportKeyToJwk(keyPair.privateKey),
    createdAt: Date.now(),
  };
  fs.mkdirSync(path.dirname(keysFile), { recursive: true });
  fs.writeFileSync(keysFile, JSON.stringify(stored, null, 2), { encoding: 'utf-8', flag: 'wx', mode: 0o600 });
  return { keyId: await computeJwkThumbprint(stored.publicKeyJwk) };
}

class BackendCryptoService {
  private keyPair: CryptoKeyPair | null = null;
  private publicKeyJwk: JsonWebKey | null = null;
  private keyId: string | null = null;

  /**
   * Loads the signing key. A missing key file is fatal in live mode (a new key
   * would silently break every merchant's pinned key); the simulator may create one.
   */
  async init(): Promise<void> {
    if (this.keyPair) return;
    const keysFile = config.keysFile;

    if (!fs.existsSync(keysFile)) {
      if (config.opMode !== 'simulator') {
        throw new Error(
          `No existe la llave de firma de recibos (${keysFile}). ` +
            `Créala una sola vez con: npm run keys:generate --workspace=backend`
        );
      }
      const { keyId } = await generateKeyFile(keysFile);
      console.warn(`⚠️ Simulator: generated a new receipt-signing key (keyId ${keyId}).`);
    }

    let stored: StoredKeys;
    try {
      stored = JSON.parse(fs.readFileSync(keysFile, 'utf-8'));
      this.keyPair = {
        publicKey: await importPublicKeyFromJwk(stored.publicKeyJwk),
        privateKey: await importPrivateKeyFromJwk(stored.privateKeyJwk),
      };
    } catch (err: any) {
      throw new Error(`La llave de firma en ${keysFile} está corrupta o es inválida: ${err?.message || err}`);
    }
    this.publicKeyJwk = stored.publicKeyJwk;
    this.keyId = await computeJwkThumbprint(stored.publicKeyJwk);
  }

  getPublicKeyJwk(): JsonWebKey {
    if (!this.publicKeyJwk) {
      throw new Error('BackendCryptoService not initialized. Call init() first.');
    }
    return this.publicKeyJwk;
  }

  getKeyId(): string {
    if (!this.keyId) {
      throw new Error('BackendCryptoService not initialized. Call init() first.');
    }
    return this.keyId;
  }

  /** True only if the receipt was signed by this backend and has not been altered. */
  async isAuthenticReceipt(receipt: VerifiedReceipt): Promise<boolean> {
    await this.init();
    const digest = await computeSha256(getReceiptPayloadForSigning(receipt));
    if (digest !== receipt.payloadDigest) return false;
    return verifySignature(digest, receipt.backendSignature, this.keyPair!.publicKey);
  }

  async issueSignedReceipt(params: {
    receiptId: string;
    saleId: string;
    merchantWalletAddress: string;
    payerWalletAddress: string;
    amountReceived: string;
    currency: string;
    assetScale: number;
    incomingPaymentId: string;
    outgoingPaymentId?: string;
  }): Promise<VerifiedReceipt> {
    await this.init();

    const timestamp = Date.now();
    const unsignedReceiptPayload = {
      version: '1' as const,
      receiptId: params.receiptId,
      saleId: params.saleId,
      merchantWalletAddress: params.merchantWalletAddress,
      payerWalletAddress: params.payerWalletAddress,
      amountReceived: params.amountReceived,
      currency: params.currency,
      assetScale: params.assetScale,
      incomingPaymentId: params.incomingPaymentId,
      outgoingPaymentId: params.outgoingPaymentId,
      timestamp,
    };

    const canonicalContent = getReceiptPayloadForSigning(unsignedReceiptPayload);
    const payloadDigest = await computeSha256(canonicalContent);
    const backendSignature = await signData(payloadDigest, this.keyPair!.privateKey);

    return {
      ...unsignedReceiptPayload,
      payloadDigest,
      backendSignature,
    };
  }
}

export const backendCrypto = new BackendCryptoService();
