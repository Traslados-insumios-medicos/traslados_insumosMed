import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/30',
  secondary: 'border border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500',
  ghost: 'text-slate-300 hover:bg-slate-800/70',
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

