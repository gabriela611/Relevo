import { CheckCircle2, Clock3, AlertCircle, XCircle } from 'lucide-react'

export type StatusTone = 'neutral' | 'warning' | 'success' | 'danger'

interface StatusChipProps {
  label: string
  tone?: StatusTone
  className?: string
}

export function StatusChip({ label, tone = 'neutral', className = '' }: StatusChipProps) {
  const toneConfig: Record<StatusTone, { bg: string; text: string; icon: React.ReactNode }> = {
    neutral: {
      bg: 'bg-[#F9F8FC] border border-[#EAE8EF]',
      text: 'text-[#6F6B76]',
      icon: <Clock3 className="w-3.5 h-3.5 text-[#6F6B76]" aria-hidden="true" />,
    },
    warning: {
      bg: 'bg-[#FFF7E8] border border-[#F6E1B5]',
      text: 'text-[#A86614]',
      icon: <AlertCircle className="w-3.5 h-3.5 text-[#A86614]" aria-hidden="true" />,
    },
    success: {
      bg: 'bg-[#F0FBD9] border border-[#D5F5A3]',
      text: 'text-[#177454]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#177454]" aria-hidden="true" />,
    },
    danger: {
      bg: 'bg-[#FDF2F4] border border-[#F9D2D9]',
      text: 'text-[#C73E55]',
      icon: <XCircle className="w-3.5 h-3.5 text-[#C73E55]" aria-hidden="true" />,
    },
  }

  const { bg, text, icon } = toneConfig[tone]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  )
}
