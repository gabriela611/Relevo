import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'

interface ScannerModalProps {
  title: string
  subtitle?: string
  isOpen: boolean
  onClose: () => void
  onScan: (decodedText: string) => void
}

export function ScannerModal({
  title,
  subtitle,
  isOpen,
  onClose,
  onScan,
}: ScannerModalProps) {
  const [manualText, setManualText] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = 'relevo-qr-reader'

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (isMounted) {
            scanner.stop().catch(() => {})
            onScan(decodedText)
          }
        },
        () => {
          // ignore frame errors
        }
      )
      .catch((err) => {
        if (isMounted) {
          console.warn('Camera start error:', err)
          setCameraError('No se pudo acceder a la cámara. Puedes pegar el código abajo.')
        }
      })

    return () => {
      isMounted = false
      if (scanner.isScanning) {
        scanner.stop().catch(() => {})
      }
    }
  }, [isOpen, onScan])

  if (!isOpen) return null

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualText.trim()) {
      onScan(manualText.trim())
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-[#EAE8EF]">
          <div>
            <h2 className="text-lg font-bold text-[#17151D]">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[#6F6B76] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F2ECFF] text-[#17151D] transition-colors"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-[#17151D] min-h-[280px] flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full max-w-[320px]" />

          {cameraError && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-[#17151D]/90 text-white">
              <Camera className="w-10 h-10 text-[#CFFA86] mb-3" />
              <p className="text-sm font-medium">{cameraError}</p>
            </div>
          )}
        </div>

        {/* Alternate input for devices without camera access */}
        <div className="p-5 bg-[#F9F8FC] border-t border-[#EAE8EF] flex flex-col gap-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Si no puedes usar la cámara, pega aquí el código"
              className="flex-1 h-10 px-3 rounded-xl border border-[#EAE8EF] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#5634A3]"
            />
            <button
              type="submit"
              disabled={!manualText.trim()}
              className="px-4 h-10 rounded-xl bg-[#260F61] text-white text-xs font-semibold disabled:opacity-50 hover:bg-[#34177F] transition-colors shrink-0"
            >
              Leer
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
