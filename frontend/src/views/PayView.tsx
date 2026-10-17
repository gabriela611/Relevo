import { useState } from 'react'
import { ArrowLeft, ScanLine, ShieldCheck } from 'lucide-react'


import { PrimaryButton, StatusChip } from '../components'
import { parseSaleFromQr, type PaymentSaleRequest } from '@relevo/shared'
import { ScannerModal } from './ScannerModal'
import { formatAmountInput } from '../model'

interface PayViewProps {
  onBack: () => void
  onScanReceipt?: () => void
}

export function PayView({ onBack }: PayViewProps) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [sale, setSale] = useState<PaymentSaleRequest | null>(null)

  const handleScanCode = (text: string) => {
    const parsed = parseSaleFromQr(text)
    if (parsed) {
      setSale(parsed)
      setScannerOpen(false)
    } else {
      alert('El código QR escaneado no es una solicitud de cobro válida.')
    }
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
         <span className="text-sm font-bold text-[#17151D]">Pagar</span>
        <div className="w-5" />
      </div>

      {/* State 1: Scan Sale QR */}
      {!sale && (
        <div className="flex flex-col items-center text-center gap-6 py-6">
          <div className="w-20 h-20 rounded-full bg-[#DFD2FF] text-[#260F61] flex items-center justify-center shadow-inner">
            <ScanLine className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#17151D]">
              Escanea el QR del comercio
            </h1>
            <p className="text-xs text-[#6F6B76] mt-1.5 max-w-xs">
              Apunta la cámara al código mostrado por el vendedor. Verás el importe antes de confirmar.
            </p>
          </div>

          <PrimaryButton onClick={() => setScannerOpen(true)}>
            <ScanLine className="w-5 h-5 mr-1" />
            <span>Abrir Cámara</span>
          </PrimaryButton>

        </div>
      )}

      {/* State 2: Review the request before the wallet connection is available */}
      {sale && (
        <div className="flex flex-col gap-4 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-[#F0FBD9] border border-[#D5F5A3] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#177454] uppercase tracking-wider">
                Comercio
              </span>
              <h3 className="text-sm font-bold text-[#17151D]">{sale.merchantName}</h3>
            </div>
             <StatusChip label="Solicitud recibida" tone="neutral" />
          </div>

          {/* Multicurrency Card Breakdown (Reference Style) */}
          <div className="p-5 rounded-[24px] bg-white border border-[#EAE8EF] card-shadow flex flex-col gap-4">
            {/* Merchant Receives */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#6F6B76]">El comercio recibe:</span>
                <div className="text-xl font-bold text-[#17151D] tabular-nums">
                   {formatAmountInput(sale.amount)} {sale.currency}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#CFFA86] text-[#260F61] flex items-center justify-center font-bold text-xs">
                {sale.currency}
              </div>
            </div>

            <div className="rounded-xl bg-[#F9F8FC] border border-[#EAE8EF] p-3 text-sm text-[#6F6B76]">
              La conversión aparecerá aquí cuando la billetera confirme cuánto pagarás. No mostramos tasas aproximadas.
            </div>
          </div>

          <PrimaryButton
            disabled
          >
            <span className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-5 h-5" />
              <span>Conversión no disponible todavía</span>
            </span>
          </PrimaryButton>

          <button
            type="button"
            onClick={() => setSale(null)}
            className="text-xs font-semibold text-[#6F6B76] hover:text-[#17151D] text-center"
          >
            Cancelar y escanear otro código
          </button>
        </div>
      )}

      {/* Scanner Modal */}
      <ScannerModal
        title="Escanear cobro"
        subtitle="Apunta al código QR del comercio"
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanCode}
      />
    </div>
  )
}
