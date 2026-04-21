import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { api } from '../../services/api'
import { RouteMap } from '../../components/map/RouteMap'
import { SeguimientoChoferStepper } from '../../components/cliente/SeguimientoChoferStepper'
import { useToastStore } from '../../store/toastStore'
import type { Stop } from '../../types/models'

interface GuiaMini {
  id: string
  numeroGuia: string
  estado: string
  clienteId: string
  stopId: string
}

interface StopApi {
  id: string
  orden: number
  direccion: string
  lat: number
  lng: number
  clienteId: string
  cliente: { id: string; nombre: string }
  guias: GuiaMini[]
}

interface RutaApi {
  id: string
  fecha: string
  estado: string
  seguimientoChofer?: string
  choferId: string
  chofer: { id: string; nombre: string; cedula: string }
  stops: StopApi[]
  guias: GuiaMini[]
}

export function AdminRutaTiempoRealPage() {
  const { rutaId } = useParams<{ rutaId: string }>()
  const addToast = useToastStore((s) => s.addToast)

  const [ruta, setRuta] = useState<RutaApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [choferPosicion, setChoferPosicion] = useState<{ lat: number; lng: number } | null>(null)
  const [choferGpsAt, setChoferGpsAt] = useState<string | null>(null)
  const [seguimientoAt, setSeguimientoAt] = useState<string | null>(null)

  useEffect(() => {
    if (!rutaId) return
    setLoading(true)
    api.get<RutaApi>(`/rutas/${rutaId}`)
      .then((r) => { setRuta(r.data); setSeguimientoAt(new Date().toISOString()) })
      .catch(() => addToast('No se pudo cargar la ruta', 'error'))
      .finally(() => setLoading(false))
  }, [rutaId, addToast])

  useEffect(() => {
    if (!rutaId) return
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => socket.emit('join:ruta', rutaId))

    socket.on('seguimiento_ruta', (p: { rutaId: string; seguimientoChofer: string }) => {
      if (p.rutaId !== rutaId) return
      setRuta((prev) => prev ? { ...prev, seguimientoChofer: p.seguimientoChofer } : prev)
      setSeguimientoAt(new Date().toISOString())
    })

    socket.on('posicion_chofer', (p: { lat: number; lng: number; timestamp?: number }) => {
      setChoferPosicion({ lat: p.lat, lng: p.lng })
      setChoferGpsAt(p.timestamp ? new Date(p.timestamp).toISOString() : new Date().toISOString())
    })

    socket.on('guia:entregada', async () => {
      const res = await api.get<RutaApi>(`/rutas/${rutaId}`)
      setRuta(res.data)
    })

    socket.on('guia:incidencia', async () => {
      const res = await api.get<RutaApi>(`/rutas/${rutaId}`)
      setRuta(res.data)
    })

    socket.on('ruta:completada', async () => {
      const res = await api.get<RutaApi>(`/rutas/${rutaId}`)
      setRuta(res.data)
      addToast('La ruta ha sido completada', 'success')
    })

    return () => { socket.disconnect() }
  }, [rutaId, addToast])

  const stopsRuta: Stop[] = useMemo(() => {
    if (!ruta?.stops?.length) return []
    return [...ruta.stops].sort((a, b) => a.orden - b.orden).map((s) => ({
      id: s.id,
      orden: s.orden,
      direccion: s.direccion,
      lat: s.lat,
      lng: s.lng,
      clienteId: s.clienteId,
      guiaIds: s.guias.map((g) => g.id),
      tieneIncidencia: s.guias.some((g) => g.estado === 'INCIDENCIA'),
    }))
  }, [ruta])

  const estadoGuia = (estado: string) => {
    if (estado === 'ENTREGADO') return 'bg-emerald-100 text-emerald-700'
    if (estado === 'INCIDENCIA') return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
      </div>
    )
  }

  if (!ruta) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">Ruta no encontrada.</p>
        <Link to="/admin/rutas" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Volver a Rutas
        </Link>
      </div>
    )
  }

  const totalGuias = ruta.stops.reduce((a, s) => a + s.guias.length, 0)
  const entregadas = ruta.stops.reduce((a, s) => a + s.guias.filter((g) => g.estado === 'ENTREGADO').length, 0)
  const incidencias = ruta.stops.reduce((a, s) => a + s.guias.filter((g) => g.estado === 'INCIDENCIA').length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/rutas" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Rutas
          </Link>
          <span className="text-slate-300">/</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Ruta #{ruta.id.slice(-6).toUpperCase()}
              <span className="ml-2 size-2 inline-block animate-pulse rounded-full bg-emerald-500" />
            </h2>
            <p className="text-xs text-slate-500">{ruta.fecha} · {ruta.chofer.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="material-symbols-outlined text-sm">gps_fixed</span>
          {choferGpsAt
            ? `GPS · ${new Date(choferGpsAt).toLocaleTimeString('es-ES')}`
            : 'Esperando GPS del chofer'}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total guías', value: totalGuias, color: 'bg-slate-50 text-slate-700' },
          { label: 'Entregadas', value: entregadas, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Incidencias', value: incidencias, color: 'bg-amber-50 text-amber-700' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border border-slate-200 p-4 ${c.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{c.label}</p>
            <p className="mt-1 text-2xl font-black">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Mapa */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">Vista en tiempo real</span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              ruta.estado === 'EN_CURSO' ? 'bg-emerald-100 text-emerald-700' :
              ruta.estado === 'COMPLETADA' ? 'bg-slate-100 text-slate-600' :
              'bg-amber-100 text-amber-700'
            }`}>{ruta.estado.replace('_', ' ')}</span>
          </div>
          <div className="h-72 sm:h-96 lg:h-[480px]">
            <RouteMap
              stops={stopsRuta}
              currentPosition={choferPosicion}
              trazarRutaDesdeMiPosicion={!!choferPosicion}
            />
          </div>
          <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
            {choferPosicion
              ? 'Posición GPS del chofer en tiempo real.'
              : 'El marcador del chofer aparecerá cuando active su GPS.'}
          </p>
        </div>

        {/* Panel lateral */}
        <div className="flex flex-col gap-4">
          {/* Seguimiento */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Estado del chofer</p>
            <SeguimientoChoferStepper
              rutaEstado={ruta.estado}
              seguimiento={ruta.seguimientoChofer ?? 'NINGUNO'}
              guiaEstado="PENDIENTE"
            />
            {seguimientoAt && (
              <p className="mt-2 text-right text-[11px] text-slate-400">
                Actualizado: {new Date(seguimientoAt).toLocaleString('es-ES')}
              </p>
            )}
          </div>

          {/* Paradas y guías */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Paradas · {ruta.stops.length}
              </p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {[...ruta.stops].sort((a, b) => a.orden - b.orden).map((stop) => (
                <div key={stop.id} className="px-4 py-3">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white mt-0.5">
                      {stop.orden}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{stop.cliente.nombre}</p>
                      <p className="text-[11px] text-slate-400 truncate">{stop.direccion}</p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-1">
                    {stop.guias.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-slate-600 truncate">{g.numeroGuia}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${estadoGuia(g.estado)}`}>
                          {g.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
