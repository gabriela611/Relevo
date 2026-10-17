import { ChevronLeft, Wifi, WifiOff } from 'lucide-react'
import type { Route } from '../model'

interface HeaderProps {
  currentRoute: Route
  onRouteChange: (route: Route) => void
  isOnline?: boolean
}

export function Header({ currentRoute, onRouteChange, isOnline = true }: HeaderProps) {
  const isSubRoute = ['cobrar', 'pagar', 'configurar'].includes(currentRoute)

  return (
    <header className="px-5 py-4 flex items-center justify-between bg-white border-b border-[#EAE8EF]/60 safe-top sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {isSubRoute ? (
          <button
            type="button"
            onClick={() => onRouteChange('inicio')}
            className="p-1.5 -ml-1.5 rounded-full text-[#17151D] hover:bg-[#F2ECFF] transition-colors focus:outline-none"
            aria-label="Volver al inicio"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          {/* Logo symbol */}
          <img src="/favicon.svg" alt="Relevo" className="w-7 h-7 object-contain" />
          <span className="font-bold text-lg tracking-tight text-[#17151D]">
            Relevo
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Connectivity indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline
              ? 'bg-[#F0FBD9] text-[#177454]'
              : 'bg-[#FFF7E8] text-[#A86614]'
          }`}
          title={isOnline ? 'Conexión activa' : 'Sin conexión'}
        >
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? 'En línea' : 'Sin datos'}
          </span>
        </div>
      </div>
    </header>
  )
}
