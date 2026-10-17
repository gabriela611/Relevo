import type {
  PaymentSaleRequest,
  VerifiedReceipt,
  OfflineSyncRecord,
  PinnedReceiptKey,
} from '@relevo/shared'

const SALES_KEY = 'relevo_device_sales'
const REDEEMED_KEY = 'relevo_redeemed_receipts'
const MERCHANT_KEY = 'relevo_merchant_profile'
const ONBOARDING_SEEN_KEY = 'relevo_onboarding_completed'
const SYNC_QUEUE_KEY = 'relevo_sync_queue'
const PINNED_KEY_STORE = 'relevo_pinned_backend_key'

const DB_NAME = 'relevo_offline_db'
const DB_VERSION = 1

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true'
  } catch {
    return false
  }
}

export function setOnboardingSeen(seen = true): void {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, String(seen))
  } catch (err) {
    console.warn('Failed to save onboarding state:', err)
  }
}

export interface StoredMerchant {
  name: string
  currency: string
  language?: 'es' | 'en'
  walletAddress?: string
  assetScale?: number
  createdAt?: number
}

export const defaultMerchant: StoredMerchant = {
  name: 'Doña Elena - Arepas',
  currency: 'USD',
  language: 'es',
  walletAddress: 'https://ilp.interledger-test.dev/relevo-merchant',
  assetScale: 2,
  createdAt: Date.now(),
}

// =============================================================================
// IndexedDB Engine (Native Browser IDB with safe fallback)
// =============================================================================

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

let dbInstancePromise: Promise<IDBDatabase | null> | null = null

function getDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return Promise.resolve(null)
  if (dbInstancePromise) return dbInstancePromise

  dbInstancePromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'saleId' })
        }
        if (!db.objectStoreNames.contains('receipts')) {
          db.createObjectStore('receipts', { keyPath: 'receiptId' })
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'saleId' })
        }
        if (!db.objectStoreNames.contains('merchant')) {
          db.createObjectStore('merchant', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = (err) => {
        console.warn('IndexedDB open error, continuing with localStorage:', err)
        resolve(null)
      }
    } catch (e) {
      console.warn('IndexedDB initialization failed:', e)
      resolve(null)
    }
  })

  return dbInstancePromise
}

export async function idbPut(storeName: string, item: unknown): Promise<void> {
  const db = await getDB()
  if (!db) return
  try {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(item)
  } catch (err) {
    console.warn(`IndexedDB put to ${storeName} failed:`, err)
  }
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB()
  if (!db) return []
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve((req.result as T[]) || [])
      req.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

async function idbClear(storeName: string): Promise<void> {
  const db = await getDB()
  if (!db) return
  try {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).clear()
  } catch (err) {
    console.warn(`IndexedDB clear ${storeName} failed:`, err)
  }
}

// =============================================================================
// Synchronous API (with automatic IndexedDB asynchronous backing)
// =============================================================================

