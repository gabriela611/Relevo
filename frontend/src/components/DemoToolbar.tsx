import { useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Wifi,
  WifiOff,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react'
import { encodeReceiptToQr, type VerifiedReceipt, type PaymentSaleRequest } from '@relevo/shared'
import {
  saveSale,
  saveRedeemedReceipt,
  clearAllLocalData,
  listSales,
  getMerchantProfile,
} from '../storage'

interface DemoToolbarProps {
  onScanReceipt?: (receiptQr: string) => void
  onSimulateOffline?: (isOffline: boolean) => void
  isSimulatedOffline?: boolean
}

export function DemoToolbar({
  onScanReceipt,
  onSimulateOffline,
  isSimulatedOffline = false,
}: DemoToolbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setLastActionMessage(msg)
    setTimeout(() => setLastActionMessage(null), 3000)
  }

  const getOrCreateActiveSale = (): PaymentSaleRequest => {
    const existing = listSales()
    if (existing.length > 0) return existing[0]

    const merchant = getMerchantProfile()
    const newSale: PaymentSaleRequest = {
      version: '2',
      saleId: `sale-demo-${Date.now().toString(36)}`,
      merchantId: 'merchant-default',
      merchantName: merchant.name || 'Doña Elena - Arepas',
      merchantWalletAddress: merchant.walletAddress || 'https://ilp.interledger-test.dev/relevo-merchant',
      amount: '10.00',
      currency: merchant.currency || 'USD',
      assetScale: 2,
      createdAt: Date.now(),
      expiresAt: Date.now() + 900_000,
      nonce: `nonce-${Date.now()}`,
      merchantKeyId: 'k-demo',
      merchantSignature: 's-demo',
    }
    saveSale(newSale)
    return newSale
  }

  // Helper to generate a valid test receipt
  const generateTestReceipt = (overrides: Partial<VerifiedReceipt> = {}): VerifiedReceipt => {
    const sale = getOrCreateActiveSale()
    return {
      version: '2',
      receiptId: `rcpt-demo-${Date.now().toString(36)}`,
      saleId: sale.saleId,
      merchantWallet: sale.merchantWalletAddress,
      amountReceived: {
        value: String(Math.round(parseFloat(sale.amount) * 100)),
        assetCode: sale.currency,
        assetScale: sale.assetScale,
      },
      incomingPaymentId: `${sale.merchantWalletAddress}/incoming-payments/ip-demo`,
      outgoingPaymentId: 'https://ilp.interledger-test.dev/alex-turista/outgoing-payments/op-demo',
      issuedAt: Date.now(),
      keyId: 'demo-key-thumbprint-v2',
      mode: 'simulator',
      payloadDigest: 'sha256-verified-digest-demo',
      backendSignature: 'ecdsa-valid-signature-demo-placeholder',
      ...overrides,
    }
  }

  const handleSimulateValidReceipt = () => {
    const receipt = generateTestReceipt()
    const qr = encodeReceiptToQr(receipt)
    if (onScanReceipt) {
      onScanReceipt(qr)
    } else {
      window.location.hash = 'verificar'
    }
    showNotification('Recibo válido generado')
  }

  const handleSimulateTamperedReceipt = () => {
    // Tamper the amount by 1 cent
    const sale = getOrCreateActiveSale()
    const tamperedValue = String(Math.round(parseFloat(sale.amount) * 100) + 1)
    const receipt = generateTestReceipt({
      amountReceived: {
        value: tamperedValue,
        assetCode: sale.currency,
        assetScale: sale.assetScale,
      },
      backendSignature: 'tampered-signature-invalid',
    })
    const qr = encodeReceiptToQr(receipt)
    if (onScanReceipt) {
      onScanReceipt(qr)
    } else {
      window.location.hash = 'verificar'
    }
    showNotification('Alerta: Recibo adulterado (+1¢)')
  }

  const handleSimulateReplayAttack = () => {
    // Generate receipt and mark it as already redeemed
    const receipt = generateTestReceipt({ receiptId: 'rcpt-replay-attack-001' })
    saveRedeemedReceipt(receipt)

    // Try to scan it again
    const qr = encodeReceiptToQr(receipt)
    if (onScanReceipt) {
      onScanReceipt(qr)
    } else {
      window.location.hash = 'verificar'
    }
    showNotification('Alerta: Intento de recibo ya canjeado')
  }

  const handleResetDemo = () => {
    if (window.confirm('¿Reiniciar todos los datos locales para iniciar una nueva demo?')) {
      clearAllLocalData()
      window.location.hash = 'inicio'
      window.location.reload()
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end print:hidden">
      {/* Toast message */}
      {lastActionMessage && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#17151D] text-white text-xs font-semibold shadow-lg animate-fade-in">
          {lastActionMessage}
        </div>
      )}

      {/* Expanded panel */}
      {isOpen && (
        <div className="mb-2 w-72 rounded-2xl bg-white/95 backdrop-blur-md border border-[#EBE7DF] shadow-2xl p-3.5 flex flex-col gap-2 animate-scale-up">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE1]">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#17151D] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#84CC16]" />
              <span>Simulador Demo Jueces</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F3F0E6] text-[#6F6B76] font-mono">
              Person 3
            </span>
          </div>

          <div className="flex flex-col gap-1.5 text-xs">
            {/* Action 1: Valid receipt */}
            <button
              type="button"
              onClick={handleSimulateValidReceipt}
              className="flex items-center gap-2.5 p-2 rounded-xl text-left font-medium text-[#0F382A] bg-[#CFFA86]/25 hover:bg-[#CFFA86]/40 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#155D42] shrink-0" />
              <div>
                <span className="font-bold block">Simular Pago Válido</span>
                <span className="text-[10px] text-[#6F6B76]">Crea recibo y verifica en pantalla</span>
              </div>
            </button>

            {/* Action 2: Tampered receipt */}
            <button
              type="button"
              onClick={handleSimulateTamperedReceipt}
              className="flex items-center gap-2.5 p-2 rounded-xl text-left font-medium text-[#7A1E1E] bg-[#FEE2E2] hover:bg-[#FECACA] transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0" />
              <div>
                <span className="font-bold block">Simular Fraude (Adulterado)</span>
                <span className="text-[10px] text-[#991B1B]">Altera 1 centavo y dispara error</span>
              </div>
            </button>

            {/* Action 3: Replay attack */}
            <button
              type="button"
              onClick={handleSimulateReplayAttack}
              className="flex items-center gap-2.5 p-2 rounded-xl text-left font-medium text-[#78350F] bg-[#FEF3C7] hover:bg-[#FDE68A] transition-colors"
            >
              <Layers className="w-4 h-4 text-[#D97706] shrink-0" />
              <div>
                <span className="font-bold block">Simular Replay Attack</span>
                <span className="text-[10px] text-[#92400E]">Prueba rechazo de recibo duplicado</span>
              </div>
            </button>

            {/* Action 4: Toggle Simulated Offline */}
            {onSimulateOffline && (
              <button
                type="button"
                onClick={() => onSimulateOffline(!isSimulatedOffline)}
                className="flex items-center gap-2.5 p-2 rounded-xl text-left font-medium text-[#1E293B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
              >
                {isSimulatedOffline ? (
                  <WifiOff className="w-4 h-4 text-[#EA580C] shrink-0" />
                ) : (
                  <Wifi className="w-4 h-4 text-[#059669] shrink-0" />
                )}
                <div>
                  <span className="font-bold block">
                    {isSimulatedOffline ? 'Restaurar Conexión' : 'Forzar Modo Avión'}
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    {isSimulatedOffline ? 'Modo sin red activo' : 'Simula pérdida de datos'}
                  </span>
                </div>
              </button>
            )}

            {/* Action 5: Reset all data */}
            <button
              type="button"
              onClick={handleResetDemo}
              className="flex items-center gap-2.5 p-2 rounded-xl text-left font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors border-t border-[#F2ECE1] mt-1 pt-2"
            >
              <RotateCcw className="w-4 h-4 text-[#94A3B8] shrink-0" />
              <div>
                <span className="font-bold block">Reiniciar Datos Demo</span>
                <span className="text-[10px] text-[#94A3B8]">Limpia IndexedDB y reinicia</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Floating Pill Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#17151D] text-white shadow-xl hover:bg-[#2A2733] transition-all text-xs font-bold"
        aria-label="Abrir panel de simulación de demo"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#CFFA86]" />
        <span>Demo Jueces</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
