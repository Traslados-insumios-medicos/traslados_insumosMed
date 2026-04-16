import { useCallback, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { SeguimientoChoferStepper } from '../../components/cliente/SeguimientoChoferStepper'
import { api } from '../../services/api'
import { RouteMap } from '../../components/map/RouteMap'
import type { Stop } from '../../types/models'
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

interface MisEnviosPayload { data: GuiaLista[] }
interface GuiaMini { id: string; estado: string }

interface StopApi {
  id: string; orden: number; direccion: string
  lat: number; lng: number; clienteId: string; guias: GuiaMini[]
}

interface RutaApi {
  id: string; estado: string; seguimientoChofer?: string
  choferId: string; chofer: { id: string; nombre: string }; stops: StopApi[]
}

export function ClienteRutaTiempoRealPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [candidates, setCandidates] = useState<GuiaLista[]>([])
  const [ruta, setRuta] = useState<RutaApi | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingRuta, setLoadingRuta] = useState(false)
  const [rutaError, setRutaError] = useState(false)
  const [seguimientoActualizadoAt, setSeguimientoActualizadoAt] = useState<string | null>(null)
  const [choferPosicion, setChoferPosicion] = useState<{ lat: number; lng: number } | null>(null)
  const [choferGpsAt, setChoferGpsAt] = useState<string | null>(null)
  const [etaReal, setEtaReal] = useState<number | null>(null)
  const [selectedGuiaId, setSelectedGuiaId] = useState<string | null>(null)

  const fetchActivos = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true)
    try {
      const res = await api.get<MisEnviosPayload>('/guias/mis-envios?vista=activos&limit=50&page=1')
      setCandidates(res.data.data)
    } catch {
      if (!silent) addToast('No se pudieron cargar envíos activos', 'error')
    } finally {
      if (!silent) setLoadingList(false)
    }
  }, [addToast])

  useEffect(() => { fetchActivos() }, [fetchActivos])

  // Refresh silencioso cada 30s — sin spinner, sin parpadeo
  useEffect(() => {
    const interval = setInterval(() => { void fetchActivos(true) }, 30_000)
    return () => clearInterval(interval)
  }, [fetchActivos])

  const guiaActiva = useMemo(() => {
    // Si hay una guía seleccionada manualmente, usarla
    if (selectedGuiaId) {
      const selected = candidates.find((g) => g.id === selectedGuiaId)
      if (selected) return selected
    }
    
    // Si no, usar la lógica automática
    const enCurso = candidates.find(
      (g) => (g.estado === 'PENDIENTE' || g.estado === 'INCIDENCIA') && g.ruta?.estado === 'EN_CURSO',
    )
    return enCurso ?? candidates.find((g) => g.estado === 'PENDIENTE' || g.estado === 'INCIDENCIA')
  }, [candidates, selectedGuiaId])

  useEffect(() => {
    if (!guiaActiva?.rutaId) {
      setRuta(null); setRutaError(false); setChoferPosicion(null); setChoferGpsAt(null); return
    }
    let cancel = false
    ;(async () => {
      setLoadingRuta(true); setRutaError(false)
      try {
        const res = await api.get<RutaApi>(`/rutas/${guiaActiva.rutaId}`)
        if (!cancel) { setRuta(res.data); setSeguimientoActualizadoAt(new Date().toISOString()) }
      } catch {
        if (!cancel) { setRuta(null); setRutaError(true); addToast('No se pudo cargar la ruta', 'error') }
      } finally {
        if (!cancel) setLoadingRuta(false)
      }
    })()
    return () => { cancel = true }
  }, [guiaActiva?.rutaId, addToast])

  useEffect(() => {
    const rutaId = ruta?.id
    if (!rutaId || !guiaActiva) {
      console.log('❌ No se conecta socket cliente:', { rutaId, guiaActiva: !!guiaActiva })
      return
    }
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('❌ No hay token para socket cliente')
      return
    }
    
    console.log('🔌 Conectando socket cliente para ruta:', rutaId)
    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token }, 
      transports: ['websocket'],
    })
    
    socket.on('connect', () => {
      console.log('✅ Cliente conectado al socket, uniéndose a ruta:', rutaId)
      socket.emit('join:ruta', rutaId)
      console.log('📨 Evento join:ruta emitido para:', rutaId)
    })
    
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión socket cliente:', error)
    })
    
    socket.on('seguimiento_ruta', (p: { rutaId: string; seguimientoChofer: string }) => {
      if (p.rutaId !== rutaId) return
      console.log('🔄 Seguimiento actualizado:', p.seguimientoChofer)
      setRuta((prev) => prev ? { ...prev, seguimientoChofer: p.seguimientoChofer } : prev)
      setSeguimientoActualizadoAt(new Date().toISOString())
    })
    
    socket.on('posicion_chofer', (p: { lat: number; lng: number; timestamp?: number }) => {
      console.log('📍 Posición del chofer recibida:', p)
      setChoferPosicion({ lat: p.lat, lng: p.lng })
      setChoferGpsAt(p.timestamp ? new Date(p.timestamp).toISOString() : new Date().toISOString())
    })
    
    // Escuchar cuando hay incidencia - recargar datos y mostrar notificación
    socket.on('guia:incidencia', async (p: { guiaId: string; numeroGuia: string; rutaId: string }) => {
      console.log('⚠️ Incidencia detectada:', p)
      // Recargar la ruta para mostrar el cambio
      try {
        const res = await api.get<RutaApi>(`/rutas/${rutaId}`)
        setRuta(res.data)
      } catch (error) {
        console.error('Error al recargar ruta:', error)
      }
      
      // Si es la guía del cliente, mostrar mensaje pero NO cerrar
      if (p.guiaId === guiaActiva.id) {
        addToast('Se ha reportado una incidencia en tu envío', 'error')
      }
    })
    
    // Escuchar cuando la guía se entrega - recargar datos y cerrar después
    socket.on('guia:entregada', async (p: { guiaId: string; numeroGuia: string; rutaId: string }) => {
      console.log('✅ Guía entregada:', p)
      // Recargar la ruta para mostrar el cambio
      try {
        const res = await api.get<RutaApi>(`/rutas/${rutaId}`)
        setRuta(res.data)
      } catch (error) {
        console.error('Error al recargar ruta:', error)
      }
      
      // Si es la guía del cliente, mostrar mensaje y cerrar después
      if (p.guiaId === guiaActiva.id) {
        addToast('¡Tu envío ha sido entregado exitosamente!', 'success')
        setTimeout(() => {
          window.location.href = '/cliente/mis-envios'
        }, 3000)
      }
    })
    
    // Escuchar cuando la ruta se completa
    socket.on('ruta:completada', (p: { rutaId: string; estado: string }) => {
      console.log('🏁 Ruta completada:', p)
      if (p.rutaId === rutaId) {
        addToast('La ruta ha sido completada. Gracias por usar nuestro servicio.', 'success')
        setTimeout(() => {
          window.location.href = '/cliente/mis-envios'
        }, 3000)
      }
    })
    
    return () => { 
      console.log('🔌 Desconectando socket del cliente')
      socket.disconnect() 
    }
  }, [ruta?.id, guiaActiva?.id, guiaActiva, addToast])

  const stopsRuta: Stop[] = useMemo(() => {
    if (!ruta?.stops?.length) return []
    return [...ruta.stops].sort((a, b) => a.orden - b.orden).map((s) => ({
      id: s.id, orden: s.orden, direccion: s.direccion,
      lat: s.lat, lng: s.lng, clienteId: s.clienteId,
      guiaIds: s.guias.map((g) => g.id),
    }))
  }, [ruta])

  const todasLasGuias = useMemo(() => ruta?.stops.flatMap((s) => s.guias) ?? [], [ruta])

  const stopCliente = useMemo(
    () => stopsRuta.find((s) => s.id === guiaActiva?.stopId),
    [stopsRuta, guiaActiva?.stopId],
  )

  // ETA real via Mapbox Directions cuando hay GPS del chofer
  useEffect(() => {
    if (!choferPosicion || !stopCliente) { setEtaReal(null); return }
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) return
    let cancelled = false
    const { lat: oLat, lng: oLng } = choferPosicion
    const { lat: dLat, lng: dLng } = stopCliente
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${oLng},${oLat};${dLng},${dLat}?access_token=${token}&overview=false`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const duration = data.routes?.[0]?.duration as number | undefined
        if (duration != null) setEtaReal(Math.ceil(duration / 60))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [choferPosicion, stopCliente])

  const currentPosition = choferPosicion

  // Calcula distancia haversine en km entre dos puntos
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  // Fallback: suma distancia desde posición actual (o primera parada pendiente) hasta la parada del cliente
  const etaFallback = useMemo(() => {
    if (!stopCliente || !stopsRuta.length) return null
    const stopsHastaCliente = stopsRuta.filter((s) => s.orden <= stopCliente.orden)
    if (stopsHastaCliente.length < 2) {
      if (choferPosicion) return null // hay GPS, esperar ETA real
      return null // sin datos suficientes
    }
    // Suma distancias entre paradas pendientes (solo si no hay GPS del chofer)
    if (choferPosicion) return null // hay GPS, esperar ETA real
    let totalKm = 0
    for (let i = 0; i < stopsHastaCliente.length - 1; i++) {
      const a = stopsHastaCliente[i]
      const b = stopsHastaCliente[i + 1]
      totalKm += haversineKm(a.lat, a.lng, b.lat, b.lng)
    }
    const paradasIntermedias = stopsHastaCliente.length - 1
    return Math.max(1, Math.ceil((totalKm / 30) * 60) + paradasIntermedias * 3)
  }, [stopCliente, stopsRuta, choferPosicion])

  const etaMinutos = etaReal ?? etaFallback
  const etaEsReal = etaReal != null
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

      {/* Selector de envíos si hay múltiples activos */}
      {candidates.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Selecciona el envío que deseas rastrear:
          </label>
          <select
            value={selectedGuiaId || guiaActiva?.id || ''}
            onChange={(e) => setSelectedGuiaId(e.target.value || null)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {candidates.map((g) => (
              <option key={g.id} value={g.id}>
                Guía {g.numeroGuia} - {g.estado === 'INCIDENCIA' ? '⚠️ Con incidencia' : g.ruta?.estado === 'EN_CURSO' ? '🚚 En camino' : '📦 Pendiente'}
              </option>
            ))}
          </select>
        </div>
      )}

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
              <span className="text-xs text-slate-400">
                {choferGpsAt
                  ? `GPS chofer · ${new Date(choferGpsAt).toLocaleTimeString('es-ES')}`
                  : 'GPS del chofer pendiente'}
              </span>
            </div>
            <div className="h-72 sm:h-96 lg:h-[460px]">
              <RouteMap
                stops={stopsRuta}
                currentPosition={currentPosition}
                highlightedStopId={guiaActiva.stopId}
                trazarRutaDesdeMiPosicion={!!currentPosition}
              />
            </div>
            <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
              {currentPosition
                ? 'Mapbox · Ubicación GPS del chofer en tiempo real.'
                : 'Mapbox · El carrito aparecerá cuando el chofer active su GPS.'}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {etaEsReal ? 'ETA en tiempo real' : 'ETA estimado'}
              </p>
              {etaMinutos != null ? (
                <>
                  <p className="mt-1 text-3xl font-black text-slate-900">{etaEsReal ? '' : '~'}{etaMinutos} min</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {etaEsReal
                      ? 'Calculado desde la posición actual del chofer'
                      : stopCliente && stopsRuta.filter((s) => s.orden < stopCliente.orden).length > 0
                        ? `${stopsRuta.filter((s) => s.orden < stopCliente.orden).length} parada${stopsRuta.filter((s) => s.orden < stopCliente.orden).length > 1 ? 's' : ''} antes de la tuya`
                        : 'Tu parada es la próxima'}
                  </p>
                </>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-base text-primary">progress_activity</span>
                  <p className="text-sm text-slate-500">Calculando tiempo de llegada…</p>
                </div>
              )}
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
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${guiaActiva.estado === 'INCIDENCIA' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    {guiaActiva.estado === 'INCIDENCIA' ? 'Incidencia' : 'En camino'}
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
                    <p className="text-xs text-slate-500">RUTA #{ruta.id.slice(-6).toUpperCase()} • {stopsRuta.length} paradas</p>
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
                    <li key={s.id} className={`flex items-start gap-2 rounded-lg p-2 text-xs ${esMia ? 'bg-primary/10 font-semibold text-primary' : ''}`}>
                      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${entregada ? 'bg-emerald-500 text-white' : esMia ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {s.orden}
                      </span>
                      <span className={`line-clamp-2 ${esMia ? 'text-primary' : 'text-slate-600'}`}>
                        {s.direccion}{esMia && <span className="ml-1 text-[10px]">(tu parada)</span>}
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
