import { Home, History, QrCode, UserRound } from 'lucide-react'
import type { Route } from '../model'

interface BottomNavProps {
  currentRoute: Route
  onRouteChange: (route: Route) => void
}

export function BottomNav({ currentRoute, onRouteChange }: BottomNavProps) {
  // Hide nav during full-screen camera or onboarding flows if desired
  const hideNav = currentRoute === 'bienvenida'
  if (hideNav) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-[440px] mx-auto bg-white/95 backdrop-blur-md border-t border-[#EAE8EF] safe-bottom z-30 px-4 pt-2 shadow-lg"
      aria-label="Navegación principal"
    >
      <div className="flex items-center justify-around h-14">
        <button
          type="button"
          onClick={() => onRouteChange('inicio')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            currentRoute === 'inicio'
              ? 'text-[#260F61] font-semibold'
              : 'text-[#6F6B76] hover:text-[#17151D]'
          }`}
          aria-current={currentRoute === 'inicio' ? 'page' : undefined}
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs">Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => onRouteChange('movimientos')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            currentRoute === 'movimientos'
              ? 'text-[#260F61] font-semibold'
              : 'text-[#6F6B76] hover:text-[#17151D]'
          }`}
          aria-current={currentRoute === 'movimientos' ? 'page' : undefined}
        >
          <History className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs">Movimientos</span>
        </button>

        {/* Center prominent scan button */}
        <div className="-mt-5">
          <button
            type="button"
            onClick={() => onRouteChange('escanear')}
            className="w-13 h-13 rounded-full bg-[#260F61] text-white flex items-center justify-center shadow-md hover:bg-[#34177F] active:bg-[#1E0B4E] transition-all btn-press focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:ring-offset-2"
            aria-label="Escanear código QR"
          >
            <QrCode className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRouteChange('cuenta')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
            currentRoute === 'cuenta'
              ? 'text-[#260F61] font-semibold'
              : 'text-[#6F6B76] hover:text-[#17151D]'
          }`}
          aria-current={currentRoute === 'cuenta' ? 'page' : undefined}
        >
          <UserRound className="w-5 h-5" aria-hidden="true" />
          <span className="text-xs">Cuenta</span>
        </button>
      </div>
    </nav>
  )
}
