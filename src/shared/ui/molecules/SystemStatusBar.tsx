import { useEffect, useState } from 'react'
import type { InternetStatus, SocketStatus } from '../../hooks/useConnectionStatus'

export type GpsStatus = 'idle' | 'searching' | 'active' | 'denied'

interface Props {
  internet: InternetStatus
  gps: GpsStatus
  socket: SocketStatus
  lastSync: number | null
}

function formatLastSync(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 5) return 'Ahora'
  if (secs < 60) return `Hace ${secs}s`
  const mins = Math.floor(secs / 60)
  return `Hace ${mins}min`
}

function Badge({
  color,
  icon,
  label,
}: {
  color: 'green' | 'amber' | 'red' | 'slate'
  icon: string
  label: string
}) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    slate: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  }

  const dotColors = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-red-500',
    slate: 'bg-slate-400',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${colors[color]}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dotColors[color]}`} />
      <span className="material-symbols-outlined text-[13px] leading-none">{icon}</span>
      {label}
    </span>
  )
}

export function SystemStatusBar({ internet, gps, socket, lastSync }: Props) {
  const [, tick] = useState(0)

  useEffect(() => {
    if (!lastSync) return
    const id = window.setInterval(() => tick((n) => n + 1), 10000)
    return () => window.clearInterval(id)
  }, [lastSync])

  const internetBadge = internet === 'online'
    ? { color: 'green' as const, icon: 'wifi', label: 'Internet' }
    : { color: 'red' as const, icon: 'wifi_off', label: 'Sin internet' }

  const gpsBadge =
    gps === 'active'
      ? { color: 'green' as const, icon: 'my_location', label: 'GPS' }
      : gps === 'searching'
        ? { color: 'amber' as const, icon: 'gps_not_fixed', label: 'Buscando GPS' }
        : gps === 'denied'
          ? { color: 'red' as const, icon: 'location_disabled', label: 'GPS denegado' }
          : { color: 'slate' as const, icon: 'location_off', label: 'GPS inactivo' }

  const socketBadge =
    socket === 'connected'
      ? { color: 'green' as const, icon: 'cloud_done', label: 'Servidor' }
      : socket === 'reconnecting'
        ? { color: 'amber' as const, icon: 'cloud_sync', label: 'Reconectando' }
        : { color: 'red' as const, icon: 'cloud_off', label: 'Sin servidor' }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge {...internetBadge} />
      <Badge {...gpsBadge} />
      <Badge {...socketBadge} />
      {lastSync && (
        <span className="text-[11px] text-slate-400 tabular-nums">
          Sync: {formatLastSync(lastSync)}
        </span>
      )}
    </div>
  )
}
