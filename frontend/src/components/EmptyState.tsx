import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-[#F9F8FC] border border-[#EAE8EF] ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#F2ECFF] text-[#5634A3] flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-semibold text-[#17151D] whitespace-pre-line">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-[#6F6B76] max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#260F61] text-white hover:bg-[#34177F] btn-press transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
