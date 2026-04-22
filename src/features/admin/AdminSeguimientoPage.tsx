import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { api } from '../../services/api'
import { getSharedSocket } from '../../shared/socket'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

interface GuiaMini { id: string; numeroGuia: string; estado: string }
interface StopDetalle { id: string; orden: number; direccion: string; lat: number; lng: number; cliente: { nombre: string }; guias: GuiaMini[] }
interface RutaDetalle { id: string; fecha: string; estado: string; seguimientoChofer?: string; chofer: { nombre: string }; stops: StopDetalle[]; guias: GuiaMini[] }

interface RutaActiva {
  id: string; fecha: string; estado: string
  chofer: { id: string; nombre: string }
  stops: { id: string; orden: number; lat: number; lng: number; direccion: string }[]
  guias: { id: string; estado: string }[]
}

interface ChoferPosicion { rutaId: string; choferId: string; choferNombre: string; lat: number; lng: number; timestamp: number }

const COLORES = ['#0284c7','#7c3aed','#059669','#dc2626','#d97706','#db2777','#0891b2','#65a30d']
const QUITO: [number, number] = [-78.47, -0.18]

const estadoBadge = (e: string) => e === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' : e === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'

export function AdminSeguimientoPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)
  const [rutasActivas, setRutasActivas] = useState<RutaActiva[]>([])
  const [posiciones, setPosiciones] = useState<Map<string, ChoferPosicion>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedRutaId, setSelectedRutaId] = useState<string | null>(null)
  const [detalleRutaId, setDetalleRutaId] = useState<string | null>(null)
  const [detalleRuta, setDetalleRuta] = useState<RutaDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)

  const fetchRutas = useCallback(async () => {
    try {
      const res = await api.get<{ data: RutaActiva[] }>('/rutas?estado=EN_CURSO&limit=50')
      setRutasActivas(res.data.data ?? [])
    } catch { /* silencioso */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRutas(); const i = setInterval(fetchRutas, 30000); return () => clearInterval(i) }, [fetchRutas])

  const abrirDetalle = async (rutaId: string) => {
    setDetalleRutaId(rutaId); setDetalleLoading(true); setDetalleRuta(null)
    try { const res = await api.get<RutaDetalle>(`/rutas/${rutaId}`); setDetalleRuta(res.data) }
    catch { /* silencioso */ } finally { setDetalleLoading(false) }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new mapboxgl.Map({ container: containerRef.current, style: 'mapbox://styles/mapbox/streets-v12', center: QUITO, zoom: 6, minZoom: 6, maxBounds: [[-81.5, -5.2], [-74.9, 1.6]] })
    mapRef.current = map
    map.on('load', () => { map.addControl(new mapboxgl.NavigationControl(), 'top-right'); map.addControl(new mapboxgl.FullscreenControl(), 'top-right'); setMapLoaded(true) })
    return () => { markersRef.current.forEach((m) => m.remove()); markersRef.current.clear(); map.remove(); mapRef.current = null; setMapLoaded(false) }
  }, [])

  useEffect(() => {
    const socket = getSharedSocket()
    socket.emit('join:admin:seguimiento')
    const handler = (p: { rutaId: string; choferId: string; choferNombre?: string; lat: number; lng: number; timestamp?: number }) => {
      setPosiciones((prev) => { const next = new Map(prev); next.set(p.rutaId, { rutaId: p.rutaId, choferId: p.choferId, choferNombre: p.choferNombre ?? '', lat: p.lat, lng: p.lng, timestamp: p.timestamp ?? Date.now() }); return next })
    }
    socket.on('posicion_chofer', handler)
    return () => { socket.off('posicion_chofer', handler); socket.emit('leave:admin:seguimiento') }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    posiciones.forEach((pos, rutaId) => {
      const idx = rutasActivas.findIndex((r) => r.id === rutaId)
      const color = COLORES[idx >= 0 ? idx % COLORES.length : 0]
      const nombre = pos.choferNombre || rutasActivas.find((r) => r.id === rutaId)?.chofer.nombre || 'Chofer'
      const html = `<div style="font-family:sans-serif;min-width:160px"><p style="font-weight:700;font-size:13px;margin:0 0 4px">${nombre}</p><p style="font-size:11px;color:#64748b;margin:0">Ruta #${rutaId.slice(-6).toUpperCase()}</p><p style="font-size:11px;color:#64748b;margin:4px 0 0">${new Date(pos.timestamp).toLocaleTimeString('es-ES')}</p></div>`
      const existing = markersRef.current.get(rutaId)
      if (existing) { existing.setLngLat([pos.lng, pos.lat]); existing.getPopup()?.setHTML(html) }
      else {
        const el = document.createElement('div')
        el.style.cssText = `background:${color};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;`
        el.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;line-height:1">local_shipping</span>'
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(html)).addTo(map)
        markersRef.current.set(rutaId, marker)
      }
    })
    markersRef.current.forEach((marker, rutaId) => { if (!posiciones.has(rutaId)) { marker.remove(); markersRef.current.delete(rutaId) } })
  }, [posiciones, rutasActivas, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !selectedRutaId) return
    const pos = posiciones.get(selectedRutaId)
    if (pos) { map.flyTo({ center: [pos.lng, pos.lat], zoom: 15, duration: 800 }); return }
    const ruta = rutasActivas.find((r) => r.id === selectedRutaId)
    if (ruta?.stops.length) map.flyTo({ center: [ruta.stops[0].lng, ruta.stops[0].lat], zoom: 14, duration: 800 })
  }, [selectedRutaId, posiciones, rutasActivas, mapLoaded])

  const getProgreso = (ruta: RutaActiva) => {
    const total = ruta.guias.length
    const done = ruta.guias.filter((g) => g.estado === 'ENTREGADO' || g.estado === 'INCIDENCIA').length
    return total ? Math.round((done / total) * 100) : 0
  }

  const getPosAge = (rutaId: string) => {
    const pos = posiciones.get(rutaId)
    if (!pos) return null
    const secs = Math.floor((Date.now() - pos.timestamp) / 1000)
    return secs < 60 ? `hace ${secs}s` : `hace ${Math.floor(secs / 60)}min`
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      {/* Panel izquierdo: lista de rutas */}
      <div className="flex w-full flex-col gap-3 overflow-y-auto lg:w-72 lg:shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Seguimiento en vivo</h2>
            <p className="text-xs text-slate-500">Choferes con rutas en curso</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {rutasActivas.length} activas
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-2xl text-primary">progress_activity</span>
          </div>
        ) : rutasActivas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">local_shipping</span>
            <p className="mt-2 text-sm text-slate-500">No hay rutas en curso</p>
          </div>
        ) : rutasActivas.map((ruta, i) => {
          const color = COLORES[i % COLORES.length]
          const pos = posiciones.get(ruta.id)
          const progreso = getProgreso(ruta)
          const age = getPosAge(ruta.id)
          const isSelected = selectedRutaId === ruta.id
          return (
            <div key={ruta.id} className={`rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-200 bg-white'}`}>
              <button type="button" onClick={() => setSelectedRutaId(isSelected ? null : ruta.id)} className="w-full p-4 text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
                      <span className="material-symbols-outlined text-sm">local_shipping</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{ruta.chofer.nombre}</p>
                      <p className="text-xs text-slate-400">Ruta #{ruta.id.slice(-6).toUpperCase()} · {ruta.fecha}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {pos ? <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />GPS activo</span> : <span className="text-[10px] text-slate-400">Sin GPS</span>}
                    {age && <span className="text-[10px] text-slate-400">{age}</span>}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progreso</span><span className="font-semibold text-slate-700">{progreso}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progreso}%`, background: color }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {ruta.guias.filter((g) => g.estado === 'ENTREGADO').length}/{ruta.guias.length} guias entregadas
                    {ruta.guias.some((g) => g.estado === 'INCIDENCIA') && <span className="ml-2 text-amber-600">incidencia</span>}
                  </p>
                </div>
              </button>
              <div className="border-t border-slate-100 px-4 pb-3">
                <button type="button" onClick={() => abrirDetalle(ruta.id)}
                  className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Ver detalle completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mapa */}
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-slate-700">Mapa global de choferes</span>
          </div>
          <span className="text-xs text-slate-400">
            {posiciones.size > 0 ? `${posiciones.size} chofer${posiciones.size > 1 ? 'es' : ''} con GPS activo` : 'Esperando senal GPS'}
          </span>
        </div>
        <div ref={containerRef} className="h-[calc(100%-49px)] w-full" />
      </div>

      {/* Panel de detalle (drawer derecho) */}
      {detalleRutaId && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-bold text-slate-900">
                Detalle de ruta #{detalleRutaId.slice(-6).toUpperCase()}
              </h3>
              {detalleRuta && <p className="text-xs text-slate-500">{detalleRuta.chofer.nombre} · {detalleRuta.fecha}</p>}
            </div>
            <button type="button" onClick={() => { setDetalleRutaId(null); setDetalleRuta(null) }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {detalleLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
              </div>
            ) : detalleRuta ? (
              <div className="space-y-5">
                {/* Resumen */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total', value: detalleRuta.guias.length, cls: 'text-slate-700' },
                    { label: 'Entregadas', value: detalleRuta.guias.filter((g) => g.estado === 'ENTREGADO').length, cls: 'text-emerald-700' },
                    { label: 'Incidencias', value: detalleRuta.guias.filter((g) => g.estado === 'INCIDENCIA').length, cls: 'text-amber-700' },
                  ].map((c) => (
                    <div key={c.label} className="rounded-lg border border-slate-200 p-3 text-center">
                      <p className="text-xs text-slate-400">{c.label}</p>
                      <p className={`text-xl font-black ${c.cls}`}>{c.value}</p>
                    </div>
                  ))}
                </div>

                {/* Paradas */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Paradas</p>
                  <div className="space-y-2">
                    {[...detalleRuta.stops].sort((a, b) => a.orden - b.orden).map((stop) => (
                      <div key={stop.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white mt-0.5">{stop.orden}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{stop.cliente.nombre}</p>
                            <p className="text-[11px] text-slate-400 truncate">{stop.direccion}</p>
                          </div>
                        </div>
                        <div className="ml-7 space-y-1">
                          {stop.guias.map((g) => (
                            <div key={g.id} className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-mono text-slate-600 truncate">{g.numeroGuia}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${estadoBadge(g.estado)}`}>{g.estado}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No se pudo cargar el detalle.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


