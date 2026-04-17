import { useCallback, useEffect, useState } from 'react'
import { useDbRefresh } from '../../hooks/useDbRefresh'
import { MapboxAddressInput } from '../../components/ui/MapboxAddressInput'
import { ModalMotion } from '../../components/ui/ModalMotion'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

interface GuiaApi {
  id: string
  numeroGuia: string
  descripcion: string
  estado: string
  clienteId: string
  stopId: string
  receptorNombre?: string | null
  horaLlegada?: string | null
  horaSalida?: string | null
  temperatura?: string | null
  observaciones?: string | null
  fotos: FotoApi[]
}

interface StopApi {
  id: string
  orden: number
  direccion: string
  notas?: string | null
  cliente: { id: string; nombre: string }
  guias: GuiaApi[]
}

interface FotoApi {
  id: string
  urlPreview: string
  createdAt: string
  tipo: string
}

interface RutaApi {
  id: string
  fecha: string
  estado: string
  chofer: { id: string; nombre: string; cedula: string }
  stops: StopApi[]
  guias: GuiaApi[]
  fotos: FotoApi[]
}

interface PaginatedRutas {
  data: RutaApi[]
  total: number
  page: number
  limit: number
}

interface ClienteOption { id: string; nombre: string; tipo: string; clientePrincipalId?: string | null; clientesSecundarios?: { id: string; nombre: string; direccion?: string; lat?: number | null; lng?: number | null; ruc?: string; activo?: boolean }[] }
interface ChoferOption { id: string; nombre: string }

interface GuiaForm {
  descripcion: string
}

interface StopForm {
  clienteId: string       // principal seleccionado
  subClienteId: string    // secundario seleccionado (opcional)
  direccion: string
  lat: number | null
  lng: number | null
  notas: string
  guias: GuiaForm[]       // cada parada tiene múltiples guías
}

const guiaVacia = (): GuiaForm => ({ descripcion: '' })
const stopVacio = (): StopForm => ({ clienteId: '', subClienteId: '', direccion: '', lat: null, lng: null, notas: '', guias: [guiaVacia()] })
const LIMIT = 10

