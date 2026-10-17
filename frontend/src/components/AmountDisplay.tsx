import { currencySymbol } from '../model'

interface AmountDisplayProps {
  amount: string
  currency?: string
  description?: string
  scale?: number
  label?: string
  className?: string
  animate?: boolean
}

export function AmountDisplay({
  amount,
  currency,
  description,
  label,
  className = '',
  animate = false,
}: AmountDisplayProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {label && (
        <span className="text-xs uppercase tracking-wider text-[#6F6B76] font-semibold mb-2">
          {label}
        </span>
      )}
      <div className="amount-display">
        <span className="amount-number tabular-nums">
          {currency && <span className="amount-symbol">{currencySymbol(currency)} </span>}
          <span key={amount} className={animate ? 'amount-change' : undefined}>{amount}</span>
        </span>
        {currency && (
          <span className="text-sm sm:text-base font-semibold px-2 py-0.5 rounded-full bg-[#F2ECFF] text-[#5634A3]">
            {currency}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-[#6F6B76] max-w-xs truncate">
          {description}
        </p>
      )}
    </div>
  )
}
