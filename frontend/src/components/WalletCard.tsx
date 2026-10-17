import { Wallet, Copy, Check } from 'lucide-react'
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
  currency,
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
      ? `${walletAddress.slice(0, 16)}...${walletAddress.slice(-8)}`
      : walletAddress
    : null

  return (
    <div className={`p-5 rounded-3xl bg-white border border-[#EAE8EF] card-shadow ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6F6B76]">
          <Wallet className="w-4 h-4 text-[#5634A3]" aria-hidden="true" />
          <span>Billetera conectada</span>
        </div>
        {currency && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F0FBD9] text-[#177454]">
            {currency}
          </span>
        )}
      </div>

      {isConfigured && truncatedAddress ? (
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-sm font-mono text-[#17151D] truncate">
            {truncatedAddress}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-[#6F6B76] hover:text-[#260F61] hover:bg-[#F2ECFF] transition-colors"
            aria-label="Copiar dirección de wallet"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#177454]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm text-[#6F6B76]">
            Conecta tu billetera para saber qué moneda puedes recibir.
          </p>
          {onConfigure && (
            <button
              type="button"
              onClick={onConfigure}
              className="self-start text-xs font-semibold text-[#5634A3] hover:underline"
            >
              Configurar billetera →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
