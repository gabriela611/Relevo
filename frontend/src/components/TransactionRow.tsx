import { StatusChip, type StatusTone } from './StatusChip'

interface TransactionRowProps {
  id: string
  title: string
  date: string
  formattedAmount: string
  currency: string
  statusLabel: string
  statusTone: StatusTone
  onClick?: () => void
}

export function TransactionRow({
  title,
  date,
  formattedAmount,
  currency,
  statusLabel,
  statusTone,
  onClick,
}: TransactionRowProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex items-center justify-between p-4 rounded-2xl bg-white border border-[#EAE8EF] hover:border-[#DFD2FF] transition-all ${
        onClick ? 'cursor-pointer active:bg-[#F9F8FC]' : ''
      }`}
    >
      <div className="flex flex-col gap-1 min-w-0 pr-3">
        <span className="text-sm font-semibold text-[#17151D] truncate">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6F6B76]">{date}</span>
          <StatusChip label={statusLabel} tone={statusTone} />
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <span className="text-sm font-bold text-[#17151D] tabular-nums">
          {formattedAmount}
        </span>
        <span className="text-xs font-medium text-[#6F6B76]">{currency}</span>
      </div>
    </div>
  )
}
