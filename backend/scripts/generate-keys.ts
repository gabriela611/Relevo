/**
 * Creates the receipt-signing key once: npm run keys:generate --workspace=backend
 * Never overwrites an existing key and never prints the private key.
 */
import { spawnSync } from 'node:child_process';
import { config } from '../src/config.js';
import { generateKeyFile } from '../src/services/cryptoService.js';

const keysFile = config.keysFile;

// Refuse to write a secret to a path git would commit.
const check = spawnSync('git', ['check-ignore', '-q', keysFile], { cwd: process.cwd() });
if (check.status === 1) {
  console.error(`❌ ${keysFile} no está en .gitignore. Usa un nombre que termine en .relevo-backend-keys.json.`);
  process.exit(1);
}

try {
  const { keyId } = await generateKeyFile(keysFile);
  console.log(`✅ Llave de firma creada en ${keysFile}`);
  console.log(`   keyId: ${keyId}`);
} catch (err: any) {
  console.error(`❌ ${err?.message || err}`);
  process.exit(1);
}
