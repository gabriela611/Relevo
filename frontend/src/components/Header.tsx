import { useEffect, useRef, useState } from 'react'
import type { Route } from '../model'

interface HeaderProps {
  currentRoute: Route
  onRouteChange: (route: Route) => void
  isOnline?: boolean
}

export function Header({ isOnline = true }: HeaderProps) {
  const [showConnection, setShowConnection] = useState(false)
  const connectionRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!showConnection) return
    const dismissOutside = (event: PointerEvent) => {
      if (!connectionRef.current?.contains(event.target as Node)) setShowConnection(false)
    }
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowConnection(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [showConnection])

  return (
    <header className="glass-header sticky top-0 z-20 safe-top">
      <div className="header-content">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="w-7 h-7 object-contain" />
          <span className="font-extrabold text-lg tracking-tight text-[#17151D]">Relevo</span>
        </div>
        <div ref={connectionRef} className="connectivity-control">
          <button
            ref={toggleRef}
            type="button"
            className="connectivity-toggle"
            aria-label={`${isOnline ? 'En línea' : 'Sin conexión'}. Ver estado de conexión`}
            aria-expanded={showConnection}
            aria-controls="connectivity-details"
            onClick={() => setShowConnection(open => !open)}
          >
            <span className={`connectivity-dot ${isOnline ? 'is-online' : 'is-offline'}`} aria-hidden="true" />
          </button>
          {showConnection && (
            <div id="connectivity-details" className="connectivity-details" role="status">
              <strong>{isOnline ? 'Estás en línea' : 'Estás sin conexión'}</strong>
              <p>{isOnline
                ? 'Tu dispositivo detecta una conexión de red. Esto no confirma que un pago haya llegado.'
                : 'Puedes consultar los movimientos guardados en este dispositivo. Para completar un pago necesitas internet.'}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
