import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { OpenPaymentsClientError } from '@interledger/open-payments';
import { PaymentSaleRequest, OfflineSyncRecord } from '@relevo/shared';
import { config, MODE_LABEL } from './config.js';
import { backendCrypto } from './services/cryptoService.js';
import { dbService } from './services/db.js';
import { openPaymentsService, PaymentFlowError } from './services/openPayments.js';
import { isValidDecimalAmount } from '@relevo/shared';

/** Validates the sale fields the backend relies on and fills harmless defaults. */
function normalizeSale(input: unknown): PaymentSaleRequest | string {
  const s = (input ?? {}) as Partial<PaymentSaleRequest>;
  if (!s.saleId || typeof s.saleId !== 'string') return 'saleId es requerido.';
  if (!s.merchantWalletAddress) return 'merchantWalletAddress es requerido.';
  if (!s.amount || !isValidDecimalAmount(String(s.amount))) return 'amount debe ser un decimal positivo, ej. "15.00".';
  if (!s.currency || !/^[A-Za-z]{3}$/.test(s.currency)) return 'currency debe ser un código ISO de 3 letras.';
  const assetScale = s.assetScale ?? 2;
  if (!Number.isInteger(assetScale) || assetScale < 0 || assetScale > 9) return 'assetScale inválido.';
  const now = Date.now();
  return {
    version: '1',
    saleId: s.saleId,
    merchantId: s.merchantId || 'merchant-default',
    merchantName: s.merchantName || config.defaultMerchantName,
    merchantWalletAddress: s.merchantWalletAddress,
    amount: String(s.amount),
    currency: s.currency.toUpperCase(),
    assetScale,
    createdAt: s.createdAt ?? now,
    expiresAt: s.expiresAt ?? now + 30 * 60 * 1000,
    nonce: s.nonce || crypto.randomUUID(),
    merchantSignature: s.merchantSignature,
  };
}

