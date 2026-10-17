import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, QrCode, ScanLine, X, Copy, Check } from 'lucide-react'
import { PrimaryButton, LimeButton, Numpad, StatusChip, AmountDisplay } from '../components'
import { editAmount, formatAmountInput } from '../model'
import { encodeSaleToQr, type PaymentSaleRequest } from '@relevo/shared'
import { getMerchantProfile, saveSale } from '../storage'

interface CollectViewProps {
  onBack: () => void
  onScanReceipt: (saleId?: string) => void
}

export function CollectView({ onBack, onScanReceipt }: CollectViewProps) {
  const [amount, setAmount] = useState('0')
  const [description, setDescription] = useState('Arepa con queso')
  const [activeSale, setActiveSale] = useState<PaymentSaleRequest | null>(null)
  const [saleQr, setSaleQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const merchant = getMerchantProfile()

  const handleNumpad = (key: string) => {
    setAmount((prev) => editAmount(prev, key))
  }

  const handleCreateSale = () => {
    const num = Number(amount)
    if (!num || num <= 0) return

    const sale: PaymentSaleRequest = {
      version: '2',
      saleId: crypto.randomUUID(),
      merchantId: 'merchant-relevo-1',
      merchantName: merchant.name,
      merchantWalletAddress: merchant.walletAddress,
      amount: amount,
      currency: merchant.currency,
      assetScale: merchant.assetScale,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      nonce: Math.random().toString(36).substring(2, 14),
      merchantKeyId: 'k-device-key',
      merchantSignature: 's-device-sig',
    }

    const qr = encodeSaleToQr(sale)
    saveSale(sale)
    setActiveSale(sale)
    setSaleQr(qr)

    // Optional haptic
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20)
    }
  }

  const handleCopyQr = () => {
    if (!saleQr) return
    navigator.clipboard?.writeText(saleQr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5 max-w-sm mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-[#F2ECFF] text-[#17151D] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-[#17151D]">Cobro en punto de venta</span>
        <div className="w-5" />
      </div>

      {/* Amount Display */}
      <div className="flex flex-col items-center py-2">
        <span className="text-xs uppercase tracking-wider text-[#6F6B76] font-semibold mb-1">
          Importe a cobrar
        </span>
        <AmountDisplay amount={formatAmountInput(amount)} currency={merchant.currency} animate />
        <div className="w-full mt-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿Qué vendiste? (ej. Arepa con queso)"
            className="w-full text-center text-xs text-[#17151D] bg-transparent border-b border-[#EAE8EF] pb-1 focus:outline-none focus:border-[#5634A3]"
          />
        </div>
      </div>

      {/* Soft Lavender Numpad */}
      <Numpad onKeyPress={handleNumpad} />

      {/* Action Button: Generar Cobro */}
      <PrimaryButton
        onClick={handleCreateSale}
        disabled={amount === '0' || amount === '0.'}
        className="mt-1"
      >
        <QrCode className="w-5 h-5 mr-1" />
        <span>Generar Cobro</span>
      </PrimaryButton>

      {/* Modal: QR de Venta en Pantalla Completa */}
      {activeSale && saleQr && (
        <div
          className="qr-modal fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cobro listo para compartir"
        >
          <div className="w-full max-w-sm bg-white rounded-[32px] p-6 flex flex-col items-center text-center relative card-shadow">
            <button
              type="button"
              onClick={() => setActiveSale(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F2ECFF] text-[#17151D] transition-colors"
              aria-label="Cerrar QR"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs uppercase font-bold tracking-wider text-[#5634A3] mb-1">
              {activeSale.merchantName}
            </span>
            <AmountDisplay amount={formatAmountInput(activeSale.amount)} currency={activeSale.currency} className="qr-amount" />
            <p className="text-xs text-[#6F6B76] mb-4">
              {description || 'Venta presencial'}
            </p>

            {/* High Contrast QR Code */}
            <div className="qr-panel p-4 bg-white rounded-2xl border border-[#EAE8EF] shadow-sm mb-4">
              <QRCodeSVG
                value={saleQr}
                size={230}
                level="M"
                includeMargin={true}
                fgColor="#17151D"
                bgColor="#FFFFFF"
              />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <StatusChip label="Esperando pago" tone="warning" />
              <button
                type="button"
                onClick={handleCopyQr}
                className="text-xs font-semibold text-[#5634A3] flex items-center gap-1 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#177454]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar QR'}</span>
              </button>
            </div>

            <p className="text-xs text-[#6F6B76] mb-5 max-w-[260px]">
              El cliente escanea este QR para pagar. Tú puedes mantenerte sin conexión.
            </p>

            {/* Next action: Escanear Comprobante */}
            <LimeButton
              onClick={() => {
                const sId = activeSale.saleId
                setActiveSale(null)
                onScanReceipt(sId)
              }}
              className="w-full"
            >
              <ScanLine className="w-5 h-5 mr-1" />
              <span>Escanear Comprobante</span>
            </LimeButton>
          </div>
        </div>
      )}
    </div>
  )
}