export function AdminRutasPage() {
  const addToast = useToastStore((s) => s.addToast)

  const [rutas, setRutas] = useState<RutaApi[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [choferes, setChoferes] = useState<ChoferOption[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])

  const [rutaExpandidaId, setRutaExpandidaId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedStop, setSelectedStop] = useState<StopApi | null>(null)
  const [deleteConfirmRuta, setDeleteConfirmRuta] = useState<RutaApi | null>(null)
  const [deleteRutaSubmitting, setDeleteRutaSubmitting] = useState(false)

  // Filtros de fecha
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce para el buscador
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // form
  const [choferId, setChoferId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [stopsForm, setStopsForm] = useState<StopForm[]>([stopVacio()])
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
  const [choferError, setChoferError] = useState('')
  const [stopsErrors, setStopsErrors] = useState<{ [key: number]: { clienteId?: string; direccion?: string; guias?: { [guiaIdx: number]: string } } }>({})

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchRutas = useCallback(async (p: number, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({
        page: p.toString(),
        limit: LIMIT.toString(),
      })
      if (fechaDesde) params.append('desde', fechaDesde)
      if (fechaHasta) params.append('hasta', fechaHasta)
      if (filtroEstado) params.append('estado', filtroEstado)
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())
      
      const res = await api.get<PaginatedRutas>(`/rutas?${params.toString()}`)
      setRutas(res.data.data)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      addToast('Error al cargar rutas', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [addToast, fechaDesde, fechaHasta, filtroEstado, debouncedSearch])

  useEffect(() => {
    fetchRutas(1)
  }, [fetchRutas])

  useEffect(() => {
    // Recargar cuando cambien los filtros
    fetchRutas(1)
  }, [fechaDesde, fechaHasta, filtroEstado, debouncedSearch, fetchRutas])

  useEffect(() => {
    // Load choferes and clientes for the form
    api.get<{ data: ChoferOption[] }>('/usuarios?rol=CHOFER&limit=100&activo=true')
      .then((r) => setChoferes(r.data.data))
      .catch(() => {})
    api.get<{ data: ClienteOption[] }>('/clientes?limit=100&tipo=PRINCIPAL&includeSecundarios=true&activo=true')
      .then((r) => setClientes(r.data.data))
      .catch(() => {})
  }, [])

  useDbRefresh('rutas', () => fetchRutas(page, true))

  const resetForm = () => {
    setChoferId('')
    setChoferError('')
    setFecha(new Date().toISOString().slice(0, 10))
    setStopsForm([stopVacio()])
    setStopsErrors({})
    setShowModal(false)
  }

  const handleAddStop = () => setStopsForm((p) => [...p, stopVacio()])
  const handleRemoveStop = (i: number) => setStopsForm((p) => p.filter((_, idx) => idx !== i))
  const handleStopChange = (i: number, field: keyof Omit<StopForm, 'guias'>, value: string) =>
    setStopsForm((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  
  const handleAddGuia = (stopIdx: number) => {
    setStopsForm((p) => p.map((s, idx) => idx === stopIdx ? { ...s, guias: [...s.guias, guiaVacia()] } : s))
  }
  
  const handleRemoveGuia = (stopIdx: number, guiaIdx: number) => {
    setStopsForm((p) => p.map((s, idx) => {
      if (idx !== stopIdx) return s
      // Mantener al menos 1 guía
      if (s.guias.length <= 1) return s
      return { ...s, guias: s.guias.filter((_, gIdx) => gIdx !== guiaIdx) }
    }))
  }
  
  const handleGuiaChange = (stopIdx: number, guiaIdx: number, value: string) => {
    setStopsForm((p) => p.map((s, idx) => {
      if (idx !== stopIdx) return s
      return { ...s, guias: s.guias.map((g, gIdx) => gIdx === guiaIdx ? { descripcion: value } : g) }
    }))
  }
  const handleClienteChange = (i: number, clienteId: string) => {
    setStopsForm((p) => p.map((s, idx) => idx === i ? { ...s, clienteId, subClienteId: '', direccion: '', lat: null, lng: null } : s))
    if (clienteId) {
      setStopsErrors((prev) => {
        const next = { ...prev }
        if (!next[i]) return prev
        delete next[i].clienteId
        if (Object.keys(next[i]).length === 0) delete next[i]
        return next
      })
    }
  }

  const handleSubClienteChange = (i: number, subClienteId: string) => {
    const stop = stopsForm[i]
    const principal = clientes.find((c) => c.id === stop.clienteId)
    const sub = principal?.clientesSecundarios?.find((s) => s.id === subClienteId)
    const direccion = sub?.direccion ?? ''
    const lat = sub?.lat ?? null
    const lng = sub?.lng ?? null
    setStopsForm((p) => p.map((s, idx) => idx === i ? { ...s, subClienteId, direccion, lat, lng } : s))
  }

  const handleDireccionChange = (i: number, direccion: string, coords?: { lat: number; lng: number }) => {
    setStopsForm((p) => p.map((s, idx) => idx === i ? { ...s, direccion, lat: coords?.lat ?? null, lng: coords?.lng ?? null } : s))
    if (direccion.trim() && coords) {
      setStopsErrors((prev) => {
        const next = { ...prev }
        if (!next[i]) return prev
        delete next[i].direccion
        if (Object.keys(next[i]).length === 0) delete next[i]
        return next
      })
    }
  }

  const canSubmit = choferId && stopsForm.every((s) => s.clienteId && s.direccion && s.lat !== null && s.guias.every(g => g.descripcion.trim()))

  const handleSubmit = async () => {
    const nextStopsErrors: { [key: number]: { clienteId?: string; direccion?: string; guias?: { [guiaIdx: number]: string } } } = {}
    stopsForm.forEach((s, i) => {
      if (!s.clienteId) nextStopsErrors[i] = { ...(nextStopsErrors[i] ?? {}), clienteId: REQUIRED_MESSAGE }
      if (!s.direccion || s.lat === null) nextStopsErrors[i] = { ...(nextStopsErrors[i] ?? {}), direccion: REQUIRED_MESSAGE }
      
      const guiasErrors: { [guiaIdx: number]: string } = {}
      s.guias.forEach((g, gIdx) => {
        if (!g.descripcion.trim()) guiasErrors[gIdx] = REQUIRED_MESSAGE
      })
      if (Object.keys(guiasErrors).length > 0) {
        nextStopsErrors[i] = { ...(nextStopsErrors[i] ?? {}), guias: guiasErrors }
      }
    })

    setStopsErrors(nextStopsErrors)
    setChoferError(choferId ? '' : REQUIRED_MESSAGE)

    if (!canSubmit || !choferId || Object.keys(nextStopsErrors).length > 0) return
    setSubmitting(true)
    try {
      // Crear una guía por cada guía en cada parada
      const guiasPayload = stopsForm.flatMap((s, i) => 
        s.guias.map((g) => ({
          orden: i + 1,
          direccion: s.direccion,
          lat: s.lat,
          lng: s.lng,
          clienteId: s.subClienteId || s.clienteId,
          notas: s.notas || undefined,
          guiaDescripcion: g.descripcion || 'Insumos médicos',
        }))
      )
      
      await api.post('/rutas', {
        fecha,
        choferId,
        stops: guiasPayload,
      })
      addToast('Ruta creada', 'success')
      resetForm()
      fetchRutas(1)
    } catch {
      addToast('Error al crear ruta', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openDeleteRutaModal = (r: RutaApi) => setDeleteConfirmRuta(r)

  const executeDeleteRuta = async () => {
    const r = deleteConfirmRuta
    if (!r) return
    setDeleteRutaSubmitting(true)
    try {
      await api.delete(`/rutas/${r.id}`)
      addToast('Ruta eliminada', 'success')
      setDeleteConfirmRuta(null)
      if (rutaExpandidaId === r.id) setRutaExpandidaId(null)
      setSelectedStop((prev) => (prev && r.stops.some((s) => s.id === prev.id) ? null : prev))
      await fetchRutas(page)
    } catch {
      addToast('No se pudo eliminar la ruta', 'error')
    } finally {
      setDeleteRutaSubmitting(false)
    }
  }

  const estadoBadge = (estado: string) => {
    const base = 'rounded-full px-2.5 py-1 text-xs font-semibold'
    if (estado === 'EN_CURSO') return `${base} bg-emerald-100 text-emerald-700`
    if (estado === 'COMPLETADA') return `${base} bg-slate-100 text-slate-600`
    if (estado === 'PENDIENTE') return `${base} bg-amber-100 text-amber-700`
    return `${base} bg-red-100 text-red-600`
  }

  const trunc = (str: string, max = 50) => str.length > max ? str.slice(0, max) + '...' : str

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Rutas</h2>
          <p className="mt-0.5 text-sm text-slate-500">Detalle de rutas de los conductores asignados.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span className="hidden sm:inline">Nueva Ruta</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Panel de filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Buscador */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, receptor o chofer..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estado</label>
            <div className="relative">
              <select 
                value={filtroEstado} 
                onChange={(e) => {
                  setFiltroEstado(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_CURSO">En Curso</option>
                <option value="COMPLETADA">Completada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Desde</label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={(e) => {
                setFechaDesde(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hasta</label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={(e) => {
                setFechaHasta(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" 
            />
          </div>
        </div>
      </div>

      <ModalMotion show={!!deleteConfirmRuta} backdropClassName="bg-black/50" panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {deleteConfirmRuta && (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Eliminar ruta</h3>
              <button type="button" onClick={() => !deleteRutaSubmitting && setDeleteConfirmRuta(null)} className="text-slate-400 hover:text-slate-600 disabled:opacity-40" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-slate-600">
                ¿Eliminar la ruta <span className="font-semibold text-slate-900">#{deleteConfirmRuta.id.slice(-6)}</span> de <span className="font-semibold">{deleteConfirmRuta.chofer.nombre}</span>? Se borran en la base todas las paradas, guías, fotos y el seguimiento asociado. El chofer no se elimina.
              </p>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" disabled={deleteRutaSubmitting} onClick={() => setDeleteConfirmRuta(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" disabled={deleteRutaSubmitting} onClick={() => void executeDeleteRuta()}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                  {deleteRutaSubmitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                  Eliminar
                </button>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      {/* Modal nueva ruta */}
      <ModalMotion
        show={showModal}
        backdropClassName="bg-black/50"
        panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="text-lg font-bold text-slate-900">Nueva Ruta</h3>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Chofer</label>
                <select
                  value={choferId}
                  onChange={(e) => {
                    const value = e.target.value
                    setChoferId(value)
                    if (value) setChoferError('')
                  }}
                  onBlur={() => setChoferError(choferId ? '' : REQUIRED_MESSAGE)}
                  className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm ${
                    choferError ? 'border-red-400' : 'border-slate-200'
                  }`}
                >
                  <option value="">Seleccionar chofer...</option>
                  {choferes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {choferError && <p className="mt-1 text-xs text-red-500">{choferError}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Paradas</label>
                  <button type="button" onClick={handleAddStop} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Agregar parada
                  </button>
                </div>
                <div className="space-y-4">
                  {stopsForm.map((s, i) => (
                    <div key={i} className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <span className="material-symbols-outlined text-primary">location_on</span>
                          Parada #{i + 1}
                        </span>
                        {stopsForm.length > 1 && (
                          <button type="button" onClick={() => handleRemoveStop(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {/* Cliente principal */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Cliente *</label>
                          <select
                            value={s.clienteId}
                            onChange={(e) => handleClienteChange(i, e.target.value)}
                            onBlur={() => {
                              if (!s.clienteId) {
                                setStopsErrors(prev => ({ ...prev, [i]: { ...prev[i], clienteId: REQUIRED_MESSAGE } }))
                              }
                            }}
                            className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm ${
                              stopsErrors[i]?.clienteId ? 'border-red-400' : 'border-slate-200'
                            }`}
                          >
                            <option value="">Seleccionar cliente...</option>
                            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                          {stopsErrors[i]?.clienteId && (
                            <p className="mt-1 text-xs text-red-500">{stopsErrors[i].clienteId}</p>
                          )}
                        </div>
                        
                        {/* Cliente secundario — solo si el principal tiene secundarios */}
                        {s.clienteId && (() => {
                          const principal = clientes.find((c) => c.id === s.clienteId)
                          const subs = principal?.clientesSecundarios ?? []
                          if (!subs.length) return null
                          return (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">Punto de entrega (opcional)</label>
                              <select
                                value={s.subClienteId}
                                onChange={(e) => handleSubClienteChange(i, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                              >
                                <option value="">Seleccionar punto...</option>
                                {subs.map((sub) => <option key={sub.id} value={sub.id}>{sub.nombre}</option>)}
                              </select>
                            </div>
                          )
                        })()}
                        
                        {/* Dirección con autocomplete Mapbox */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Dirección *</label>
                          <MapboxAddressInput
                            key={`stop-${i}`}
                            value={s.direccion}
                            coords={s.lat !== null && s.lng !== null ? { lat: s.lat, lng: s.lng } : null}
                            onChange={(dir, coords) => handleDireccionChange(i, dir, coords)}
                          />
                          {stopsErrors[i]?.direccion && (
                            <p className="mt-1 text-xs text-red-500">{stopsErrors[i].direccion}</p>
                          )}
                          {s.lat !== null && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              Coordenadas guardadas
                            </p>
                          )}
                        </div>
                        
                        {/* Notas */}
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-600">Notas (opcional)</label>
                            <span className={`text-[10px] ${s.notas.length > 230 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {s.notas.length}/250
                            </span>
                          </div>
                          <input
                            type="text"
                            placeholder="Notas adicionales..."
                            value={s.notas}
                            onChange={(e) => handleStopChange(i, 'notas', e.target.value)}
                            maxLength={250}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          />
                        </div>

                        {/* Sección de Guías */}
                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <span className="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
                              Guías de esta parada
                            </label>
                            <button 
                              type="button" 
                              onClick={() => handleAddGuia(i)} 
                              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                              Agregar guía
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {s.guias.map((guia, gIdx) => (
                              <div key={gIdx} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                <div className="mb-1.5 flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-slate-500">Guía #{gIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGuia(i, gIdx)}
                                    disabled={s.guias.length <= 1}
                                    className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title={s.guias.length <= 1 ? 'Debe haber al menos 1 guía' : 'Eliminar guía'}
                                  >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                  </button>
                                </div>
                                <div>
                                  <div className="mb-1 flex items-center justify-between">
                                    <label className="text-[10px] font-medium text-slate-600">Descripción *</label>
                                    <span className={`text-[9px] ${guia.descripcion.length > 130 ? 'text-amber-500' : 'text-slate-400'}`}>
                                      {guia.descripcion.length}/150
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Ej: Insumos médicos"
                                    value={guia.descripcion}
                                    onChange={(e) => {
                                      handleGuiaChange(i, gIdx, e.target.value)
                                      if (e.target.value.trim()) {
                                        setStopsErrors(prev => {
                                          const newErrors = { ...prev }
                                          if (newErrors[i]?.guias?.[gIdx]) {
                                            const guiasErrors = { ...newErrors[i].guias }
                                            delete guiasErrors[gIdx]
                                            if (Object.keys(guiasErrors).length === 0) {
                                              delete newErrors[i].guias
                                            } else {
                                              newErrors[i] = { ...newErrors[i], guias: guiasErrors }
                                            }
                                            if (Object.keys(newErrors[i]).length === 0) delete newErrors[i]
                                          }
                                          return newErrors
                                        })
                                      }
                                    }}
                                    onBlur={() => {
                                      if (!guia.descripcion.trim()) {
                                        setStopsErrors(prev => ({
                                          ...prev,
                                          [i]: { 
                                            ...prev[i], 
                                            guias: { 
                                              ...(prev[i]?.guias ?? {}), 
                                              [gIdx]: REQUIRED_MESSAGE 
                                            } 
                                          }
                                        }))
                                      }
                                    }}
                                    maxLength={150}
                                    className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-xs ${
                                      stopsErrors[i]?.guias?.[gIdx] ? 'border-red-400' : 'border-slate-200'
                                    }`}
                                  />
                                  {stopsErrors[i]?.guias?.[gIdx] && (
                                    <p className="mt-1 text-[10px] text-red-500">{stopsErrors[i].guias![gIdx]}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
              <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                Crear Ruta
              </button>
            </div>
      </ModalMotion>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
        </div>
      ) : rutas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
          <p className="mt-2 text-sm text-slate-600">
            {debouncedSearch || filtroEstado || fechaDesde || fechaHasta 
              ? 'No se encontraron rutas con los filtros aplicados.'
              : 'No hay rutas registradas.'}
          </p>
          {(debouncedSearch || filtroEstado || fechaDesde || fechaHasta) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setFiltroEstado('')
                setFechaDesde('')
                setFechaHasta('')
              }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {rutas.map((ruta) => {
            const expandida = rutaExpandidaId === ruta.id
            return (
              <div key={ruta.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="p-4">
                  {/* Fila principal */}
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <span className="material-symbols-outlined text-[20px] text-primary">route</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-bold text-slate-900">RUTA #{ruta.id.slice(-6).toUpperCase()}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openDeleteRutaModal(ruta) }}
                            className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label="Eliminar ruta"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRutaExpandidaId(expandida ? null : ruta.id)}
                            className="rounded-lg p-1 text-slate-400 hover:text-primary transition-colors"
                          >
                            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${expandida ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>
                        </div>
                      </div>
                      {/* Fecha + badge + stats en una sola línea */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs text-slate-400">
                          {new Date(ruta.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className={estadoBadge(ruta.estado)}>{ruta.estado.replace('_', ' ')}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">person</span>
                          {trunc(ruta.chofer.nombre)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span>
                          {ruta.stops.length} paradas
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">inventory_2</span>
                          {ruta.stops.reduce((acc, s) => acc + s.guias.length, 0)} guías
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {expandida && (
                  <div className="border-t border-slate-200 p-4">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                          <span className="material-symbols-outlined text-primary">format_list_numbered</span>
                          Paradas y guías
                        </h4>
                        <ul className="space-y-3">
                          {ruta.stops.map((stop) => (
                            <li key={stop.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedStop(stop)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:border-primary hover:bg-primary/5"
                              >
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Parada #{stop.orden}</p>
                                <p className="mt-1 text-sm font-medium text-slate-900">{trunc(stop.direccion)}</p>
                                <p className="text-xs text-slate-500">{trunc(stop.cliente.nombre)}</p>
                                {stop.notas && <p className="mt-0.5 text-xs text-slate-500">{trunc(stop.notas)}</p>}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {stop.guias.map((g) => (
                                    <span key={g.id} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                      g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                                      g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>{g.numeroGuia}</span>
                                  ))}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                          <span className="material-symbols-outlined text-primary">receipt_long</span>
                          Hoja de ruta finalizada
                        </h4>
                        {ruta.fotos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-8">
                            <span className="material-symbols-outlined text-4xl text-slate-400">image_not_supported</span>
                            <p className="mt-2 text-sm text-slate-500">Sin fotos de hoja de ruta</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {ruta.fotos.map((f) => (
                              <a key={f.id} href={f.urlPreview} target="_blank" rel="noopener noreferrer"
                                className="group overflow-hidden rounded-lg border border-slate-200 transition-all hover:border-primary hover:shadow-md">
                                <img src={f.urlPreview} alt="Hoja de ruta" className="h-40 w-auto max-w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                                <p className="border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[11px] text-slate-400">open_in_new</span>
                                  {new Date(f.createdAt).toLocaleString('es-ES')}
                                </p>
                              </a>
                            ))}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">{total} ruta{total !== 1 ? 's' : ''} en total</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchRutas(page - 1)} disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Anterior
            </button>
            <span className="text-slate-500">{page} / {totalPages}</span>
            <button type="button" onClick={() => fetchRutas(page + 1)} disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal detalle de parada */}
      <ModalMotion
        show={!!selectedStop}
        backdropClassName="bg-black/60"
        panelClassName="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {selectedStop && (
          <>
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Parada #{selectedStop.orden}</p>
                <h3 className="mt-0.5 text-lg font-bold text-slate-900">{trunc(selectedStop.direccion, 80)}</h3>
                <p className="text-sm text-slate-500">{trunc(selectedStop.cliente.nombre)}</p>
                {selectedStop.notas && (
                  <p className="mt-1 text-xs text-slate-400">{trunc(selectedStop.notas, 100)}</p>
                )}
              </div>
              <button type="button" onClick={() => setSelectedStop(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-5 p-5">
              {selectedStop.guias.map((g) => {
                const fotos = g.fotos ?? []
                return (
                  <div key={g.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {/* Header guía */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Guía #{g.numeroGuia}</p>
                        <p className="text-xs text-slate-500">{g.descripcion}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                        g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                        g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{g.estado}</span>
                    </div>

                    {/* Detalles de entrega */}
                    {(g.receptorNombre || g.horaLlegada || g.horaSalida || g.temperatura || g.observaciones) && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {g.receptorNombre && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recibido por</p>
                              <p className="text-xs text-slate-700 break-all overflow-wrap-anywhere">{g.receptorNombre}</p>
                            </div>
                          )}
                          {g.temperatura && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Temperatura</p>
                              <p className="text-xs text-slate-700 break-all overflow-wrap-anywhere">{g.temperatura}</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {g.horaLlegada && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Llegada</p>
                              <p className="text-xs text-slate-700 break-all">{g.horaLlegada}</p>
                            </div>
                          )}
                          {g.horaSalida && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Salida</p>
                              <p className="text-xs text-slate-700 break-all">{g.horaSalida}</p>
                            </div>
                          )}
                        </div>
                        {g.observaciones && (
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Observaciones</p>
                            <p className="text-xs text-slate-700 break-all overflow-wrap-anywhere">{g.observaciones}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fotos de entrega */}
                    {fotos.length > 0 && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Fotos de entrega ({fotos.length})
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {fotos.map((f) => (
                            <a key={f.id} href={f.urlPreview} target="_blank" rel="noopener noreferrer"
                              className="group overflow-hidden rounded-lg border border-slate-200 transition-all hover:border-primary hover:shadow-md">
                              <img src={f.urlPreview} alt="Foto entrega"
                                className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                              <p className="border-t border-slate-100 bg-white px-2 py-1 text-[10px] text-slate-400">
                                {new Date(f.createdAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {fotos.length === 0 && g.estado === 'ENTREGADO' && (
                      <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-400">Sin fotos de entrega.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </ModalMotion>
    </div>
  )
}
