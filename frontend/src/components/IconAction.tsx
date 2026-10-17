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
    lime: 'bg-[#CFFA86] text-[#260F61] hover:bg-[#BFF566]',
    violet: 'bg-[#260F61] text-white hover:bg-[#34177F]',
    lavender: 'bg-[#DFD2FF] text-[#260F61] hover:bg-[#D0BEFF]',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 group focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-150 btn-press group-focus-visible:ring-2 group-focus-visible:ring-[#5634A3] group-focus-visible:ring-offset-2 shadow-sm ${variantStyles[variant]}`}
      >
        <span className="w-6 h-6 flex items-center justify-center">
          {icon}
        </span>
      </div>
      <span className="text-xs sm:text-sm font-medium text-[#17151D] group-hover:text-[#260F61] transition-colors">
        {label}
      </span>
    </button>
  )
}
