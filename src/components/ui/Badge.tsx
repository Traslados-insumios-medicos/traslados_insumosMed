import type { ReactNode } from 'react'
import type { EstadoGuia, EstadoRuta } from '../../types/models'

interface BadgeProps {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'info'
}

const base =
  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset'

const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-slate-900 text-slate-100 ring-slate-600',
  success: 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/60',
  warning: 'bg-amber-500/10 text-amber-200 ring-amber-500/60',
  info: 'bg-sky-500/10 text-sky-200 ring-sky-500/60',
}

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return <span className={`${base} ${tones[tone]}`}>{children}</span>
}

export function EstadoGuiaBadge({ estado }: { estado: EstadoGuia }) {
  const tone: BadgeProps['tone'] =
    estado === 'ENTREGADO' ? 'success' : estado === 'INCIDENCIA' ? 'warning' : 'info'

  return <Badge tone={tone}>{estado}</Badge>
}

export function EstadoRutaBadge({ estado }: { estado: EstadoRuta }) {
  const tone: BadgeProps['tone'] =
    estado === 'COMPLETADA'
      ? 'success'
      : estado === 'EN_CURSO'
        ? 'info'
        : estado === 'CANCELADA'
          ? 'warning'
          : 'default'

  return <Badge tone={tone}>{estado}</Badge>
}

