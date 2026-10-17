import { Home, History, QrCode, UserRound } from 'lucide-react'
import type { Route } from '../model'

interface BottomNavProps {
  currentRoute: Route
  onRouteChange: (route: Route) => void
}

export function BottomNav({ currentRoute, onRouteChange }: BottomNavProps) {
  // Hide nav during full-screen camera or onboarding flows
  const hideNav = currentRoute === 'bienvenida'
  if (hideNav) return null

  return (
    <nav
      className="floating-nav glass-nav"
      aria-label="Navegación principal"
    >
      <div className="max-w-[480px] mx-auto">
        <div className="nav-items">
          <button
            type="button"
            onClick={() => onRouteChange('inicio')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all active:scale-95 ${
              currentRoute === 'inicio'
                ? 'text-[#260F61] font-bold'
                : 'text-[#6F6B76] hover:text-[#17151D]'
            }`}
            aria-current={currentRoute === 'inicio' ? 'page' : undefined}
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px]">Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => onRouteChange('movimientos')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all active:scale-95 ${
              currentRoute === 'movimientos'
                ? 'text-[#260F61] font-bold'
                : 'text-[#6F6B76] hover:text-[#17151D]'
            }`}
            aria-current={currentRoute === 'movimientos' ? 'page' : undefined}
          >
            <History className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px]">Movimientos</span>
          </button>

          {/* Center prominent scan button */}
          <div className="nav-scan">
            <button
              type="button"
              onClick={() => onRouteChange('escanear')}
              className="w-14 h-14 rounded-full bg-[#260F61] text-white flex items-center justify-center shadow-lg hover:bg-[#34177F] active:scale-95 transition-all btn-press focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:ring-offset-2"
              aria-label="Escanear código QR"
            >
              <QrCode className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRouteChange('cuenta')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all active:scale-95 ${
              currentRoute === 'cuenta'
                ? 'text-[#260F61] font-bold'
                : 'text-[#6F6B76] hover:text-[#17151D]'
            }`}
            aria-current={currentRoute === 'cuenta' ? 'page' : undefined}
          >
            <UserRound className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px]">Cuenta</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
