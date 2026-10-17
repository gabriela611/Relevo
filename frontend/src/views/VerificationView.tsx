import { useState } from 'react'
import { ArrowLeft, CheckCircle2, ShieldCheck, XCircle, RotateCcw, Home, QrCode } from 'lucide-react'
import { PrimaryButton, LimeButton } from '../components'
import { parseReceiptFromQr, type VerifiedReceipt } from '@relevo/shared'
import { isReceiptRedeemed, saveRedeemedReceipt } from '../storage'
import { ScannerModal } from './ScannerModal'


interface VerificationViewProps {
  saleId?: string
  onBack: () => void
  onNewSale: () => void
  onHome: () => void
}

export function VerificationView({
  saleId,
  onBack,
  onNewSale,
  onHome,
}: VerificationViewProps) {
  const [scannerOpen, setScannerOpen] = useState(!saleId ? true : true)
  const [verifiedReceipt, setVerifiedReceipt] = useState<VerifiedReceipt | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleScanReceipt = (text: string) => {
    const parsed = parseReceiptFromQr(text)

    if (!parsed) {
      setErrorMessage('El código escaneado no es un comprobante RELEVO válido.')
      setScannerOpen(false)
      return
    }

    // Check anti-replay
    if (isReceiptRedeemed(parsed.receiptId)) {
      setErrorMessage('Este comprobante ya fue utilizado anteriormente.')
      setScannerOpen(false)
      return
    }

    // Check sale match if provided
    if (saleId && parsed.saleId !== saleId) {
      setErrorMessage(`El comprobante corresponde a otra venta (ID: ${parsed.saleId.slice(0, 8)}...).`)
      setScannerOpen(false)
      return
    }

    // Valid offline receipt
    saveRedeemedReceipt(parsed)
    setVerifiedReceipt(parsed)
    setErrorMessage(null)
    setScannerOpen(false)

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 100, 30])
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
        <span className="text-sm font-bold text-[#17151D]">Verificación de Recibo</span>
        <div className="w-5" />
      </div>

      {/* Case 1: Scanning prompt */}
      {!verifiedReceipt && !errorMessage && (
        <div className="flex flex-col items-center text-center gap-6 py-6">
          <div className="w-20 h-20 rounded-full bg-[#F0FBD9] text-[#177454] flex items-center justify-center">
            <QrCode className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#17151D]">
              Escanear comprobante
            </h1>
            <p className="text-xs text-[#6F6B76] mt-1.5 max-w-xs">
              Apunta la cámara al código QR que te muestra el comprador para verificar la firma sin internet.
            </p>
          </div>

          <PrimaryButton onClick={() => setScannerOpen(true)}>
            <QrCode className="w-5 h-5 mr-1" />
            <span>Abrir Lector de Comprobante</span>
          </PrimaryButton>
        </div>
      )}

      {/* Case 2: Success Verification Screen (Giant green badge) */}
      {verifiedReceipt && (
        <div className="flex flex-col items-center text-center gap-5 py-2 animate-in zoom-in-95">
          {/* Giant Green Badge */}
          <div className="w-24 h-24 rounded-full bg-[#F0FBD9] border-4 border-[#CFFA86] text-[#177454] flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-14 h-14" />
          </div>

          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#CFFA86] text-[#260F61] text-xs font-black uppercase tracking-wider mb-2">
              Pago Verificado Offline
            </span>
            <h1 className="text-3xl font-black text-[#17151D] tabular-nums">
              {verifiedReceipt.amountReceived.value} {verifiedReceipt.amountReceived.assetCode}
            </h1>
            <p className="text-xs text-[#6F6B76] mt-1">
              Firma criptográfica verificada sin conexión a internet.
            </p>
          </div>

          {/* Details Card */}
          <div className="w-full p-4 rounded-2xl bg-white border border-[#EAE8EF] text-left text-xs flex flex-col gap-2.5 card-shadow">
            <div className="flex justify-between items-center pb-2 border-b border-[#EAE8EF]">
              <span className="text-[#6F6B76]">ID de Venta:</span>
              <span className="font-mono font-semibold text-[#17151D] truncate max-w-[170px]">
                {verifiedReceipt.saleId}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-[#EAE8EF]">
              <span className="text-[#6F6B76]">Destinatario:</span>
              <span className="font-semibold text-[#17151D] truncate max-w-[170px]">
                {verifiedReceipt.merchantWallet}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-[#EAE8EF]">
              <span className="text-[#6F6B76]">Sello Criptográfico:</span>
              <span className="font-semibold text-[#177454] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ECDSA P-256 Válido</span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#6F6B76]">Modo:</span>
              <span className="font-bold text-[#5634A3] uppercase">
                {verifiedReceipt.mode}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-2.5 mt-2">
            <LimeButton onClick={onNewSale}>
              <RotateCcw className="w-5 h-5 mr-1" />
              <span>Iniciar Nueva Venta</span>
            </LimeButton>

            <button
              type="button"
              onClick={onHome}
              className="w-full py-3 rounded-full border border-[#EAE8EF] text-xs font-semibold text-[#17151D] hover:bg-[#F2ECFF] transition-colors flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span>Volver al Inicio</span>
            </button>
          </div>
        </div>
      )}

      {/* Case 3: Error / Invalid Receipt */}
      {errorMessage && (
        <div className="flex flex-col items-center text-center gap-5 py-4 animate-in fade-in">
          <div className="w-20 h-20 rounded-full bg-[#FDF2F4] text-[#C73E55] flex items-center justify-center">
            <XCircle className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#C73E55]">
              No se pudo validar el comprobante
            </h2>
            <p className="text-xs text-[#6F6B76] mt-1.5 max-w-xs">
              {errorMessage}
            </p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <PrimaryButton onClick={() => setScannerOpen(true)}>
              Volver a escanear
            </PrimaryButton>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-[#6F6B76] hover:text-[#17151D] py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      <ScannerModal
        title="Validar Comprobante"
        subtitle="Apunta al QR mostrado por el comprador"
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanReceipt}
      />
    </div>
  )
}
