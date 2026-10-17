import test from 'node:test'
import assert from 'node:assert/strict'

// Mock browser localStorage for node test runner
class MockStorage {
  constructor() {
    this.store = new Map()
  }
  getItem(key) {
    return this.store.get(key) ?? null
  }
  setItem(key, value) {
    this.store.set(key, String(value))
  }
  removeItem(key) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

globalThis.localStorage = new MockStorage()

test('storage: saves sale and retrieves by id without mutating existing sales', async () => {
  const { saveSale, getSale, listSales } = await import('../src/storage.ts')

  const sale1 = {
    version: '2',
    saleId: 'sale-test-001',
    merchantId: 'm1',
    merchantName: 'Doña Elena',
    merchantWalletAddress: 'https://ilp.interledger-test.dev/elena',
    amount: '12.50',
    currency: 'USD',
    assetScale: 2,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    nonce: 'nonce-1',
    merchantKeyId: 'k1',
    merchantSignature: 's1',
  }

  saveSale(sale1)
  const retrieved = getSale('sale-test-001')
  assert.ok(retrieved)
  assert.equal(retrieved.amount, '12.50')
  assert.equal(retrieved.currency, 'USD')

  const list = listSales()
  assert.ok(list.some((s) => s.saleId === 'sale-test-001'))
})

test('storage: redeems receipt and detects double-spending', async () => {
  const { saveRedeemedReceipt, isReceiptRedeemed, listRedeemedReceipts } = await import('../src/storage.ts')

  const receipt = {
    version: '2',
    receiptId: 'rcpt-test-999',
    saleId: 'sale-test-001',
    merchantWallet: 'https://ilp.interledger-test.dev/elena',
    amountReceived: { value: '1250', assetCode: 'USD', assetScale: 2 },
    incomingPaymentId: 'https://ilp.interledger-test.dev/elena/ip/1',
    outgoingPaymentId: 'https://ilp.interledger-test.dev/turista/op/1',
    issuedAt: Date.now(),
    keyId: 'test-key-id',
    mode: 'simulator',
    payloadDigest: 'digest-test',
    backendSignature: 'sig-test',
  }

  assert.equal(isReceiptRedeemed('rcpt-test-999'), false)
  saveRedeemedReceipt(receipt)
  assert.equal(isReceiptRedeemed('rcpt-test-999'), true)

  const receipts = listRedeemedReceipts()
  assert.ok(receipts.some((r) => r.receiptId === 'rcpt-test-999'))
})

test('storage: syncQueue tracks un-synced offline records', async () => {
  const { getPendingSyncRecords, enqueueSyncRecord } = await import('../src/storage.ts')

  const record = {
    saleId: 'sale-offline-404',
    status: 'OFFLINE_VERIFIED',
    saleRequest: {
      version: '2',
      saleId: 'sale-offline-404',
      merchantId: 'm1',
      merchantName: 'Doña Elena',
      merchantWalletAddress: 'https://ilp.interledger-test.dev/elena',
      amount: '5.00',
      currency: 'USD',
      assetScale: 2,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      nonce: 'nonce-offline',
      merchantKeyId: 'k-off',
      merchantSignature: 's-off',
    },
    syncedWithBackend: false,
  }

  enqueueSyncRecord(record)
  const pending = getPendingSyncRecords()
  assert.ok(pending.some((p) => p.saleId === 'sale-offline-404'))
})

test('storage: clearAllLocalData resets offline state for demo restarts', async () => {
  const { clearAllLocalData, listSales, listRedeemedReceipts, getPendingSyncRecords } = await import('../src/storage.ts')

  clearAllLocalData()
  assert.equal(listSales().length, 0)
  assert.equal(listRedeemedReceipts().length, 0)
  assert.equal(getPendingSyncRecords().length, 0)
})
