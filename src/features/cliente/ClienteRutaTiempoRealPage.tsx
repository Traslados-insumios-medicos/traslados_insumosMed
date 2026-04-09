import { useCallback, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { SeguimientoChoferStepper } from '../../components/cliente/SeguimientoChoferStepper'
import { api } from '../../services/api'
import { RouteMap } from '../../components/map/RouteMap'
import type { Stop } from '../../types/models'
import { useSimulatedRoute } from '../../utils/mapSimulation'
import { useToastStore } from '../../store/toastStore'

interface GuiaLista {
  id: string
  numeroGuia: string
  estado: string
  clienteId: string
  rutaId: string
  stopId: string
  ruta: { id: string; estado: string }
}

interface MisEnviosPayload {
  data: GuiaLista[]
}

interface GuiaMini {
  id: string
  estado: string
}

interface StopApi {
  id: string
  orden: number
  direccion: string
  lat: number
  lng: number
  clienteId: string
  guias: GuiaMini[]
}

interface RutaApi {
  id: string
  estado: string
  seguimientoChofer?: string
  choferId: string
  chofer: { id: string; nombre: string }
  stops: StopApi[]
}

export function ClienteRutaTiempoRealPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [candidates, setCandidates] = useState<GuiaLista[]>([])
  const [ruta, setRuta] = useState<RutaApi | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingRuta, setLoadingRuta] = useState(false)
  const [rutaError, setRutaError] = useState(false)
  const [seguimientoActualizadoAt, setSeguimientoActualizadoAt] = useState<string | null>(null)

  const fetchActivos = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await api.get<MisEnviosPayload>('/guias/mis-envios?vista=activos&limit=50&page=1')
      setCandidates(res.data.data)
    } catch {
      addToast('No se pudieron cargar envíos activos', 'error')
      setCandidates([])
    } finally {
      setLoadingList(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchActivos()
  }, [fetchActivos])

  const guiaActiva = useMemo(() => {
    const enCurso = candidates.find(
      (g) =>
        (g.estado === 'PENDIENTE' || g.estado === 'INCIDENCIA') && g.ruta?.estado === 'EN_CURSO',
    )
    if (enCurso) return enCurso
    return candidates.find((g) => g.estado === 'PENDIENTE' || g.estado === 'INCIDENCIA')
  }, [candidates])

  useEffect(() => {
    if (!guiaActiva?.rutaId) {
      setRuta(null)
      setRutaError(false)
      return
    }
    let cancel = false
    ;(async () => {
      setLoadingRuta(true)
      setRutaError(false)
      try {
        const res = await api.get<RutaApi>(`/rutas/${guiaActiva.rutaId}`)
        if (!cancel) {
          setRuta(res.data)
          setSeguimientoActualizadoAt(new Date().toISOString())
        }
      } catch {
        if (!cancel) {
          setRuta(null)
          setRutaError(true)
          addToast('No se pudo cargar la ruta', 'error')
        }
      } finally {
        if (!cancel) setLoadingRuta(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [guiaActiva?.rutaId, addToast])

  useEffect(() => {
    const rutaId = ruta?.id
    if (!rutaId || !guiaActiva) return
    const token = localStorage.getItem('token')
    if (!token) return
    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    })
    socket.emit('join:ruta', rutaId)
    socket.on('seguimiento_ruta', (p: { rutaId: string; seguimientoChofer: string }) => {
      if (p.rutaId !== rutaId) return
      setRuta((prev) =>
        prev ? { ...prev, seguimientoChofer: p.seguimientoChofer } : prev,
      )
      setSeguimientoActualizadoAt(new Date().toISOString())
    })
    return () => {
      socket.disconnect()
    }
  }, [ruta?.id, guiaActiva?.id])

  const stopsRuta: Stop[] = useMemo(() => {
    if (!ruta?.stops?.length) return []
    return [...ruta.stops]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({
        id: s.id,
        orden: s.orden,
        direccion: s.direccion,
        lat: s.lat,
        lng: s.lng,
        clienteId: s.clienteId,
        guiaIds: s.guias.map((g) => g.id),
      }))
  }, [ruta])

  const todasLasGuias = useMemo(() => ruta?.stops.flatMap((s) => s.guias) ?? [], [ruta])

  const stopCliente = useMemo(
    () => stopsRuta.find((s) => s.id === guiaActiva?.stopId),
    [stopsRuta, guiaActiva?.stopId],
  )

  const coordinates = useMemo(() => stopsRuta.map((s) => ({ lat: s.lat, lng: s.lng })), [stopsRuta])
  const { currentPosition } = useSimulatedRoute({ coordinates, intervalMs: 4000 })

  const paradasAnteriores = stopCliente
    ? stopsRuta.filter((s) => s.orden < stopCliente.orden).length
    : 0
  const etaMinutos = 10 + paradasAnteriores * 12

  const chofer = ruta?.chofer

  if (loadingList) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ruta en tiempo real</h1>
        <p className="text-sm text-slate-500">Seguimiento de tu envío (posición simulada hasta conexión en vivo)</p>
      </div>

      {!guiaActiva || !ruta || loadingRuta ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">map</span>
          <p className="mt-2 text-sm text-slate-500">
            {guiaActiva && loadingRuta
              ? 'Cargando mapa de la ruta…'
              : guiaActiva && rutaError
                ? 'No se pudo cargar el detalle de la ruta. Intente de nuevo más tarde.'
                : 'No hay envíos activos en este momento.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-slate-700">Vista ruta</span>
              </div>
              <span className="text-xs text-slate-400">Actualización posición demo · 4s</span>
            </div>
            <div className="h-72 sm:h-96 lg:h-[460px]">
              <RouteMap
                stops={stopsRuta}
                currentPosition={currentPosition}
                highlightedStopId={guiaActiva.stopId}
              />
            </div>
            <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
              Mapbox · Posición del vehículo simulada en la ruta (WebSocket pendiente)
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <SeguimientoChoferStepper
              rutaEstado={ruta.estado}
              seguimiento={ruta.seguimientoChofer ?? 'NINGUNO'}
              guiaEstado={guiaActiva.estado}
            />
            <p className="text-right text-[11px] text-slate-400">
              Última actualización:{' '}
              {seguimientoActualizadoAt ? new Date(seguimientoActualizadoAt).toLocaleString('es-ES') : '—'}
            </p>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">ETA estimado</p>
              <p className="mt-1 text-3xl font-black text-slate-900">~{etaMinutos} min</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {paradasAnteriores > 0
                  ? `${paradasAnteriores} parada${paradasAnteriores > 1 ? 's' : ''} antes de la tuya`
                  : 'Tu parada es la próxima'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Tu envío</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Guía</span>
                  <span className="font-semibold text-primary">{guiaActiva.numeroGuia}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Estado</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      guiaActiva.estado === 'INCIDENCIA'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {guiaActiva.estado === 'INCIDENCIA' ? 'Incidencia' : 'En tránsito'}
                  </span>
                </div>
                {stopCliente && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="shrink-0 text-slate-500">Destino</span>
                    <span className="text-right text-xs text-slate-700">{stopCliente.direccion}</span>
                  </div>
                )}
              </div>
            </div>

            {chofer && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Chofer asignado</p>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{chofer.nombre}</p>
                    <p className="text-xs text-slate-500">
                      Ruta #{ruta.id.slice(-6)} · {stopsRuta.length} paradas
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Paradas de la ruta</p>
              <ul className="space-y-2">
                {stopsRuta.map((s) => {
                  const esMia = s.id === guiaActiva.stopId
                  const guiasStop = todasLasGuias.filter((g) => s.guiaIds.includes(g.id))
                  const entregada = guiasStop.every((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA')
                  return (
                    <li
                      key={s.id}
                      className={`flex items-start gap-2 rounded-lg p-2 text-xs ${esMia ? 'bg-primary/10 font-semibold text-primary' : ''}`}
                    >
                      <span
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          entregada
                            ? 'bg-emerald-500 text-white'
                            : esMia
                              ? 'bg-primary text-white'
                              : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {s.orden}
                      </span>
                      <span className={`line-clamp-2 ${esMia ? 'text-primary' : 'text-slate-600'}`}>
                        {s.direccion}
                        {esMia && <span className="ml-1 text-[10px]">(tu parada)</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
