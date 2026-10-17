import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Copy, Check, ScanLine, ShieldCheck } from 'lucide-react'
import { encodeSaleToQr, type PaymentSaleRequest, type VerifiedReceipt } from '@relevo/shared'
import { AmountDisplay } from './AmountDisplay'
import { StatusChip } from './StatusChip'
import { LimeButton } from './Buttons'
import { formatAmountInput, formatMinorUnits } from '../model'

interface TransactionDetailModalProps {
  sale?: PaymentSaleRequest | null
  receipt?: VerifiedReceipt | null
  isOpen: boolean
  onClose: () => void
  onScanReceipt?: (saleId: string) => void
}

export function TransactionDetailModal({
  sale,
  receipt,
  isOpen,
  onClose,
  onScanReceipt,
}: TransactionDetailModalProps) {
  const [copied, setCopied] = useState(false)
  const [now] = useState(() => Date.now())

  if (!isOpen || (!sale && !receipt)) return null

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (sale) {
    const saleQr = encodeSaleToQr(sale)
    const isExpired = now > sale.expiresAt

    return (
      <div
        className="qr-modal fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del cobro"
      >
        <div className="w-full max-w-sm bg-white rounded-[32px] p-6 flex flex-col items-center text-center relative card-shadow max-h-[90vh] overflow-y-auto">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F2ECFF] text-[#17151D] transition-colors"
            aria-label="Cerrar detalle"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-xs uppercase font-bold tracking-wider text-[#5634A3] mb-1">
            {sale.merchantName || 'Cobro generado'}
          </span>

          <AmountDisplay
            amount={formatAmountInput(sale.amount)}
            currency={sale.currency}
            className="qr-amount"
          />

          <div className="flex items-center gap-2 mt-2 mb-4">
            <StatusChip
              label={isExpired ? 'Cobro vencido' : 'Esperando pago'}
              tone={isExpired ? 'neutral' : 'warning'}
            />
            <button
              type="button"
              onClick={() => handleCopyText(saleQr)}
              className="text-xs font-semibold text-[#5634A3] flex items-center gap-1 hover:underline ml-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#177454]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar QR'}</span>
            </button>
          </div>

          {/* QR Code */}
          <div className="qr-panel p-4 bg-white rounded-2xl border border-[#EAE8EF] shadow-sm mb-4">
            <QRCodeSVG
              value={saleQr}
              size={210}
              level="M"
              includeMargin={true}
              fgColor="#17151D"
              bgColor="#FFFFFF"
            />
          </div>

          <div className="w-full bg-[#F9F8FC] rounded-2xl p-3 mb-4 text-left text-xs text-[#6F6B76] flex flex-col gap-1.5 border border-[#EAE8EF]">
            <div className="flex justify-between items-center">
              <span>ID de cobro:</span>
              <span className="font-mono text-[#17151D] font-medium">{sale.saleId.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Creado:</span>
              <span className="text-[#17151D] font-medium">
                {new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Vence:</span>
              <span className="text-[#17151D] font-medium">
                {new Date(sale.expiresAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {onScanReceipt && !isExpired && (
            <LimeButton
              onClick={() => {
                onClose()
                onScanReceipt(sale.saleId)
              }}
              className="w-full"
            >
              <ScanLine className="w-5 h-5 mr-1" />
              <span>Escanear Comprobante</span>
            </LimeButton>
          )}
        </div>
      </div>
    )
  }

  if (receipt) {
    const formattedAmount = formatMinorUnits(receipt.amountReceived.value, receipt.amountReceived.assetScale)

    return (
      <div
        className="qr-modal fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del comprobante"
      >
        <div className="w-full max-w-sm bg-white rounded-[32px] p-6 flex flex-col items-center text-center relative card-shadow max-h-[90vh] overflow-y-auto">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F2ECFF] text-[#17151D] transition-colors"
            aria-label="Cerrar comprobante"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-full bg-[#F0FBD9] text-[#177454] flex items-center justify-center mb-2 mt-1">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <span className="text-xs uppercase font-bold tracking-wider text-[#177454] mb-1">
            Pago verificado offline
          </span>

          <AmountDisplay
            amount={formattedAmount}
            currency={receipt.amountReceived.assetCode}
            className="qr-amount"
          />

          <div className="flex items-center gap-2 mt-2 mb-5">
            <StatusChip label="Comprobante válido" tone="success" />
            <button
              type="button"
              onClick={() => handleCopyText(receipt.receiptId)}
              className="text-xs font-semibold text-[#5634A3] flex items-center gap-1 hover:underline ml-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#177454]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar ID'}</span>
            </button>
          </div>

          <div className="w-full bg-[#F9F8FC] rounded-2xl p-4 mb-4 text-left text-xs text-[#6F6B76] flex flex-col gap-2 border border-[#EAE8EF]">
            <div className="flex justify-between items-center">
              <span>Venta:</span>
              <span className="font-mono text-[#17151D] font-medium">#{receipt.saleId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>ID Comprobante:</span>
              <span className="font-mono text-[#17151D] font-medium truncate max-w-[170px]" title={receipt.receiptId}>
                {receipt.receiptId.slice(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Billetera destino:</span>
              <span className="font-mono text-[#17151D] font-medium truncate max-w-[170px]" title={receipt.merchantWallet}>
                {receipt.merchantWallet}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Hora de emisión:</span>
              <span className="text-[#17151D] font-medium">
                {new Date(receipt.issuedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Entorno:</span>
              <span className="text-[#17151D] font-medium capitalize">
                {receipt.mode === 'simulator' ? 'Simulador demo' : 'Red Open Payments'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#F2ECFF] text-[#5634A3] hover:bg-[#DFD2FF] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return null
}
