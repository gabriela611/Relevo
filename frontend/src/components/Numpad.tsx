import { Delete } from 'lucide-react'

interface NumpadProps {
  onKeyPress: (key: string) => void
  disabled?: boolean
  className?: string
}

export function Numpad({ onKeyPress, disabled = false, className = '' }: NumpadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete']

  return (
    <div className={`grid grid-cols-3 gap-3 w-full max-w-xs mx-auto ${className}`} role="group" aria-label="Teclado numérico">
      {keys.map((key) => {
        const isDelete = key === 'delete'

        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onKeyPress(key)}
            aria-label={isDelete ? 'Borrar' : key === '.' ? 'Punto decimal' : `Número ${key}`}
            className="h-14 sm:h-16 rounded-2xl bg-[#DFD2FF] text-[#17151D] hover:bg-[#D0BEFF] active:bg-[#C2ADFF] transition-all duration-100 flex items-center justify-center text-xl sm:text-2xl font-semibold btn-press focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDelete ? (
              <Delete className="w-6 h-6 text-[#260F61]" aria-hidden="true" />
            ) : (
              <span className="tabular-nums">{key}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
