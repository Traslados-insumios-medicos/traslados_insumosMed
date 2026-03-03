import { useLogisticsStore } from '../../store/logisticsStore'

export function AdminDashboardPage() {
  const { guias, rutas, novedades, usuarios, stops } = useLogisticsStore()

  const enviosActivos = guias.filter(
    (g) =>
      g.estado === 'PENDIENTE' || rutas.find((r) => r.id === g.rutaId)?.estado === 'EN_CURSO',
  ).length
  const rutasEnCurso = rutas.filter((r) => r.estado === 'EN_CURSO').length
  const entregasCompletadas = guias.filter((g) => g.estado === 'ENTREGADO').length
  const novedadesCount = novedades.length

  const getChoferName = (choferId: string) =>
    usuarios.find((u) => u.id === choferId)?.nombre ?? choferId
  const getFirstStopDestino = (rutaId: string) => {
    const ruta = rutas.find((r) => r.id === rutaId)
    if (!ruta?.stopIds.length) return '—'
    const firstStop = stops.find((s) => s.id === ruta.stopIds[0])
    return firstStop?.direccion ?? '—'
  }
  const getProgreso = (rutaId: string) => {
    const ruta = rutas.find((r) => r.id === rutaId)
    if (!ruta) return 0
    const guiasRuta = guias.filter((g) => g.rutaId === rutaId)
    const entregadas = guiasRuta.filter((g) => g.estado === 'ENTREGADO').length
    return guiasRuta.length ? Math.round((entregadas / guiasRuta.length) * 100) : 0
  }

  const novedadBorder = (tipo: string) => {
    if (tipo === 'DIRECCION_INCORRECTA' || tipo === 'CLIENTE_AUSENTE') return 'border-l-red-500'
    if (tipo === 'MERCADERIA_DANADA') return 'border-l-amber-500'
    return 'border-l-blue-500'
  }
  const novedadIcon = (tipo: string) => {
    if (tipo === 'DIRECCION_INCORRECTA' || tipo === 'CLIENTE_AUSENTE') return 'fmd_bad'
    if (tipo === 'MERCADERIA_DANADA') return 'inventory_2'
    return 'schedule'
  }
  const novedadIconColor = (tipo: string) => {
    if (tipo === 'DIRECCION_INCORRECTA' || tipo === 'CLIENTE_AUSENTE') return 'text-red-500'
    if (tipo === 'MERCADERIA_DANADA') return 'text-amber-500'
    return 'text-blue-500'
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* KPI Cards - mobile first: 1 col, luego 2, luego 4 */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <span className="material-symbols-outlined">package_2</span>
            </div>
            <span className="text-xs font-medium text-emerald-500">+5% hoy</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Envíos Activos</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{enviosActivos}</h3>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <span className="material-symbols-outlined">route</span>
            </div>
            <span className="text-xs font-medium text-emerald-500">+2% hoy</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rutas en Curso</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{rutasEnCurso}</h3>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Meta: 100</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Entregas Completadas</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{entregasCompletadas}</h3>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-slate-800 sm:col-span-2 sm:p-6 lg:col-span-1">
          {novedadesCount > 0 && (
            <div className="absolute right-0 top-0 rounded-bl-lg bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              CRITICAL
            </div>
          )}
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Novedades/Incidencias</p>
          <h3 className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400 sm:text-3xl">{novedadesCount}</h3>
        </div>
      </div>

      {/* Main Grid - mobile: 1 col; desktop: 3 cols */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Rutas Recientes</h3>
            <button type="button" className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Chofer</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Destino</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Progreso</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rutas.slice(0, 5).map((ruta) => (
                  <tr key={ruta.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
                      <div className="size-8 shrink-0 rounded-full bg-slate-200 dark:bg-slate-600" />
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{getChoferName(ruta.choferId)}</span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <span className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{getFirstStopDestino(ruta.id)}</span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="min-w-[60px] flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-1.5 bg-primary" style={{ width: `${getProgreso(ruta.id)}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-8">{getProgreso(ruta.id)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ruta.estado === 'EN_CURSO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {ruta.estado === 'EN_CURSO' ? 'En Curso' : ruta.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Novedades en Tiempo Real</h3>
            {novedades.length > 0 && <span className="size-2 animate-pulse rounded-full bg-red-500" />}
          </div>
          <div className="space-y-3">
            {novedades.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin novedades registradas.</p>
              </div>
            ) : (
              novedades.slice(-5).reverse().map((n) => (
                <div key={n.id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 border-l-4 ${novedadBorder(n.tipo)}`}>
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined mt-1 shrink-0 ${novedadIconColor(n.tipo)}`}>{novedadIcon(n.tipo)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{n.tipo}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Guía #{n.guiaId.slice(-4)} - {new Date(n.createdAt).toLocaleString('es-ES')}</p>
                      <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-300">"{n.descripcion}"</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
