import { Copy, Check, ShieldCheck, CreditCard } from 'lucide-react'
import { useState } from 'react'

interface WalletCardProps {
  walletAddress?: string
  currency?: string
  isConfigured: boolean
  onConfigure?: () => void
  className?: string
}

export function WalletCard({
  walletAddress,
  currency = 'COP',
  isConfigured,
  onConfigure,
  className = '',
}: WalletCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!walletAddress) return
    navigator.clipboard?.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const truncatedAddress = walletAddress
    ? walletAddress.length > 28
      ? `${walletAddress.slice(0, 14)}...${walletAddress.slice(-8)}`
      : walletAddress
    : null

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] p-6 text-white card-interactive bg-gradient-to-br from-[#260F61] via-[#38168A] to-[#150736] border border-white/10 shadow-lg ${className}`}
    >
      {/* Decorative ambient lighting (Apple / Fintech card style) */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#CFFA86]/15 blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#DFD2FF]/15 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Card Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-[#CFFA86]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">
            Billetera del comercio
          </span>
        </div>

        <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#CFFA86] text-[#260F61] shadow-sm">
          {currency}
        </span>
      </div>

      {/* Card Body */}
      <div className="relative z-10 flex flex-col gap-4">
        {isConfigured && truncatedAddress ? (
          <div>
            <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider block mb-1">
              Dirección conectada
            </span>
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-xs sm:text-sm font-mono text-white truncate">
                {truncatedAddress}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-90 text-white transition-all shrink-0"
                aria-label="Copiar dirección de wallet"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#CFFA86]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-2">
            <p className="text-xs text-white/80 leading-relaxed">
              Conecta tu dirección Open Payments para recibir pagos directos sin comisiones.
            </p>
            {onConfigure && (
              <button
                type="button"
                onClick={onConfigure}
                className="self-start text-xs font-bold text-[#CFFA86] hover:underline"
              >
                Configurar billetera →
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-white/70">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#CFFA86]" />
            <span>Fondos no custodiados</span>
          </div>
          <span className="font-semibold text-white/90">Autónomo</span>
        </div>
      </div>
    </div>
  )
}
