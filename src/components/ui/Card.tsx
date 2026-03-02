import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  children: ReactNode
}

export function Card({ title, subtitle, children }: CardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      {(title || subtitle) && (
        <div className="mb-3 space-y-1">
          {title && <p className="text-sm font-semibold text-slate-100">{title}</p>}
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

