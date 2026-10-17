import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  fullWidth?: boolean
  size?: 'md' | 'lg'
}

export function PrimaryButton({
  children,
  fullWidth = true,
  size = 'lg',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const heightClass = size === 'lg' ? 'h-[54px] text-base' : 'h-[44px] text-sm'
  const widthClass = fullWidth ? 'w-full' : 'w-auto px-6'

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 btn-press focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:ring-offset-2 ${heightClass} ${widthClass} ${
        disabled
          ? 'bg-[#EAE8EF] text-[#6F6B76] cursor-not-allowed opacity-80'
          : 'bg-[#260F61] text-white hover:bg-[#34177F] active:bg-[#1E0B4E]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function LimeButton({
  children,
  fullWidth = true,
  size = 'lg',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const heightClass = size === 'lg' ? 'h-[54px] text-base' : 'h-[44px] text-sm'
  const widthClass = fullWidth ? 'w-full' : 'w-auto px-6'

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 btn-press focus:outline-none focus:ring-2 focus:ring-[#CFFA86] focus:ring-offset-2 ${heightClass} ${widthClass} ${
        disabled
          ? 'bg-[#EAE8EF] text-[#6F6B76] cursor-not-allowed opacity-80'
          : 'bg-[#CFFA86] text-[#260F61] hover:bg-[#BFF566] active:bg-[#AEE84B]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  fullWidth = true,
  size = 'lg',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const heightClass = size === 'lg' ? 'h-[54px] text-base' : 'h-[44px] text-sm'
  const widthClass = fullWidth ? 'w-full' : 'w-auto px-6'

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium border border-[#EAE8EF] transition-all duration-150 btn-press focus:outline-none focus:ring-2 focus:ring-[#5634A3] focus:ring-offset-2 ${heightClass} ${widthClass} ${
        disabled
          ? 'bg-transparent text-[#6F6B76] border-[#EAE8EF] cursor-not-allowed'
          : 'bg-white text-[#17151D] hover:bg-[#F9F8FC] active:bg-[#F2ECFF]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
