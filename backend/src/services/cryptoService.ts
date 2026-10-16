import fs from 'node:fs';
import path from 'node:path';
import {
  generateEcdsaKeyPair,
  exportKeyToJwk,
  importPrivateKeyFromJwk,
  importPublicKeyFromJwk,
  computeSha256,
  signData,
  getReceiptPayloadForSigning,
} from '@relevo/shared';
import { VerifiedReceipt } from '@relevo/shared';

const KEYS_FILE = path.resolve(process.cwd(), '.relevo-backend-keys.json');

interface StoredKeys {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: number;
}

class BackendCryptoService {
  private keyPair: CryptoKeyPair | null = null;
  private publicKeyJwk: JsonWebKey | null = null;
  private privateKeyJwk: JsonWebKey | null = null;

  async init(): Promise<void> {
    if (this.keyPair) return;

    if (fs.existsSync(KEYS_FILE)) {
      try {
        const raw = fs.readFileSync(KEYS_FILE, 'utf-8');
        const stored: StoredKeys = JSON.parse(raw);
        const publicKey = await importPublicKeyFromJwk(stored.publicKeyJwk);
        const privateKey = await importPrivateKeyFromJwk(stored.privateKeyJwk);
        this.keyPair = { publicKey, privateKey };
        this.publicKeyJwk = stored.publicKeyJwk;
        this.privateKeyJwk = stored.privateKeyJwk;
        return;
      } catch (err) {
        console.warn('Failed to load existing keys, generating fresh keypair:', err);
      }
    }

    // Generate new key pair
    const keyPair = await generateEcdsaKeyPair();
    const pubJwk = await exportKeyToJwk(keyPair.publicKey);
    const privJwk = await exportKeyToJwk(keyPair.privateKey);

    const stored: StoredKeys = {
      publicKeyJwk: pubJwk,
      privateKeyJwk: privJwk,
      createdAt: Date.now(),
    };

    try {
      fs.writeFileSync(KEYS_FILE, JSON.stringify(stored, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not persist keys file to disk, using in-memory keys:', e);
    }

    this.keyPair = keyPair;
    this.publicKeyJwk = pubJwk;
    this.privateKeyJwk = privJwk;
  }

  getPublicKeyJwk(): JsonWebKey {
    if (!this.publicKeyJwk) {
      throw new Error('BackendCryptoService not initialized. Call init() first.');
    }
    return this.publicKeyJwk;
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
    if (!this.keyPair) {
      await this.init();
    }

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
