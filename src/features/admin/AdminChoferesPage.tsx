import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

interface Chofer {
  id: string
  nombre: string
  email: string
  cedula?: string | null
  activo: boolean
}

interface PaginatedResponse {
  data: Chofer[]
  total: number
  page: number
  limit: number
}

interface PasswordModalData {
  choferNombre: string
  password: string
}

const LIMIT = 20

export function AdminChoferesPage() {
  const addToast = useToastStore((s) => s.addToast)

  // List state
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Form modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [email, setEmail] = useState('')

  // Password modal
  const [passwordModal, setPasswordModal] = useState<PasswordModalData | null>(null)
  const [copied, setCopied] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchChoferes = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await api.get<PaginatedResponse>(`/usuarios?rol=CHOFER&page=${p}&limit=${LIMIT}`)
      setChoferes(res.data.data)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      addToast('Error al cargar choferes', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchChoferes(1)
  }, [fetchChoferes])

  const resetForm = () => {
    setEditingId(null)
    setNombre('')
    setCedula('')
    setEmail('')
    setShowModal(false)
  }

  const handleEdit = (ch: Chofer) => {
    setEditingId(ch.id)
    setNombre(ch.nombre)
    setCedula(ch.cedula ?? '')
    setEmail(ch.email)
    setShowModal(true)
  }

  const handleToggleActivo = async (id: string) => {
    try {
      const res = await api.patch<Chofer>(`/usuarios/${id}/toggle-activo`)
      setChoferes((prev) => prev.map((ch) => (ch.id === id ? { ...ch, activo: res.data.activo } : ch)))
      addToast('Estado actualizado', 'success')
    } catch {
      addToast('Error al cambiar estado', 'error')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre || !email) return
    setSubmitting(true)
    try {
      if (editingId) {
        const res = await api.put<Chofer>(`/usuarios/${editingId}`, {
          nombre,
          cedula: cedula || undefined,
          email,
        })
        setChoferes((prev) => prev.map((ch) => (ch.id === editingId ? res.data : ch)))
        addToast('Chofer actualizado', 'success')
        resetForm()
      } else {
        const res = await api.post<{ usuario: Chofer; passwordTemporal: string }>(
          '/auth/register',
          {
            nombre,
            email,
            cedula: cedula || undefined,
            rol: 'CHOFER',
          },
        )
        setPasswordModal({
          choferNombre: nombre,
          password: res.data.passwordTemporal,
        })
        await fetchChoferes(1)
        resetForm()
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        addToast('Ya existe un chofer con ese email o cédula', 'error')
      } else {
        addToast('Error al guardar chofer', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyPassword = async () => {
    if (!passwordModal) return
    try {
      await navigator.clipboard.writeText(passwordModal.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('No se pudo copiar', 'error')
    }
  }

  const totalActivos = choferes.filter((ch) => ch.activo).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choferes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestión de choferes y asignaciones de rutas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {totalActivos} activos
          </span>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nuevo chofer
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar chofer' : 'Nuevo chofer'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre *</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Cédula</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej: 1712345678"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Email *</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting && (
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  )}
                  {editingId ? 'Guardar cambios' : 'Crear chofer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Temporal Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chofer creado</h3>
              <button
                type="button"
                onClick={() => { setPasswordModal(null); setCopied(false) }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                El chofer <span className="font-semibold">{passwordModal.choferNombre}</span> fue creado exitosamente.
              </p>
              <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Contraseña temporal
                </p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded bg-white px-3 py-2 text-base font-mono font-bold text-slate-900 dark:bg-slate-700 dark:text-white shadow-sm">
                    {passwordModal.password}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                  >
                    <span className="material-symbols-outlined text-base">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparta esta contraseña con el usuario. No se volverá a mostrar.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setPasswordModal(null); setCopied(false) }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : choferes.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No hay choferes registrados.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cédula</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:table-cell">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {choferes.map((ch) => (
                <tr key={ch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{ch.nombre}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {ch.cedula ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 dark:text-slate-400 md:table-cell">
                    {ch.email}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActivo(ch.id)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        ch.activo
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {ch.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(ch)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            {total} chofer{total !== 1 ? 'es' : ''} en total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchChoferes(page - 1)}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
            >
              Anterior
            </button>
            <span className="text-slate-500 dark:text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => fetchChoferes(page + 1)}
              disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