export async function buildServer(opts: FastifyServerOptions = {}) {
  const fastify = Fastify(opts);

  await fastify.register(cors, { origin: true, credentials: true });
  await fastify.register(sensible);

  fastify.setErrorHandler((err, _req, reply) => {
    if (err instanceof PaymentFlowError) {
      return reply.status(err.statusCode).send({ success: false, error: err.message });
    }
    if (err instanceof OpenPaymentsClientError) {
      fastify.log.error({ status: err.status, description: err.description, validationErrors: err.validationErrors }, 'Open Payments error');
      return reply.status(502).send({ success: false, error: `Open Payments: ${err.description}` });
    }
    const e = err as { statusCode?: number; message?: string };
    const status = e.statusCode ?? 500;
    if (status >= 500) fastify.log.error(err);
    return reply.status(status).send({ success: false, error: e.message ?? 'Error interno.' });
  });

  // 1. Healthcheck
  fastify.get('/api/health', async () => ({
    status: 'ok',
    project: 'RELEVO',
    timestamp: Date.now(),
    mode: openPaymentsService.mode,
    modeLabel: MODE_LABEL[openPaymentsService.mode],
  }));

  // 2a. Receipt-signing public key. The merchant device pins it while online and
  //     verifies receipts offline against it. keyId = RFC 7638 thumbprint.
  fastify.get('/api/receipt-key', async () => backendCrypto.getReceiptKeyInfo());

  // 2b. Public configuration
  fastify.get('/api/config', async () => ({
    receiptKey: backendCrypto.getReceiptKeyInfo(),
    defaultMerchant: {
      id: 'merchant-default',
      name: config.defaultMerchantName,
      walletAddress: config.defaultMerchantWallet,
    },
    mode: openPaymentsService.mode,
    modeLabel: MODE_LABEL[openPaymentsService.mode],
  }));

  // 3. Register a sale (idempotent on saleId)
  fastify.post('/api/sales', async (req, reply) => {
    const sale = normalizeSale(req.body);
    if (typeof sale === 'string') return reply.badRequest(sale);
    dbService.createSale(sale, 'WAITING_PAYMENT');
    return { success: true, sale: dbService.getSale(sale.saleId) };
  });

  // 4. List recent sales (merchant dashboard)
  fastify.get('/api/sales', async () => ({ sales: dbService.listAllSales() }));

  // 5. Get sale + receipt (frontend polls this for status)
  fastify.get('/api/sales/:saleId', async (req, reply) => {
    const { saleId } = req.params as { saleId: string };
    const sale = dbService.getSale(saleId);
    if (!sale) return reply.notFound(`Venta con ID ${saleId} no encontrada.`);
    return { sale, receipt: dbService.getReceiptBySaleId(saleId) };
  });

  // 6. Resolve wallet address (shows payer currency before quoting)
  fastify.post('/api/wallet/resolve', async (req, reply) => {
    const { walletAddress } = (req.body ?? {}) as { walletAddress?: string };
    if (!walletAddress) return reply.badRequest('walletAddress es requerido.');
    const wallet = await openPaymentsService.resolveWalletAddress(walletAddress);
    return { success: true, wallet };
  });

  // 7. Quote: incoming payment on merchant + fixed-receive quote on payer
  fastify.post('/api/payments/quote', async (req, reply) => {
    const { sale: rawSale, payerWalletAddress } = (req.body ?? {}) as { sale?: unknown; payerWalletAddress?: string };
    if (!payerWalletAddress) return reply.badRequest('payerWalletAddress es requerido.');
    const sale = normalizeSale(rawSale);
    if (typeof sale === 'string') return reply.badRequest(sale);

    dbService.createSale(sale);
    const quote = await openPaymentsService.createQuote({ sale, payerWalletAddress });
    return { success: true, quote };
  });

  // 8. Authorize: start interactive GNAP grant; frontend redirects the payer to redirectUrl
  fastify.post('/api/payments/authorize', async (req, reply) => {
    const { quoteId } = (req.body ?? {}) as { quoteId?: string };
    if (!quoteId) return reply.badRequest('quoteId es requerido.');
    // Either { requoted: false, paymentId, redirectUrl } or, if the quote was about to
    // expire, { requoted: true, quote } with a new quoteId to show and authorize again.
    return { success: true, ...(await openPaymentsService.authorize(quoteId)) };
  });

  // 9. GNAP finish redirect target: completes the payment and sends the browser back to the PWA
  fastify.get('/api/payments/callback', async (req, reply) => {
    const q = req.query as { paymentId?: string; interact_ref?: string; hash?: string; result?: string };
    const target = new URL(config.frontendUrl);
    try {
      if (!q.paymentId) throw new PaymentFlowError(400, 'paymentId faltante.');
      const outcome = await openPaymentsService.handleCallback({
        paymentId: q.paymentId,
        interactRef: q.interact_ref,
        hash: q.hash,
        result: q.result,
      });
      target.searchParams.set('saleId', outcome.saleId);
      target.searchParams.set('payment', outcome.result);
      if (outcome.reason) target.searchParams.set('reason', outcome.reason);
      if (outcome.error) target.searchParams.set('error', outcome.error);
    } catch (err: any) {
      fastify.log.error(err);
      target.searchParams.set('payment', 'failed');
      target.searchParams.set('reason', err instanceof PaymentFlowError && err.statusCode === 404 ? 'UNKNOWN_PAYMENT' : 'INTERNAL_ERROR');
      target.searchParams.set('error', err?.description || err?.message || 'Error en el pago.');
    }
    if (q.paymentId) target.searchParams.set('paymentId', q.paymentId);
    return reply.redirect(target.toString(), 302);
  });

  // 10. Payment attempt status
  fastify.get('/api/payments/:paymentId', async (req) => {
    const { paymentId } = req.params as { paymentId: string };
    return openPaymentsService.getPaymentStatus(paymentId);
  });

  // 11. Re-check funds and issue receipt (when callback returned "pending")
  fastify.post('/api/payments/verify', async (req, reply) => {
    const { saleId } = (req.body ?? {}) as { saleId?: string };
    if (!saleId) return reply.badRequest('saleId es requerido.');
    const result = await openPaymentsService.verifyPayment(saleId, 5000);
    return { success: result.status === 'PAYMENT_VERIFIED', ...result };
  });

  // 12. Get receipt for a sale
  fastify.get('/api/receipts/:saleId', async (req, reply) => {
    const { saleId } = req.params as { saleId: string };
    const receipt = dbService.getReceiptBySaleId(saleId);
    if (!receipt) return reply.notFound(`No existe comprobante emitido para la venta ${saleId}.`);
    return { receipt };
  });

  // 13. Batch sync from merchant device after coming back online (idempotent)
  fastify.post('/api/sync', async (req, reply) => {
    const records = req.body as OfflineSyncRecord[];
    if (!Array.isArray(records)) return reply.badRequest('Se esperaba una lista de registros para sincronizar.');

    let syncedCount = 0;
    const rejected: Array<{ saleId: string; reason: string }> = [];
    for (const record of records) {
      if (record.saleRequest) {
        const sale = normalizeSale(record.saleRequest);
        if (typeof sale !== 'string') dbService.createSale(sale, 'WAITING_PAYMENT');
      }
      if (record.verifiedReceipt) {
        // Never trust a receipt from a device: it must be a v2 receipt with our own valid signature.
        if (!(await backendCrypto.isAuthenticReceipt(record.verifiedReceipt))) {
          rejected.push({ saleId: record.saleId, reason: 'INVALID_SIGNATURE' });
          continue;
        }
        if (record.verifiedReceipt.mode !== openPaymentsService.mode) {
          rejected.push({ saleId: record.saleId, reason: 'MODE_MISMATCH' });
          continue;
        }
        dbService.saveReceipt(record.verifiedReceipt);
        if (record.status === 'OFFLINE_VERIFIED') {
          dbService.updateSaleStatus(record.verifiedReceipt.saleId, 'OFFLINE_VERIFIED');
        }
        syncedCount++;
      }
    }

    return { success: true, syncedCount, totalReceived: records.length, rejected };
  });

  return fastify;
}
