import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from './config.js';
import { backendCrypto } from './services/cryptoService.js';
import { dbService } from './services/db.js';
import { openPaymentsService } from './services/openPayments.js';
import { PaymentSaleRequest, OfflineSyncRecord } from '@relevo/shared';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(sensible);

// 1. Healthcheck
fastify.get('/api/health', async () => {
  return {
    status: 'ok',
    project: 'RELEVO',
    timestamp: Date.now(),
    simulator: config.isSimulator,
  };
});

// 2. Public Configuration (provides backend master public key for offline verification caching)
fastify.get('/api/config', async () => {
  return {
    backendPublicKeyJwk: backendCrypto.getPublicKeyJwk(),
    defaultMerchant: {
      id: 'merchant-default',
      name: config.defaultMerchantName,
      walletAddress: config.defaultMerchantWallet,
    },
    simulator: config.isSimulator,
  };
});

// 3. Register / Upsert a Sale
fastify.post('/api/sales', async (req, reply) => {
  const sale = req.body as PaymentSaleRequest;
  if (!sale || !sale.saleId || !sale.amount || !sale.currency) {
    return reply.badRequest('Payload de venta inválido o incompleto.');
  }

  dbService.createSale(sale, 'WAITING_PAYMENT');
  return {
    success: true,
    sale: dbService.getSale(sale.saleId),
  };
});

// 4. Get Sale by ID
fastify.get('/api/sales/:saleId', async (req, reply) => {
  const { saleId } = req.params as { saleId: string };
  const sale = dbService.getSale(saleId);
  if (!sale) {
    return reply.notFound(`Venta con ID ${saleId} no encontrada.`);
  }
  const receipt = dbService.getReceiptBySaleId(saleId);
  return {
    sale,
    receipt,
  };
});

// 5. Resolve Wallet Address
fastify.post('/api/wallet/resolve', async (req, reply) => {
  const { walletAddress } = req.body as { walletAddress?: string };
  if (!walletAddress) {
    return reply.badRequest('walletAddress es requerido.');
  }
  try {
    const info = await openPaymentsService.resolveWalletAddress(walletAddress);
    return { success: true, wallet: info };
  } catch (err: any) {
    return reply.internalServerError(err.message || 'Error al resolver la billetera.');
  }
});

// 6. Generate Currency Quote
fastify.post('/api/payments/quote', async (req, reply) => {
  const { sale, payerWalletAddress } = req.body as {
    sale?: PaymentSaleRequest;
    payerWalletAddress?: string;
  };

  if (!sale || !payerWalletAddress) {
    return reply.badRequest('Se requieren los datos de la venta y la billetera del pagador.');
  }

  // Ensure sale is saved in DB if not already present
  dbService.createSale(sale);

  try {
    const quote = await openPaymentsService.calculateQuote({
      payerWalletAddress,
      sale,
    });
    return { success: true, quote };
  } catch (err: any) {
    return reply.internalServerError(err.message || 'Error al calcular la cotización.');
  }
});

// 7. Process Payment & strictly verify funds before issuing signed receipt
fastify.post('/api/payments/pay', async (req, reply) => {
  const { saleId, payerWalletAddress, quoteId } = req.body as {
    saleId?: string;
    payerWalletAddress?: string;
    quoteId?: string;
  };

  if (!saleId || !payerWalletAddress || !quoteId) {
    return reply.badRequest('saleId, payerWalletAddress y quoteId son obligatorios.');
  }

  const result = await openPaymentsService.processPayment({
    saleId,
    payerWalletAddress,
    quoteId,
  });

  if (!result.success) {
    return reply.badRequest(result.error || 'Fallo en la confirmación del pago.');
  }

  return {
    success: true,
    receipt: result.receipt,
  };
});

// 8. Get Receipt for Sale
fastify.get('/api/receipts/:saleId', async (req, reply) => {
  const { saleId } = req.params as { saleId: string };
  const receipt = dbService.getReceiptBySaleId(saleId);
  if (!receipt) {
    return reply.notFound(`No existe comprobante emitido para la venta ${saleId}.`);
  }
  return { receipt };
});

// 9. Batch Sync from Merchant Device (after coming back online)
fastify.post('/api/sync', async (req, reply) => {
  const records = req.body as OfflineSyncRecord[];
  if (!Array.isArray(records)) {
    return reply.badRequest('Se esperaba una lista de registros para sincronizar.');
  }

  let syncedCount = 0;
  for (const record of records) {
    if (record.saleRequest) {
      dbService.createSale(record.saleRequest, record.status);
    }
    if (record.verifiedReceipt) {
      dbService.saveReceipt(record.verifiedReceipt);
      dbService.updateSaleStatus(record.saleId, record.status);
      syncedCount++;
    }
  }

  return {
    success: true,
    syncedCount,
    totalReceived: records.length,
  };
});

// Bootstrap
async function start() {
  try {
    await backendCrypto.init();
    await openPaymentsService.init();

    // Initialize default merchant in DB
    dbService.upsertMerchant({
      id: 'merchant-default',
      name: config.defaultMerchantName,
      walletAddress: config.defaultMerchantWallet,
      publicKeyJwk: backendCrypto.getPublicKeyJwk(),
      createdAt: Date.now(),
    });

    await fastify.listen({ port: config.port, host: config.host });
    console.log(`🚀 RELEVO Backend server listening on http://localhost:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
