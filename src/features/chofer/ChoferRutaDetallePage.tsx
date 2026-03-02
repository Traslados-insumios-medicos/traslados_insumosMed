import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { RouteMap } from '../../components/map/RouteMap'
import { useSimulatedRoute } from '../../utils/mapSimulation'

export function ChoferRutaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useAuthStore()
  const { rutas, stops, guias, updateGuiaEstado } = useLogisticsStore()
  const [, setSelectedGuiaId] = useState<string | null>(null)

  const ruta = rutas.find((r) => r.id === id)

  const stopsRuta = useMemo(
    () => (ruta ? stops.filter((s) => ruta.stopIds.includes(s.id)).sort((a, b) => a.orden - b.orden) : []),
    [ruta, stops],
  )

  const coordinates = useMemo(
    () => stopsRuta.map((s) => ({ lat: s.lat, lng: s.lng })),
    [stopsRuta],
  )
  const { currentPosition } = useSimulatedRoute({ coordinates, intervalMs: 4000 })

  const guiasPorRuta = guias.filter((g) => g.rutaId === id)
  const entregadas = guiasPorRuta.filter((g) => g.estado === 'ENTREGADO').length
  const progreso = guiasPorRuta.length ? Math.round((entregadas / guiasPorRuta.length) * 100) : 0

  if (!ruta) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-500">Ruta no encontrada.</p>
        <Link to="/chofer/rutas" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Volver a Mis rutas
        </Link>
      </div>
    )
  }

  const hoy = new Date()
  const mes = hoy.toLocaleString('es-ES', { month: 'short' }).toUpperCase()
  const dia = hoy.getDate()

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24 md:max-w-md">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 rounded-full border-2 border-primary/20 bg-slate-200" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Chofer Logística
            </p>
            <h2 className="text-lg font-bold leading-tight text-slate-900">
              Hola, {currentUser?.nombre}
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-primary/10 p-2 text-primary">
          <span className="text-xs font-bold">{mes}</span>
          <span className="text-lg font-bold leading-none">{dia}</span>
        </div>
      </div>

      {/* Route Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Ruta Activa #{ruta.id.replace('ruta-', '')}
            </h3>
            <p className="text-sm text-slate-500">
              Distribución de Insumos Médicos
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700">
            En Curso
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Progreso de entrega: {progreso}%</span>
            <span className="font-bold text-primary">
              {entregadas} / {guiasPorRuta.length} Paradas
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-primary" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      {/* Map Section - Leaflet con posición simulada del camión */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <RouteMap stops={stopsRuta} currentPosition={currentPosition} />
      </div>

      {/* Stops List */}
      <h4 className="flex items-center gap-2 font-bold text-slate-900">
        <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
        Listado de Paradas
      </h4>

      {stopsRuta.map((stop, index) => {
        const guiasStop = guias.filter((g) => g.stopId === stop.id)

        return (
          <div
            key={stop.id}
            className={`rounded-r-xl border border-slate-200 shadow-sm ${
              index === 0
                ? 'border-l-4 border-l-primary bg-white'
                : 'border-l-4 border-l-transparent bg-white opacity-90'
            }`}
          >
            <div className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-primary">
                    Parada #{stop.orden} {index === 0 ? '(Actual)' : ''}
                  </p>
                  <h5 className="font-bold text-slate-900">{stop.direccion}</h5>
                  <p className="text-xs text-slate-500">{stop.notas ?? '—'}</p>
                </div>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                    index === 0
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {index === 0 ? 'EN CURSO' : 'PENDIENTE'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-tight text-slate-400">
                  Guías en esta parada ({guiasStop.length})
                </p>
                {guiasStop.map((g) => (
                  <div
                    key={g.id}
                    className={`rounded-lg border p-3 ${
                      g.estado === 'INCIDENCIA'
                        ? 'border-red-100 bg-red-50'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">
                        Guía: #{g.numeroGuia}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGuiaId(g.id)
                            updateGuiaEstado(g.id, 'PENDIENTE')
                          }}
                          className={`rounded px-2 py-1 text-[10px] font-medium ${
                            g.estado === 'PENDIENTE'
                              ? 'bg-primary text-white'
                              : 'border border-slate-200 bg-white'
                          }`}
                        >
                          Pendiente
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGuiaId(g.id)
                            updateGuiaEstado(g.id, 'ENTREGADO')
                          }}
                          className={`rounded px-2 py-1 text-[10px] font-medium ${
                            g.estado === 'ENTREGADO'
                              ? 'bg-primary text-white'
                              : 'border border-slate-200 bg-white'
                          }`}
                        >
                          Entregado
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGuiaId(g.id)
                            updateGuiaEstado(g.id, 'INCIDENCIA')
                          }}
                          className={`rounded px-2 py-1 text-[10px] font-medium ${
                            g.estado === 'INCIDENCIA'
                              ? 'bg-red-600 text-white'
                              : 'border border-slate-200 bg-white'
                          }`}
                        >
                          Incidencia
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{g.descripcion}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-200 py-2 text-xs font-bold transition-colors hover:bg-slate-300:bg-slate-600"
                      >
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                        Subir Fotos (0/8)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* Finalizar Jornada */}
      <div className="mt-4 border-t border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Finalizar Jornada
          </label>
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 transition-colors hover:bg-primary/10"
          >
            <span className="material-symbols-outlined mb-2 text-3xl text-primary">receipt_long</span>
            <span className="text-sm font-bold text-primary">Subir Hoja de Ruta Finalizada</span>
            <span className="mt-1 text-[10px] text-slate-500">Sube la foto del documento firmado</span>
          </button>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg transition-transform hover:bg-primary/90 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">check_circle</span>
          FINALIZAR JORNADA
        </button>
      </div>

      {/* Bottom Nav (mobile style) */}
      <nav className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-slate-200 bg-white px-4 pb-6 pt-2 md:relative md:bottom-auto md:left-auto md:right-auto md:mt-6 md:flex md:rounded-xl md:border md:p-2">
        <Link
          to={`/chofer/rutas/${id}`}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-primary"
        >
          <span className="material-symbols-outlined">route</span>
          <p className="text-[10px] font-bold uppercase tracking-tight">Mi Ruta</p>
        </Link>
        <Link
          to="/chofer/rutas"
          className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400"
        >
          <span className="material-symbols-outlined">history</span>
          <p className="text-[10px] font-bold uppercase tracking-tight">Historial</p>
        </Link>
      </nav>
    </div>
  )
}
