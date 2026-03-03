import { useMemo, useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'

export function AdminRutasPage() {
  const { rutas, usuarios, stops, guias, fotos } = useLogisticsStore()
  const [rutaExpandidaId, setRutaExpandidaId] = useState<string | null>(null)

  const rutasConDetalle = useMemo(() => {
    return rutas.map((ruta) => {
      const chofer = usuarios.find((u) => u.id === ruta.choferId)
      const paradas = ruta.stopIds
        .map((id) => stops.find((s) => s.id === id))
        .filter(Boolean)
        .sort((a, b) => (a?.orden ?? 0) - (b?.orden ?? 0)) as typeof stops
      const guiasRuta = guias.filter((g) => g.rutaId === ruta.id)
      const fotosHojaRuta = fotos.filter((f) => f.rutaId === ruta.id && f.tipo === 'HOJA_RUTA')
      return {
        ruta,
        choferNombre: chofer?.nombre ?? ruta.choferId,
        paradas,
        guiasRuta,
        fotosHojaRuta,
      }
    })
  }, [rutas, usuarios, stops, guias, fotos])

  const estadoBadge = (estado: string) => {
    const base = 'rounded-full px-2.5 py-1 text-xs font-semibold'
    if (estado === 'EN_CURSO') return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`
    if (estado === 'COMPLETADA') return `${base} bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300`
    if (estado === 'PENDIENTE') return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`
    return `${base} bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rutas</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Detalle de rutas de los conductores asignados y hojas de ruta finalizadas.
        </p>
      </div>

      {rutasConDetalle.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-600 dark:text-slate-300">No hay rutas registradas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rutasConDetalle.map(({ ruta, choferNombre, paradas, guiasRuta, fotosHojaRuta }) => {
            const expandida = rutaExpandidaId === ruta.id
            return (
              <div
                key={ruta.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setRutaExpandidaId(expandida ? null : ruta.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span className="material-symbols-outlined text-primary">route</span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Ruta #{ruta.id.replace('ruta-', '')}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {choferNombre} · {paradas.length} paradas · {guiasRuta.length} guías
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(ruta.fecha).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={estadoBadge(ruta.estado)}>{ruta.estado}</span>
                    <span
                      className={`material-symbols-outlined text-slate-400 transition-transform dark:text-slate-500 ${
                        expandida ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </button>

                {expandida && (
                  <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <span className="material-symbols-outlined text-primary">format_list_numbered</span>
                          Paradas y guías
                        </h4>
                        <ul className="space-y-3">
                          {paradas.map((stop) => {
                            const guiasStop = guiasRuta.filter((g) => g.stopId === stop.id)
                            return (
                              <li
                                key={stop.id}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/30"
                              >
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary dark:text-primary">
                                  Parada #{stop.orden}
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                  {stop.direccion}
                                </p>
                                {stop.notas && (
                                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    {stop.notas}
                                  </p>
                                )}
                                {guiasStop.length > 0 && (
                                  <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 dark:border-slate-600">
                                    {guiasStop.map((g) => (
                                      <li
                                        key={g.id}
                                        className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                                      >
                                        <span>
                                          {g.numeroGuia} — {g.descripcion}
                                        </span>
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                                            g.estado === 'ENTREGADO'
                                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                              : g.estado === 'INCIDENCIA'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                                          }`}
                                        >
                                          {g.estado}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>

                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <span className="material-symbols-outlined text-primary">receipt_long</span>
                          Hoja de ruta finalizada
                        </h4>
                        {fotosHojaRuta.length === 0 ? (
                          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-8 dark:border-slate-600 dark:bg-slate-700/30">
                            <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500">
                              image_not_supported
                            </span>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                              Sin fotos de hoja de ruta
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              El chofer aún no ha subido la hoja firmada.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {fotosHojaRuta.length} foto(s) de la hoja de ruta firmada
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {fotosHojaRuta.map((f) => (
                                <div
                                  key={f.id}
                                  className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
                                >
                                  <img
                                    src={f.urlPreview}
                                    alt={`Hoja de ruta ${new Date(f.createdAt).toLocaleString('es-ES')}`}
                                    className="h-40 w-auto max-w-full object-cover sm:h-52"
                                  />
                                  <p className="border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
                                    {new Date(f.createdAt).toLocaleString('es-ES')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
