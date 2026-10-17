import { buildServer } from './app.js';
import { config, MODE_LABEL, requireOpMode } from './config.js';
import { backendCrypto } from './services/cryptoService.js';
import { openPaymentsService } from './services/openPayments.js';

async function start() {
  let mode;
  try {
    mode = requireOpMode();
    await backendCrypto.init();
    await openPaymentsService.init(mode);
  } catch (err: any) {
    console.error(`\n❌ RELEVO no puede arrancar: ${err?.message || err}\n`);
    process.exit(1);
  }

  const fastify = await buildServer({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`\n🚀 RELEVO backend on http://localhost:${config.port}`);
    console.log(`   MODE: ${MODE_LABEL[mode]}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
