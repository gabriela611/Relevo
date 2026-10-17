/**
 * Cryptographic engine for Relevo using standard Web Crypto API (ECDSA P-256 + SHA-256)
 * Compatible with modern Node.js and web browsers.
 */

const subtle = (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) 
  ? globalThis.crypto.subtle 
  : null;

function getSubtle(): SubtleCrypto {
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.');
  }
  return subtle;
}

/**
 * Deterministically serialize any JSON object by sorting object keys recursively.
 * Guarantees identical byte sequences for cryptographic hashing and signing.
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys
    .filter((k) => (obj as Record<string, unknown>)[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((obj as Record<string, unknown>)[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Base64URL encode/decode helpers that work in both Node.js and Browser
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' 
    ? btoa(binary) 
    : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToArrayBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = typeof atob === 'function'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate an ECDSA P-256 key pair for signing and verification
 */
export async function generateEcdsaKeyPair(): Promise<CryptoKeyPair> {
  const s = getSubtle();
  return (await s.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;
}

/**
 * Export a CryptoKey to JWK format for storage or transmission
 */
export async function exportKeyToJwk(key: CryptoKey): Promise<JsonWebKey> {
  const s = getSubtle();
  return await s.exportKey('jwk', key);
}

/**
 * Import a public or private JWK into a CryptoKey
 */
export async function importPublicKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  const s = getSubtle();
  return await s.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['verify']
  );
}

export async function importPrivateKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  const s = getSubtle();
  return await s.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign']
  );
}

/**
 * Computes SHA-256 digest of arbitrary UTF-8 text (hex string output)
 */
export async function computeSha256(text: string): Promise<string> {
  const s = getSubtle();
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await s.digest('SHA-256', data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * RFC 7638 JWK thumbprint (SHA-256, base64url) of an EC public key.
 * Used as the receipt `keyId`: stable for a given key, different for any other.
 */
export async function computeJwkThumbprint(jwk: JsonWebKey): Promise<string> {
  if (jwk.kty !== 'EC' || !jwk.crv || !jwk.x || !jwk.y) {
    throw new Error('Se esperaba una llave pública EC (crv, x, y).');
  }
  // Required members only, lexicographic order, no whitespace (RFC 7638 §3.2).
  const canonical = `{"crv":${JSON.stringify(jwk.crv)},"kty":"EC","x":${JSON.stringify(jwk.x)},"y":${JSON.stringify(jwk.y)}}`;
  const digest = await getSubtle().digest('SHA-256', new TextEncoder().encode(canonical) as unknown as BufferSource);
  return arrayBufferToBase64Url(digest);
}

/**
 * Sign UTF-8 data using ECDSA P-256 + SHA-256, returning base64url signature
 */
export async function signData(data: string, privateKey: CryptoKey): Promise<string> {
  const s = getSubtle();
  const encoder = new TextEncoder();
  const signature = await s.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    encoder.encode(data) as unknown as BufferSource
  );
  return arrayBufferToBase64Url(signature);
}

/**
 * Verify base64url ECDSA P-256 signature against UTF-8 data
 */
export async function verifySignature(
  data: string,
  signatureBase64Url: string,
  publicKey: CryptoKey
): Promise<boolean> {
  try {
    const s = getSubtle();
    const encoder = new TextEncoder();
    const signatureBytes = base64UrlToArrayBuffer(signatureBase64Url);
    return await s.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      publicKey,
      signatureBytes as unknown as BufferSource,
      encoder.encode(data) as unknown as BufferSource
    );
  } catch (err) {
    console.warn('Signature verification error:', err);
    return false;
  }
}
