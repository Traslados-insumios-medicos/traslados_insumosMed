import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

interface SeguimientoApi { id: string; nota: string; createdAt: string }

interface NovedadApi {
  id: string; tipo: string; descripcion: string; createdAt: string
  guia: { id: string; numeroGuia: string; clienteId: string; descripcion: string; estado: string }
  seguimientos: SeguimientoApi[]
}

interface ClienteOption { id: string; nombre: string }

const tipoLabel: Record<string, string> = {
  CLIENTE_AUSENTE: 'Cliente ausente', DIRECCION_INCORRECTA: 'Dirección incorrecta',
  MERCADERIA_DANADA: 'Mercadería dañada', OTRO: 'Otro',
}

export function AdminNovedadesPage() {
  const addToast = useToastStore((s) => s.addToast)

  const [novedades, setNovedades] = useState<NovedadApi[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [loading, setLoading] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [notaInput, setNotaInput] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  const fetchNovedades = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<NovedadApi[]>('/novedades')
      setNovedades(res.data)
    } catch {
      addToast('Error al cargar novedades', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchNovedades()
    api.get<{ data: ClienteOption[] }>('/clientes?limit=100')
      .then((r) => setClientes(r.data.data))
      .catch(() => {})
  }, [fetchNovedades])

  const novedadesFiltradas = novedades.filter((n) => {
    if (clienteId && n.guia.clienteId !== clienteId) return false
    if (fechaDesde && new Date(n.createdAt) < new Date(fechaDesde)) return false
    if (fechaHasta && new Date(n.createdAt) > new Date(fechaHasta + 'T23:59:59')) return false
    return true
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleAddSeguimiento = async (novedadId: string) => {
    const nota = notaInput[novedadId]?.trim()
    if (!nota) return
    setSubmitting(novedadId)
    try {
      await api.post(`/novedades/${novedadId}/seguimiento`, { nota })
      setNotaInput((prev) => ({ ...prev, [novedadId]: '' }))
      await fetchNovedades()
      addToast('Seguimiento agregado', 'success')
    } catch {
      addToast('Error al agregar seguimiento', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Novedades</h2>
        <p className="text-sm text-slate-500">Gestión y seguimiento de incidencias reportadas por los choferes.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Listado */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm text-slate-500">
            Total: <strong className="text-slate-900">{novedadesFiltradas.length}</strong>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 p-4 space-y-3">
            {novedadesFiltradas.length === 0 ? (
              <p className="text-sm text-slate-500">No hay novedades con los filtros aplicados.</p>
            ) : (
              novedadesFiltradas.map((n) => {
                const nota = notaInput[n.id] ?? ''
                return (
                  <div key={n.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          {tipoLabel[n.tipo] ?? n.tipo}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          {new Date(n.createdAt).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Guía: <span className="font-medium text-primary">{n.guia.numeroGuia}</span>
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-900">{n.descripcion}</p>

                    {/* Seguimientos */}
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Seguimiento ({n.seguimientos.length})
                      </h5>
                      {n.seguimientos.length > 0 && (
                        <ul className="mb-3 space-y-2">
                          {n.seguimientos.map((s) => (
                            <li key={s.id} className="rounded-lg bg-slate-50 py-2 pl-3 pr-2 text-sm text-slate-700">
                              <p>{s.nota}</p>
                              <p className="mt-1 text-[10px] text-slate-500">
                                {new Date(s.createdAt).toLocaleString('es-ES')}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2">
                        <input type="text" value={nota}
                          onChange={(e) => setNotaInput((prev) => ({ ...prev, [n.id]: e.target.value }))}
                          placeholder="Añadir nota de seguimiento..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSeguimiento(n.id)}
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
                        <button type="button" onClick={() => handleAddSeguimiento(n.id)}
                          disabled={!nota.trim() || submitting === n.id}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                          {submitting === n.id && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
