import { buildServer } from './app.js';
import { config } from './config.js';
import { backendCrypto } from './services/cryptoService.js';
import { dbService } from './services/db.js';
import { openPaymentsService } from './services/openPayments.js';

async function start() {
  const fastify = await buildServer({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  try {
    await backendCrypto.init();
    await openPaymentsService.init();

    dbService.upsertMerchant({
      id: 'merchant-default',
      name: config.defaultMerchantName,
      walletAddress: config.defaultMerchantWallet,
      publicKeyJwk: backendCrypto.getPublicKeyJwk(),
      createdAt: Date.now(),
    });

    await fastify.listen({ port: config.port, host: config.host });
    console.log(`🚀 RELEVO backend on http://localhost:${config.port} (${openPaymentsService.mode} mode)`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
