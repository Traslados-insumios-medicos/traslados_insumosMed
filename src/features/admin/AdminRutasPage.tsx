import { useCallback, useEffect, useState } from 'react'
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
}

interface RutaApi {
  id: string
  fecha: string
  estado: string
  chofer: { id: string; nombre: string }
  stops: StopApi[]
  fotos: FotoApi[]
}

interface PaginatedRutas {
  data: RutaApi[]
  total: number
  page: number
  limit: number
}

interface ClienteOption { id: string; nombre: string }
interface ChoferOption { id: string; nombre: string }

interface StopForm {
  clienteId: string
  direccion: string
  notas: string
  guiaDescripcion: string
}

const stopVacio = (): StopForm => ({ clienteId: '', direccion: '', notas: '', guiaDescripcion: '' })
const LIMIT = 20

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

  // form
  const [choferId, setChoferId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [stopsForm, setStopsForm] = useState<StopForm[]>([stopVacio()])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchRutas = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await api.get<PaginatedRutas>(`/rutas?page=${p}&limit=${LIMIT}`)
      setRutas(res.data.data)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      addToast('Error al cargar rutas', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchRutas(1)
    // Load choferes and clientes for the form
    api.get<{ data: ChoferOption[] }>('/usuarios?rol=CHOFER&limit=100')
      .then((r) => setChoferes(r.data.data))
      .catch(() => {})
    api.get<{ data: ClienteOption[] }>('/clientes?limit=100')
      .then((r) => setClientes(r.data.data))
      .catch(() => {})
  }, [fetchRutas])

  const resetForm = () => {
    setChoferId('')
    setFecha(new Date().toISOString().slice(0, 10))
    setStopsForm([stopVacio()])
    setShowModal(false)
  }

  const handleAddStop = () => setStopsForm((p) => [...p, stopVacio()])
  const handleRemoveStop = (i: number) => setStopsForm((p) => p.filter((_, idx) => idx !== i))
  const handleStopChange = (i: number, field: keyof StopForm, value: string) =>
    setStopsForm((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  const handleClienteChange = (i: number, clienteId: string) => {
    setStopsForm((p) => p.map((s, idx) => idx === i ? { ...s, clienteId, direccion: s.direccion || '' } : s))
  }

  const canSubmit = choferId && stopsForm.every((s) => s.clienteId && s.direccion)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await api.post('/rutas', {
        fecha,
        choferId,
        stops: stopsForm.map((s, i) => ({
          orden: i + 1,
          direccion: s.direccion,
          clienteId: s.clienteId,
          notas: s.notas || undefined,
          guiaDescripcion: s.guiaDescripcion || 'Insumos médicos',
        })),
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

  const estadoBadge = (estado: string) => {
    const base = 'rounded-full px-2.5 py-1 text-xs font-semibold'
    if (estado === 'EN_CURSO') return `${base} bg-emerald-100 text-emerald-700`
    if (estado === 'COMPLETADA') return `${base} bg-slate-100 text-slate-600`
    if (estado === 'PENDIENTE') return `${base} bg-amber-100 text-amber-700`
    return `${base} bg-red-100 text-red-600`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rutas</h2>
          <p className="text-sm text-slate-500">
            Detalle de rutas de los conductores asignados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nueva Ruta
        </button>
      </div>

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
                  onChange={(e) => setChoferId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar chofer...</option>
                  {choferes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
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
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Parada #{i + 1}</span>
                        {stopsForm.length > 1 && (
                          <button type="button" onClick={() => handleRemoveStop(i)} className="text-slate-400 hover:text-red-500">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <select
                          value={s.clienteId}
                          onChange={(e) => handleClienteChange(i, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Seleccionar cliente...</option>
                          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <input
                          type="text"
                          placeholder="Dirección"
                          value={s.direccion}
                          onChange={(e) => handleStopChange(i, 'direccion', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Descripción de guía (ej: Insumos médicos)"
                          value={s.guiaDescripcion}
                          onChange={(e) => handleStopChange(i, 'guiaDescripcion', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Notas (opcional)"
                          value={s.notas}
                          onChange={(e) => handleStopChange(i, 'notas', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
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
          <p className="text-slate-600">No hay rutas registradas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rutas.map((ruta) => {
            const expandida = rutaExpandidaId === ruta.id
            return (
              <div key={ruta.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setRutaExpandidaId(expandida ? null : ruta.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span className="material-symbols-outlined text-primary">route</span>
                    <div>
                      <p className="font-bold text-slate-900">Ruta #{ruta.id.slice(-6)}</p>
                      <p className="text-sm text-slate-500">
                        {ruta.chofer.nombre} · {ruta.stops.length} paradas · {ruta.stops.reduce((acc, s) => acc + s.guias.length, 0)} guías
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {new Date(ruta.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={estadoBadge(ruta.estado)}>{ruta.estado}</span>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${expandida ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                </button>

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
                            <li key={stop.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Parada #{stop.orden}</p>
                              <p className="mt-1 text-sm font-medium text-slate-900">{stop.direccion}</p>
                              <p className="text-xs text-slate-500">{stop.cliente.nombre}</p>
                              {stop.notas && <p className="mt-0.5 text-xs text-slate-500">{stop.notas}</p>}
                              {stop.guias.length > 0 && (
                                <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                                  {stop.guias.map((g) => (
                                    <li key={g.id} className="flex items-center justify-between text-xs text-slate-600">
                                      <span>{g.numeroGuia} — {g.descripcion}</span>
                                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                                        g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                                        g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>{g.estado}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
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
                              <div key={f.id} className="overflow-hidden rounded-lg border border-slate-200">
                                <img src={f.urlPreview} alt="Hoja de ruta" className="h-40 w-auto max-w-full object-cover" />
                                <p className="border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500">
                                  {new Date(f.createdAt).toLocaleString('es-ES')}
                                </p>
                              </div>
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
    </div>
  )
}
