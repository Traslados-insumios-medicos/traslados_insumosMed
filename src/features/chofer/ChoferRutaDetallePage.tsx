import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useToastStore } from '../../store/toastStore'
import { RouteMap } from '../../components/map/RouteMap'
import { useSimulatedRoute } from '../../utils/mapSimulation'
import { PhotoUploader } from './PhotoUploader'
import { IncidenceDialog } from './IncidenceDialog'

export function ChoferRutaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useAuthStore()
  const {
    rutas,
    stops,
    guias,
    fotos,
    novedades,
    updateGuiaEstado,
    updateRutaEstado,
  } = useLogisticsStore()
  const addToast = useToastStore((s) => s.addToast)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0)
  const [incidenceGuia, setIncidenceGuia] = useState<{ id: string; numeroGuia: string } | null>(null)

  const ruta = rutas.find((r) => r.id === id)

  const stopsRuta = useMemo(
    () =>
      ruta
        ? stops.filter((s) => ruta.stopIds.includes(s.id)).sort((a, b) => a.orden - b.orden)
        : [],
    [ruta, stops],
  )

  const coordinates = useMemo(
    () => stopsRuta.map((s) => ({ lat: s.lat, lng: s.lng })),
    [stopsRuta],
  )
  const { currentPosition } = useSimulatedRoute({ coordinates, intervalMs: 4000 })

  const guiasPorRuta = guias.filter((g) => g.rutaId === id)
  const entregadas = guiasPorRuta.filter((g) => g.estado === 'ENTREGADO').length
  const conIncidencia = guiasPorRuta.filter((g) => g.estado === 'INCIDENCIA').length
  const total = guiasPorRuta.length
  const progreso = total ? Math.round(((entregadas + conIncidencia) / total) * 100) : 0

  const effectiveSelectedStopId = selectedStopId ?? stopsRuta[0]?.id ?? null

  const novedadesRuta = useMemo(
    () =>
      novedades.filter((n) =>
        guiasPorRuta.some((g) => g.id === n.guiaId),
      ),
    [novedades, guiasPorRuta],
  )

  const fotosHojaRuta = useMemo(
    () => (id ? fotos.filter((f) => f.rutaId === id && f.tipo === 'HOJA_RUTA') : []),
    [id, fotos],
  )

  const puedeFinalizar =
    total > 0 &&
    guiasPorRuta.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA') &&
    fotosHojaRuta.length >= 1

  const handleMarkEntregado = (guiaId: string) => {
    updateGuiaEstado(guiaId, 'ENTREGADO')
    addToast('Entrega confirmada', 'success')
  }

  const handleFinalizarRuta = () => {
    if (!id || !puedeFinalizar) return
    updateRutaEstado(id, 'COMPLETADA')
    addToast('Ruta finalizada', 'success')
  }

  const handleIniciarRuta = () => {
    if (!id) return
    updateRutaEstado(id, 'EN_CURSO')
    addToast('Ruta iniciada', 'success')
  }

  if (!ruta) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Ruta no encontrada.</p>
        <Link
          to="/chofer/rutas"
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          Volver a Mis rutas
        </Link>
      </div>
    )
  }

  const hoy = new Date()
  const mes = hoy.toLocaleString('es-ES', { month: 'short' }).toUpperCase()
  const dia = hoy.getDate()

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-24 md:pb-6">
      {/* Header: solo en móvil o compacto en desktop */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:border-0 md:bg-transparent md:dark:bg-transparent md:p-0">
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 rounded-full border-2 border-primary/20 bg-slate-200" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chofer Logística
            </p>
            <h2 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">
              Hola, {currentUser?.nombre}
            </h2>
          </div>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-primary/10 p-2 text-primary">
          <span className="text-xs font-bold dark:text-white">{mes}</span>
          <span className="text-lg font-bold leading-none dark:text-white">{dia}</span>
        </div>
      </div>

      {/* Layout: móvil vertical, desktop 2 columnas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] lg:gap-6">
        {/* Columna izquierda: mapa + lista de paradas */}
        <div className="flex min-h-0 flex-col gap-4 lg:flex-1">
          {/* Resumen + progreso */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ruta #{ruta.id.replace('ruta-', '')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Distribución de Insumos Médicos</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                  ruta.estado === 'EN_CURSO'
                    ? 'bg-emerald-100 text-emerald-700'
                    : ruta.estado === 'COMPLETADA'
                      ? 'bg-slate-100 text-slate-600 dark:text-slate-300'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {ruta.estado === 'PENDIENTE'
                  ? 'Planificada'
                  : ruta.estado === 'EN_CURSO'
                    ? 'En Curso'
                    : ruta.estado}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">Progreso: {progreso}%</span>
                <span className="font-bold text-primary">
                  {entregadas + conIncidencia} / {total} guías
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full bg-primary"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mapa: altura fija en desktop */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-white">Recorrido</span>
              <button
                type="button"
                onClick={() => setFitBoundsTrigger((t) => t + 1)}
                className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                Ver ruta completa
              </button>
            </div>
            <div className="h-64 sm:h-72 lg:h-[360px]">
              <RouteMap
                stops={stopsRuta}
                currentPosition={currentPosition}
                highlightedStopId={selectedStopId}
                fitBoundsTrigger={fitBoundsTrigger}
              />
            </div>
          </div>

          {/* Lista de paradas con scroll en desktop */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:min-h-0 lg:flex-1">
            <h4 className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-3 font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
              Paradas y guías
            </h4>
            <div className="flex-1 overflow-y-auto">
              {stopsRuta.map((stop) => {
                const guiasStop = guias.filter((g) => g.stopId === stop.id)
                const isSelected = effectiveSelectedStopId === stop.id
                return (
                  <div
                    key={stop.id}
                    className={`border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                      isSelected ? 'border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStopId(effectiveSelectedStopId === stop.id ? null : stop.id)}
                      className="flex w-full items-start justify-between p-4 text-left"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase text-primary">
                          Parada #{stop.orden}
                        </p>
                        <h5 className="font-bold text-slate-900 dark:text-white">{stop.direccion}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{stop.notas ?? '—'}</p>
                      </div>
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {guiasStop.length} guía(s)
                      </span>
                    </button>
                    {isSelected && (
                    <div className="space-y-3 px-4 pb-4">
                      {guiasStop.map((g) => (
                        <div
                          key={g.id}
                          className={`rounded-lg border p-3 ${
                            g.estado === 'INCIDENCIA'
                              ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-slate-700'
                              : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-700 dark:text-white">
                              Guía: #{g.numeroGuia}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => handleMarkEntregado(g.id)}
                                disabled={g.estado === 'ENTREGADO'}
                                className={`rounded px-2 py-1 text-[10px] font-medium ${
                                  g.estado === 'ENTREGADO'
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50'
                                }`}
                              >
                                Entregado
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setIncidenceGuia({ id: g.id, numeroGuia: g.numeroGuia })
                                }
                                className={`rounded px-2 py-1 text-[10px] font-medium ${
                                  g.estado === 'INCIDENCIA'
                                    ? 'bg-amber-600 text-white'
                                    : 'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                Incidencia
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{g.descripcion}</p>
                          <div className="mt-3">
                            <PhotoUploader
                              scope="guia"
                              guiaId={g.id}
                              label="Fotos de entrega"
                              max={8}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna derecha: panel de acciones (desktop) */}
        <div className="flex flex-col gap-4 lg:w-[380px] lg:flex-shrink-0">
          {/* Incidencias de esta ruta */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 shadow-sm">
            <h4 className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-amber-600">warning</span>
              Incidencias de esta ruta
            </h4>
            {novedadesRuta.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Ninguna incidencia registrada.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {novedadesRuta.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs dark:border-amber-900/50 dark:bg-slate-700"
                  >
                    <span className="font-semibold text-amber-800 dark:text-amber-200">{n.tipo}</span>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">{n.descripcion}</p>
                    <p className="text-slate-400 dark:text-slate-400">
                      {new Date(n.createdAt).toLocaleString('es-ES')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Hoja de ruta */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 shadow-sm">
            <label className="mb-3 block text-sm font-bold text-slate-700 dark:text-white">
              Hoja de ruta finalizada
            </label>
            <PhotoUploader
              scope="hoja_ruta"
              rutaId={id}
              label="Fotos del documento"
              max={5}
            />
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
              Sube la foto del documento firmado (mín. 1 para finalizar).
            </p>
          </div>

          {/* Iniciar / Finalizar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 p-4">
            {ruta.estado === 'PENDIENTE' && (
              <button
                type="button"
                onClick={handleIniciarRuta}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg hover:bg-primary/90 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                Iniciar ruta
              </button>
            )}
            {ruta.estado === 'EN_CURSO' && (
              <button
                type="button"
                onClick={handleFinalizarRuta}
                disabled={!puedeFinalizar}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">check_circle</span>
                Finalizar jornada
              </button>
            )}
            {ruta.estado === 'COMPLETADA' && (
              <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-300">
                Ruta completada.
              </p>
            )}
            {!puedeFinalizar && ruta.estado === 'EN_CURSO' && (
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Completa todas las guías (entregado/incidencia) y sube al menos 1 foto de hoja de ruta.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navegación inferior móvil */}
      <nav className="fixed bottom-0 left-0 right-0 flex gap-2 border-t border-slate-200 bg-white px-4 pb-6 pt-2 dark:border-slate-700 dark:bg-slate-900 md:relative md:bottom-auto md:left-auto md:right-auto md:mt-6 md:flex md:rounded-xl md:border md:p-2 lg:mt-0">
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

      {incidenceGuia && (
        <IncidenceDialog
          guiaId={incidenceGuia.id}
          numeroGuia={incidenceGuia.numeroGuia}
          onClose={() => setIncidenceGuia(null)}
        />
      )}
    </div>
  )
}
