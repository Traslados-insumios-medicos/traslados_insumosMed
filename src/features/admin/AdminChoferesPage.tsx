import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

interface Chofer { id: string; nombre: string; email: string; cedula?: string | null; activo: boolean }
interface PaginatedResponse { data: Chofer[]; total: number; page: number; limit: number }
interface PasswordModalData { choferNombre: string; password: string }

const LIMIT = 20

export function AdminChoferesPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [email, setEmail] = useState('')
  const [passwordModal, setPasswordModal] = useState<PasswordModalData | null>(null)
  const [copied, setCopied] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchChoferes = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await api.get<PaginatedResponse>(`/usuarios?rol=CHOFER&page=${p}&limit=${LIMIT}`)
      setChoferes(res.data.data); setTotal(res.data.total); setPage(p)
    } catch { addToast('Error al cargar choferes', 'error') }
    finally { setLoading(false) }
  }, [addToast])

  useEffect(() => { fetchChoferes(1) }, [fetchChoferes])

  const resetForm = () => { setEditingId(null); setNombre(''); setCedula(''); setEmail(''); setShowModal(false) }

  const handleEdit = (ch: Chofer) => { setEditingId(ch.id); setNombre(ch.nombre); setCedula(ch.cedula ?? ''); setEmail(ch.email); setShowModal(true) }

  const handleToggleActivo = async (id: string) => {
    try {
      const res = await api.patch<Chofer>(`/usuarios/${id}/toggle-activo`)
      setChoferes((prev) => prev.map((ch) => ch.id === id ? { ...ch, activo: res.data.activo } : ch))
      addToast('Estado actualizado', 'success')
    } catch { addToast('Error al cambiar estado', 'error') }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre || !email) return
    setSubmitting(true)
    try {
      if (editingId) {
        const res = await api.put<Chofer>(`/usuarios/${editingId}`, { nombre, cedula: cedula || undefined, email })
        setChoferes((prev) => prev.map((ch) => ch.id === editingId ? res.data : ch))
        addToast('Chofer actualizado', 'success'); resetForm()
      } else {
        const res = await api.post<{ usuario: Chofer; passwordTemporal: string }>('/auth/register', { nombre, email, cedula: cedula || undefined, rol: 'CHOFER' })
        setPasswordModal({ choferNombre: nombre, password: res.data.passwordTemporal })
        await fetchChoferes(1); resetForm()
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      addToast(status === 409 ? 'Ya existe un chofer con ese email' : 'Error al guardar', 'error')
    } finally { setSubmitting(false) }
  }

  const totalActivos = choferes.filter((ch) => ch.activo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">Choferes</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gestión de conductores y asignaciones</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{totalActivos} activos</span>
          <button type="button" onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors">
            <span className="material-symbols-outlined text-base">add</span>Nuevo chofer
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-modal">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-display text-base font-semibold text-slate-900">{editingId ? 'Editar chofer' : 'Nuevo chofer'}</h3>
              <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre *</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cédula</label>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="1712345678" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email *</label>
                <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
                  {submitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                  {editingId ? 'Guardar' : 'Crear chofer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-modal">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-display text-base font-semibold text-slate-900">Chofer creado</h3>
              <button type="button" onClick={() => { setPasswordModal(null); setCopied(false) }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-slate-600"><span className="font-semibold">{passwordModal.choferNombre}</span> fue creado exitosamente.</p>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Contraseña temporal</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 shadow-sm">{passwordModal.password}</code>
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(passwordModal.password); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark">
                    <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">No se volverá a mostrar esta contraseña.</p>
              <div className="flex justify-end">
                <button type="button" onClick={() => { setPasswordModal(null); setCopied(false) }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">Entendido</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : choferes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">local_shipping</span>
            <p className="mt-2 text-sm text-slate-400">No hay choferes registrados</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Nombre', 'Cédula', 'Email', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {choferes.map((ch) => (
                <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {ch.nombre.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{ch.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{ch.cedula ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{ch.email}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleToggleActivo(ch.id)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${ch.activo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {ch.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleEdit(ch)} className="text-xs font-semibold text-primary hover:underline">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">{total} chofer{total !== 1 ? 'es' : ''}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchChoferes(page - 1)} disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Anterior</button>
            <span className="text-xs text-slate-500">{page} / {totalPages}</span>
            <button type="button" onClick={() => fetchChoferes(page + 1)} disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
