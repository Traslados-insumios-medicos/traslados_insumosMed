import { useMemo } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { RouteMap } from '../../components/map/RouteMap'
import { useSimulatedRoute } from '../../utils/mapSimulation'

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

  const coordinates = useMemo(
    () => stopsRuta.map((s) => ({ lat: s.lat, lng: s.lng })),
    [stopsRuta],
  )
  const { currentPosition } = useSimulatedRoute({ coordinates, intervalMs: 4000 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Ruta en tiempo real
        </h1>
        <p className="text-sm text-slate-500">
          Seguimiento en vivo del envío seleccionado
        </p>
      </div>

      {!guiaActiva || !ruta ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <span className="material-symbols-outlined text-4xl text-slate-300">
            map
          </span>
          <p className="mt-2 text-sm text-slate-500">
            No se encontraron envíos activos para este cliente.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">map</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Seguimiento en vivo: {guiaActiva.numeroGuia}
                </h3>
              </div>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                Actualizaciones en vivo
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-video min-h-64 w-full">
              <RouteMap stops={stopsRuta} currentPosition={currentPosition} />
            </div>
            <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Posición del camión simulada cada 4 s. Mapa: OpenStreetMap · Leaflet.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">
              Guía {guiaActiva.numeroGuia}
            </p>
            <p className="text-xs text-slate-500">{guiaActiva.descripcion}</p>
            <p className="mt-1 text-xs text-slate-500">Ruta {ruta.id}</p>
          </div>
        </>
      )}
    </div>
  )
}
