interface AmountDisplayProps {
  amount: string
  currency?: string
  description?: string
  scale?: number
  label?: string
  className?: string
}

export function AmountDisplay({
  amount,
  currency,
  description,
  label,
  className = '',
}: AmountDisplayProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {label && (
        <span className="text-xs uppercase tracking-wider text-[#6F6B76] font-semibold mb-2">
          {label}
        </span>
      )}
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[#17151D] tabular-nums">
          {amount}
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
