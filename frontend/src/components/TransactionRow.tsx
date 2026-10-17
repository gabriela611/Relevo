import { UserRound } from 'lucide-react'
import { currencySymbol } from '../model'
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

export function TransactionRow({ title, date, formattedAmount, currency, statusLabel, statusTone, onClick }: TransactionRowProps) {
  const isSuccess = statusTone === 'success'
  const Element = onClick ? 'button' : 'div'

  return (
    <Element type={onClick ? 'button' : undefined} onClick={onClick} className="transaction-row">
      <span className="transaction-avatar" aria-hidden="true">
        <UserRound size={21} strokeWidth={1.75} />
      </span>
      <span className="transaction-info">
        <span className="transaction-title">{title}</span>
        <span className="transaction-meta">
          <span>{date}</span>
          <StatusChip label={statusLabel} tone={statusTone} />
        </span>
      </span>
      <span className={`transaction-amount ${isSuccess ? 'is-received' : ''}`}>
        <span>{isSuccess ? '+ ' : ''}{currencySymbol(currency)} {formattedAmount}</span>
        <span className="transaction-currency">{currency}</span>
      </span>
    </Element>
  )
}
