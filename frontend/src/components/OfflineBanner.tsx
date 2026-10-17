import { WifiOff, ShieldCheck } from 'lucide-react'

interface OfflineBannerProps {
  isOffline: boolean
  isReady?: boolean
  className?: string
}

export function OfflineBanner({ isOffline, isReady = false, className = '' }: OfflineBannerProps) {
  if (!isOffline && isReady) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0FBD9] text-[#177454] text-xs font-medium border border-[#D5F5A3] ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Listo para cobrar sin datos</span>
      </div>
    )
  }

  if (isOffline) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF7E8] text-[#A86614] text-xs font-medium border border-[#F6E1B5] ${className}`}>
        <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          {isReady ? 'Sin conexión · puedes seguir cobrando' : 'Sin conexión · requiere configurar previamente'}
        </span>
      </div>
    )
  }

  return null
}
