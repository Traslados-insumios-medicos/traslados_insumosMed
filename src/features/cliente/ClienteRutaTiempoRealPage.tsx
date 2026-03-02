import { useMemo } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { RouteMap } from '../../components/map/RouteMap'

export function ClienteRutaTiempoRealPage() {
  const { currentUser } = useAuthStore()
  const { guias, rutas, stops } = useLogisticsStore()

  const guiaActiva = useMemo(
    () =>
      guias.find(
        (g) =>
          g.clienteId === currentUser?.clienteId &&
          (g.estado === 'PENDIENTE' || g.estado === 'INCIDENCIA'),
      ),
    [guias, currentUser],
  )

  const ruta = rutas.find((r) => r.id === guiaActiva?.rutaId)
  const stopsRuta = useMemo(
    () => (ruta ? stops.filter((s) => ruta.stopIds.includes(s.id)).sort((a, b) => a.orden - b.orden) : []),
    [ruta, stops],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Ruta en tiempo real
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Seguimiento en vivo del envío seleccionado
        </p>
      </div>

      {!guiaActiva || !ruta ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
            map
          </span>
          <p className="mt-2 text-sm text-slate-500">
            No se encontraron envíos activos para este cliente.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">map</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Seguimiento en vivo: {guiaActiva.numeroGuia}
                </h3>
              </div>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                Actualizaciones en vivo
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800">
              <RouteMap stops={stopsRuta} />
              <div className="absolute top-1/2 left-1/2 flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
                <div className="animate-bounce rounded-lg border border-primary bg-white p-2 shadow-xl dark:bg-slate-900">
                  <span className="material-symbols-outlined text-3xl text-primary">
                    local_shipping
                  </span>
                </div>
                <div className="mt-2 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
                  Vehículo en ruta
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Guía {guiaActiva.numeroGuia}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{guiaActiva.descripcion}</p>
            <p className="mt-1 text-xs text-slate-500">Ruta {ruta.id}</p>
          </div>
        </>
      )}
    </div>
  )
}