export function getMerchantProfile(): StoredMerchant {
  try {
    const raw = localStorage.getItem(MERCHANT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultMerchant
}

export function saveMerchantProfile(profile: StoredMerchant): void {
  try {
    localStorage.setItem(MERCHANT_KEY, JSON.stringify(profile))
    void idbPut('merchant', { id: 'current', ...profile })
  } catch (err) {
    console.warn('Failed to save merchant profile:', err)
  }
}

export function saveSale(sale: PaymentSaleRequest): void {
  try {
    const sales = listSales()
    const updated = [sale, ...sales.filter((s) => s.saleId !== sale.saleId)]
    localStorage.setItem(SALES_KEY, JSON.stringify(updated))

    // Mirror to IndexedDB
    void idbPut('sales', sale)

    // Queue for sync if not already verified
    const syncItem: OfflineSyncRecord = {
      saleId: sale.saleId,
      status: 'WAITING_PAYMENT',
      saleRequest: sale,
      syncedWithBackend: false,
    }
    enqueueSyncRecord(syncItem)
  } catch (err) {
    console.warn('Failed to save sale:', err)
  }
}

export function getSale(saleId: string): PaymentSaleRequest | null {
  try {
    const sales = listSales()
    return sales.find((s) => s.saleId === saleId) ?? null
  } catch {
    return null
  }
}

export function listSales(): PaymentSaleRequest[] {
  try {
    const raw = localStorage.getItem(SALES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveRedeemedReceipt(receipt: VerifiedReceipt): void {
  try {
    const list = listRedeemedReceipts()
    const updated = [receipt, ...list.filter((r) => r.receiptId !== receipt.receiptId)]
    localStorage.setItem(REDEEMED_KEY, JSON.stringify(updated))

    // Mirror to IndexedDB
    void idbPut('receipts', receipt)

    // Update sale status in sync queue
    const matchingSale = getSale(receipt.saleId)
    const syncItem: OfflineSyncRecord = {
      saleId: receipt.saleId,
      receiptId: receipt.receiptId,
      status: 'OFFLINE_VERIFIED',
      saleRequest: matchingSale || {
        version: '2',
        saleId: receipt.saleId,
        merchantId: 'merchant-default',
        merchantName: 'Comercio Local',
        merchantWalletAddress: receipt.merchantWallet,
        amount: String(Number(receipt.amountReceived.value) / 10 ** receipt.amountReceived.assetScale),
        currency: receipt.amountReceived.assetCode,
        assetScale: receipt.amountReceived.assetScale,
        createdAt: receipt.issuedAt,
        expiresAt: receipt.issuedAt + 900_000,
        nonce: receipt.receiptId,
        merchantKeyId: 'k-default',
        merchantSignature: 's-default',
      },
      verifiedReceipt: receipt,
      verifiedAt: Date.now(),
      syncedWithBackend: false,
    }
    enqueueSyncRecord(syncItem)

    // Attempt sync if currently online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void flushSyncQueue()
    }
  } catch (err) {
    console.warn('Failed to save redeemed receipt:', err)
  }
}

export function isReceiptRedeemed(receiptId: string): boolean {
  try {
    const list = listRedeemedReceipts()
    return list.some((r) => r.receiptId === receiptId)
  } catch {
    return false
  }
}

export function listRedeemedReceipts(): VerifiedReceipt[] {
  try {
    const raw = localStorage.getItem(REDEEMED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getVerifiedTotalToday(): number {
  try {
    const receipts = listRedeemedReceipts()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayTs = startOfDay.getTime()

    return receipts
      .filter((r) => r.issuedAt >= todayTs)
      .reduce((sum, r) => sum + Number(r.amountReceived.value), 0)
  } catch {
    return 0
  }
}

// =============================================================================
// Offline Sync Queue & Reconciliation (POST /api/sync)
// =============================================================================

export function getPendingSyncRecords(): OfflineSyncRecord[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    const all: OfflineSyncRecord[] = raw ? JSON.parse(raw) : []
    return all.filter((r) => !r.syncedWithBackend)
  } catch {
    return []
  }
}

export function enqueueSyncRecord(record: OfflineSyncRecord): void {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    const list: OfflineSyncRecord[] = raw ? JSON.parse(raw) : []
    const updated = [record, ...list.filter((r) => r.saleId !== record.saleId)]
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated))
    void idbPut('sync_queue', record)
  } catch (err) {
    console.warn('Failed to enqueue sync record:', err)
  }
}

let syncInProgress = false
const syncListeners = new Set<(isSyncing: boolean) => void>()

export function onSyncStatusChange(cb: (isSyncing: boolean) => void): () => void {
  syncListeners.add(cb)
  return () => syncListeners.delete(cb)
}

function notifySyncStatus(isSyncing: boolean) {
  syncInProgress = isSyncing
  for (const cb of syncListeners) {
    try {
      cb(isSyncing)
    } catch {}
  }
}

export function isSyncing(): boolean {
  return syncInProgress
}

/**
 * Sends unsynced offline records to backend POST /api/sync.
 * Idempotent: safe to run multiple times.
 */
export async function flushSyncQueue(): Promise<{
  syncedCount: number
  rejectedCount: number
}> {
  if (syncInProgress) return { syncedCount: 0, rejectedCount: 0 }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { syncedCount: 0, rejectedCount: 0 }
  }

  const pending = getPendingSyncRecords()
  if (pending.length === 0) return { syncedCount: 0, rejectedCount: 0 }

  notifySyncStatus(true)
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    })

    if (!response.ok) {
      throw new Error(`Sync failed with status ${response.status}`)
    }

    const data = (await response.json()) as {
      success: boolean
      syncedCount: number
      rejected?: Array<{ saleId: string; reason: string }>
    }

    // Mark successfully synced records
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    const currentList: OfflineSyncRecord[] = raw ? JSON.parse(raw) : []
    const rejectedSaleIds = new Set(data.rejected?.map((r) => r.saleId) || [])

    const updated = currentList.map((rec) => {
      if (!rec.syncedWithBackend && !rejectedSaleIds.has(rec.saleId)) {
        return { ...rec, syncedWithBackend: true }
      }
      return rec
    })

    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated))
    for (const item of updated) {
      void idbPut('sync_queue', item)
    }

    return {
      syncedCount: data.syncedCount || 0,
      rejectedCount: data.rejected?.length || 0,
    }
  } catch (err) {
    console.warn('Sync queue flush error:', err)
    return { syncedCount: 0, rejectedCount: 0 }
  } finally {
    notifySyncStatus(false)
  }
}

// Automatic online event sync trigger
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushSyncQueue()
  })
}

// =============================================================================
// Security: Pinned Backend Key Storage
// =============================================================================

export function savePinnedBackendKey(key: PinnedReceiptKey): void {
  try {
    localStorage.setItem(PINNED_KEY_STORE, JSON.stringify(key))
  } catch (err) {
    console.warn('Failed to save pinned key:', err)
  }
}

export function getPinnedBackendKey(): PinnedReceiptKey | null {
  try {
    const raw = localStorage.getItem(PINNED_KEY_STORE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// =============================================================================
// Demo & Maintenance: Reset Local Data
// =============================================================================

export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(SALES_KEY)
    localStorage.removeItem(REDEEMED_KEY)
    localStorage.removeItem(SYNC_QUEUE_KEY)
    localStorage.removeItem(PINNED_KEY_STORE)
    void idbClear('sales')
    void idbClear('receipts')
    void idbClear('sync_queue')
  } catch (err) {
    console.warn('Failed to clear local data:', err)
  }
}
