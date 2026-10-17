import React from 'react'

export type IconActionVariant = 'lime' | 'violet' | 'lavender'

interface IconActionProps {
  label: string
  icon: React.ReactNode
  variant: IconActionVariant
  onClick: () => void
  disabled?: boolean
}

export function IconAction({
  label,
  icon,
  variant,
  onClick,
  disabled = false,
}: IconActionProps) {
  const variantStyles: Record<IconActionVariant, string> = {
    lime: 'bg-[#CFFA86] text-[#260F61] group-hover:bg-[#BFF566]',
    violet: 'bg-[#260F61] text-white group-hover:bg-[#34177F]',
    lavender: 'bg-[#DFD2FF] text-[#260F61] group-hover:bg-[#D0BEFF]',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EAE8EF] hover:border-[#DFD2FF] card-interactive flex flex-col items-center justify-center gap-2.5 text-center w-full shadow-sm group focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm ${variantStyles[variant]}`}
      >
        <span className="w-6 h-6 flex items-center justify-center">
          {icon}
        </span>
      </div>
      <span className="text-xs sm:text-sm font-bold text-[#17151D] group-hover:text-[#260F61] transition-colors">
        {label}
      </span>
    </button>
  )
}
