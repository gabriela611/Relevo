import type { PaymentSaleRequest, VerifiedReceipt } from '@relevo/shared'

const SALES_KEY = 'relevo_device_sales'
const REDEEMED_KEY = 'relevo_redeemed_receipts'
const MERCHANT_KEY = 'relevo_merchant_profile'


export interface StoredMerchant {
  name: string
  walletAddress: string
  currency: string
  assetScale: number
}

export const defaultMerchant: StoredMerchant = {
  name: 'Doña Arepas',
  walletAddress: '',
  currency: 'COP',
  assetScale: 0,
}

export function getMerchantProfile(): StoredMerchant {
  try {
    const raw = localStorage.getItem(MERCHANT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return defaultMerchant
}

export function saveMerchantProfile(profile: StoredMerchant): void {
  localStorage.setItem(MERCHANT_KEY, JSON.stringify(profile))
}

export function saveSale(sale: PaymentSaleRequest): void {
  try {
    const sales = listSales()
    const updated = [sale, ...sales.filter((s) => s.saleId !== sale.saleId)]
    localStorage.setItem(SALES_KEY, JSON.stringify(updated))
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
