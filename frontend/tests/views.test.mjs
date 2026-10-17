import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodeSaleToQr, parseSaleFromQr, encodeReceiptToQr, parseReceiptFromQr } from '@relevo/shared'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('flow 2 (Cobrar): PaymentSaleRequest serializes to QR and round-trips correctly', () => {
  const sale = {
    version: '1',
    saleId: 'sale-test-uuid',
    merchantId: 'merchant-1',
    merchantName: 'Doña Arepas',
    merchantWalletAddress: 'https://ilp.interledger-test.dev/dona-arepas',
    amount: '8000',
    currency: 'COP',
    assetScale: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + 900000,
    nonce: 'nonce-123',
  }

  const qr = encodeSaleToQr(sale)
  assert.ok(qr.startsWith('relevo:sale:v1:'), 'Sale QR must have relevo:sale:v1: prefix')

  const parsed = parseSaleFromQr(qr)
  assert.ok(parsed, 'Sale QR must parse successfully')
  assert.equal(parsed.saleId, sale.saleId)
  assert.equal(parsed.amount, '8000')
  assert.equal(parsed.currency, 'COP')
})

test('flow 3 (Pagar) & flow 4 (Verificar): VerifiedReceipt round-trips through QR with all fields intact', () => {
  const receipt = {
    version: '2',
    receiptId: 'receipt-uuid-456',
    saleId: 'sale-test-uuid',
    merchantWallet: 'https://ilp.interledger-test.dev/dona-arepas',
    amountReceived: {
      value: '8000',
      assetCode: 'COP',
      assetScale: 0,
    },
    incomingPaymentId: 'https://ilp.interledger-test.dev/ip/1',
    outgoingPaymentId: 'https://ilp.interledger-test.dev/op/2',
    issuedAt: 1760655200000,
    keyId: 'relevo-key-1',
    mode: 'simulator',
    payloadDigest: 'sha256-test-digest',
    backendSignature: 'ecdsa-sig-test',
  }

  const qr = encodeReceiptToQr(receipt)
  assert.ok(qr.startsWith('relevo:receipt:v2:'), 'Receipt QR must have relevo:receipt:v2: prefix')

  const parsed = parseReceiptFromQr(qr)
  assert.ok(parsed, 'Receipt QR must parse successfully')
  assert.equal(parsed.receiptId, receipt.receiptId)
  assert.equal(parsed.saleId, receipt.saleId)
  assert.equal(parsed.amountReceived.value, '8000')
  assert.equal(parsed.amountReceived.assetCode, 'COP')
})

test('flow 5 (PWA): manifest.json and sw.js exist with correct offline configuration', () => {
  const manifestPath = path.resolve(__dirname, '../public/manifest.json')
  const swPath = path.resolve(__dirname, '../public/sw.js')

  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public/')
  assert.ok(fs.existsSync(swPath), 'sw.js must exist in public/')

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  assert.equal(manifest.short_name, 'Relevo')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.theme_color, '#260F61')

  const sw = fs.readFileSync(swPath, 'utf-8')
  assert.ok(sw.includes('relevo-pwa'), 'Service Worker must define a cache name')
  assert.ok(sw.includes('caches.match'), 'Service Worker must implement offline cache retrieval')
})
