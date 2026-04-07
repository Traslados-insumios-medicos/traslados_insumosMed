/**
 * MOLECULE — StatCard
 * Combina átomos (Card + Badge) para mostrar una métrica KPI.
 */

interface StatCardProps {
  icon: string
  label: string
  value: number | string
  trend?: string
  trendColor?: string
  iconBg?: string
  iconColor?: string
  critical?: boolean
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  trendColor = 'text-emerald-500',
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  critical = false,
}: StatCardProps) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border bg-white p-4 dark:bg-slate-800 sm:p-6 ${
        critical
          ? 'border-red-200 dark:border-red-900/50'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {critical && (
        <div className="absolute right-0 top-0 rounded-bl-lg bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
          CRITICAL
        </div>
      )}
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <div className={`rounded-lg p-2 ${iconBg} ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {trend && <span className={`text-xs font-medium ${trendColor}`}>{trend}</span>}
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <h3
        className={`mt-1 text-2xl font-bold sm:text-3xl ${
          critical ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </h3>
    </div>
  )
}
