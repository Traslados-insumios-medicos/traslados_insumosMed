import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ModalMotion } from '../../components/ui/ModalMotion'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'
import { useGlobalLoadingStore } from '../../store/globalLoadingStore'
import { useDbRefresh } from '../../hooks/useDbRefresh'

interface Chofer { id: string; nombre: string; email: string; cedula?: string | null; celular: string; activo: boolean; usuarioId?: string | null }
interface ChoferDetalle extends Chofer { rol: string; clienteId?: string | null }
interface PaginatedResponse { data: Chofer[]; total: number; page: number; limit: number }
interface PasswordModalData { choferNombre: string; password: string }

function ToggleActivo({ activo, onToggle }: { activo: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activo ? 'bg-emerald-500' : 'bg-slate-200'}`}>
      <span className={`pointer-events-none inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${activo ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

const LIMIT = 10

export function AdminChoferesPage() {
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
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
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [nombreError, setNombreError] = useState('')
  const [cedulaError, setCedulaError] = useState('')
  const [celularError, setCelularError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordModal, setPasswordModal] = useState<PasswordModalData | null>(null)
  const [copied, setCopied] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailChofer, setDetailChofer] = useState<ChoferDetalle | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteConfirmChofer, setDeleteConfirmChofer] = useState<Chofer | null>(null)
  const [deleteChoferSubmitting, setDeleteChoferSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]*$/
  const CEDULA_REGEX = /^\d{0,10}$/
  const CELULAR_REGEX = /^\d{0,10}$/
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

  const handleNombreChange = (val: string) => {
    if (!NOMBRE_REGEX.test(val)) return // bloquea caracteres inválidos
    setNombre(val)
    if (!val?.trim()) {
      setNombreError('')
      return
    }
    setNombreError(!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(val) ? 'El nombre solo debe contener letras, tildes y ñ' : '')
  }

  const handleCedulaChange = (val: string) => {
    if (!CEDULA_REGEX.test(val)) return // bloquea letras y más de 10 dígitos
    setCedula(val)
    if (!val?.trim()) {
      setCedulaError('')
    } else if (val.length !== 10) {
      setCedulaError('La cédula debe tener exactamente 10 dígitos numéricos')
    } else {
      setCedulaError('')
    }
  }

  const handleCelularChange = (val: string) => {
    if (!CELULAR_REGEX.test(val)) return // bloquea letras y más de 10 dígitos
    setCelular(val)
    if (!val?.trim()) {
      setCelularError('')
    } else if (val.length !== 10) {
      setCelularError('El celular debe tener exactamente 10 dígitos numéricos')
    } else {
      setCelularError('')
    }
  }

  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (!val?.trim()) {
      setEmailError('')
      return
    }
    setEmailError(!EMAIL_REGEX.test(val) ? 'El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)' : '')
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchChoferes = useCallback(async (p: number, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get<PaginatedResponse>(`/usuarios?rol=CHOFER&page=${p}&limit=${LIMIT}`)
      setChoferes(res.data.data); setTotal(res.data.total); setPage(p)
    } catch { addToast('Error al cargar choferes', 'error') }
    finally { if (!silent) setLoading(false) }
  }, [addToast])

  useEffect(() => { fetchChoferes(1) }, [fetchChoferes])
  useDbRefresh('usuarios', () => fetchChoferes(page, true))

  const resetForm = () => {
    setEditingId(null); setNombre(''); setCedula(''); setCelular(''); setEmail('')
    setNombreError(''); setCedulaError(''); setCelularError(''); setEmailError('')
    setShowModal(false)
  }

  const handleEdit = (ch: Chofer) => { setEditingId(ch.id); setNombre(ch.nombre); setCedula(ch.cedula ?? ''); setCelular(ch.celular); setEmail(ch.email); setShowModal(true) }

  const handleGenerateTempPassword = async (ch: Chofer) => {
    // Los choferes son usuarios, así que usamos su id directamente
    const userId = ch.usuarioId || ch.id
    if (!userId) return
    
    const showLoading = useGlobalLoadingStore.getState().show
    const hideLoading = useGlobalLoadingStore.getState().hide
    
    showLoading()
    try {
      const res = await api.post<{ passwordTemporal: string; usuario: { nombre: string; email: string } }>(`/auth/generate-temp-password/${userId}`)
      
      // Cerrar el modal de editar
      resetForm()
      
      // Mostrar el modal de contraseña
      setPasswordModal({
        choferNombre: res.data.usuario.nombre,
        password: res.data.passwordTemporal,
      })
      addToast('Contraseña temporal generada', 'success')
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast(message || 'Error al generar contraseña temporal', 'error')
    } finally {
      hideLoading()
    }
  }

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailChofer(null)
    setDetailLoading(true)
    api.get<ChoferDetalle>(`/usuarios/${id}`)
      .then((r) => setDetailChofer(r.data))
      .catch(() => { addToast('No se pudo cargar detalle', 'error'); setDetailId(null) })
      .finally(() => setDetailLoading(false))
  }
  const closeDetail = () => { setDetailId(null); setDetailChofer(null) }

  const toggleThrottleRef = useRef<Map<string, number>>(new Map())

  const handleToggleActivo = async (id: string) => {
    const now = Date.now()
    const last = toggleThrottleRef.current.get(id) ?? 0
    if (now - last < 1000) return
    toggleThrottleRef.current.set(id, now)

    setChoferes((prev) => prev.map((ch) => ch.id === id ? { ...ch, activo: !ch.activo } : ch))
    try {
      const res = await api.patch<Chofer>(`/usuarios/${id}/toggle-activo`)
      setChoferes((prev) => prev.map((ch) => ch.id === id ? { ...ch, activo: res.data.activo } : ch))
    } catch {
      setChoferes((prev) => prev.map((ch) => ch.id === id ? { ...ch, activo: !ch.activo } : ch))
      addToast('Error al cambiar estado', 'error')
    }
  }

  const openDeleteChoferModal = (ch: Chofer) => setDeleteConfirmChofer(ch)

  const executeDeleteChofer = async () => {
    const ch = deleteConfirmChofer
    if (!ch) return
    setDeleteChoferSubmitting(true)
    try {
      await api.delete(`/usuarios/${ch.id}`)
      addToast('Chofer eliminado', 'success')
      if (detailId === ch.id) closeDetail()
      setDeleteConfirmChofer(null)
      await fetchChoferes(page)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (status === 409 && message) addToast(message, 'error')
      else addToast('No se pudo eliminar el chofer', 'error')
    } finally {
      setDeleteChoferSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre?.trim() || !email?.trim() || !cedula?.trim() || !celular?.trim()) {
      if (!nombre?.trim()) setNombreError(REQUIRED_MESSAGE)
      if (!cedula?.trim()) setCedulaError(REQUIRED_MESSAGE)
      if (!celular?.trim()) setCelularError(REQUIRED_MESSAGE)
      if (!email?.trim()) setEmailError(REQUIRED_MESSAGE)
      return
    }
    if (nombreError || cedulaError || celularError || emailError) return
    if (cedula.length !== 10) { setCedulaError('La cédula debe tener exactamente 10 dígitos numéricos'); return }
    if (celular.length !== 10) { setCelularError('El celular debe tener exactamente 10 dígitos numéricos'); return }
    if (!EMAIL_REGEX.test(email)) { setEmailError('El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        const res = await api.put<Chofer>(`/usuarios/${editingId}`, { nombre, cedula, celular, email })
        setChoferes((prev) => prev.map((ch) => ch.id === editingId ? res.data : ch))
        addToast('Chofer actualizado', 'success')
        await fetchChoferes(page)
        resetForm()
      } else {
        const res = await api.post<{ usuario: Chofer; passwordTemporal: string }>('/auth/register', { nombre, email, cedula, celular, rol: 'CHOFER' })
        setPasswordModal({ choferNombre: nombre, password: res.data.passwordTemporal })
        await fetchChoferes(1); resetForm()
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      addToast(status === 409 ? 'Ya existe un chofer con ese email o celular' : 'Error al guardar', 'error')
    } finally { setSubmitting(false) }
  }

  const totalActivos = choferes.filter((ch) => ch.activo).length
  const trunc = (str: string, max = 25) => str.length > max ? str.slice(0, max) + '...' : str

  // Filtrar choferes por búsqueda
  const choferesFiltrados = choferes.filter((ch) => {
    if (!searchTerm.trim()) return true
    const search = searchTerm.toLowerCase()
    return (
      ch.nombre.toLowerCase().includes(search) ||
      ch.email.toLowerCase().includes(search) ||
      ch.cedula?.toLowerCase().includes(search) ||
      ch.celular.toLowerCase().includes(search)
    )
  })

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

      {/* Buscador */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, email, cédula o celular..."
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

      {/* Modal */}
      <ModalMotion
        show={showModal}
        backdropClassName="bg-slate-900/40"
        panelClassName="w-full max-w-md rounded-2xl bg-white shadow-modal"
      >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-display text-base font-semibold text-slate-900">{editingId ? 'Editar chofer' : 'Nuevo chofer'}</h3>
              <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre *</label>
                  <span className={`text-[10px] ${nombre.length > 80 ? 'text-amber-500' : 'text-slate-400'}`}>{nombre.length}/100</span>
                </div>
                <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 ${nombreError ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-primary'}`}
                  value={nombre} onChange={(e) => handleNombreChange(e.target.value)} onBlur={() => {
                    if (!nombre?.trim()) {
                      setNombreError(REQUIRED_MESSAGE)
                      return
                    }
                    setNombreError('')
                  }} required maxLength={100} />
                {nombreError && <p className="mt-1 text-xs text-red-500">{nombreError}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cédula *</label>
                  <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 ${cedulaError ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-primary'}`}
                    value={cedula} onChange={(e) => handleCedulaChange(e.target.value)} onBlur={() => {
                      if (!cedula?.trim()) {
                        setCedulaError(REQUIRED_MESSAGE)
                        return
                      }
                      if (cedula.length !== 10) {
                        setCedulaError('La cédula debe tener exactamente 10 dígitos numéricos')
                        return
                      }
                      setCedulaError('')
                    }} placeholder="1712345678" inputMode="numeric" required />
                  {cedulaError && <p className="mt-1 text-xs text-red-500">{cedulaError}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Celular *</label>
                  <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 ${celularError ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-primary'}`}
                    value={celular} onChange={(e) => handleCelularChange(e.target.value)} onBlur={() => {
                      if (!celular?.trim()) {
                        setCelularError(REQUIRED_MESSAGE)
                        return
                      }
                      if (celular.length !== 10) {
                        setCelularError('El celular debe tener exactamente 10 dígitos numéricos')
                        return
                      }
                      setCelularError('')
                    }} placeholder="0987654321" inputMode="numeric" required />
                  {celularError && <p className="mt-1 text-xs text-red-500">{celularError}</p>}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email *</label>
                  <span className={`text-[10px] ${email.length > 120 ? 'text-amber-500' : 'text-slate-400'}`}>{email.length}/150</span>
                </div>
                <input type="email" className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 ${emailError ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-primary'}`}
                  value={email} onChange={(e) => handleEmailChange(e.target.value)} onBlur={() => {
                    if (!email?.trim()) {
                      setEmailError(REQUIRED_MESSAGE)
                      return
                    }
                    if (!EMAIL_REGEX.test(email)) {
                      setEmailError('El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)')
                      return
                    }
                    setEmailError('')
                  }} required maxLength={150} />
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
              </div>
              {editingId && (
                <div className="border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const chofer = choferes.find(ch => ch.id === editingId)
                      if (chofer) handleGenerateTempPassword(chofer)
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">key</span>
                    Generar contraseña temporal
                  </button>
                  <p className="mt-2 text-xs text-slate-500 text-center">
                    Genera una nueva contraseña temporal si el chofer olvidó su contraseña
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={submitting || !nombre?.trim() || !cedula?.trim() || !celular?.trim() || !email?.trim() || !!nombreError || !!cedulaError || !!celularError || !!emailError}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
                  {submitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                  {editingId ? 'Guardar' : 'Crear chofer'}
                </button>
              </div>
            </form>
      </ModalMotion>

      {/* Password modal */}
      <ModalMotion
        show={!!passwordModal}
        backdropClassName="bg-slate-900/40"
        panelClassName="w-full max-w-sm rounded-2xl bg-white shadow-modal"
      >
        {passwordModal && (
          <>
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
                  <button type="button" onClick={async () => {
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(passwordModal.password)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                        addToast('Contraseña copiada', 'success')
                      } else {
                        const textArea = document.createElement('textarea')
                        textArea.value = passwordModal.password
                        textArea.style.position = 'fixed'
                        textArea.style.left = '-999999px'
                        document.body.appendChild(textArea)
                        textArea.select()
                        document.execCommand('copy')
                        document.body.removeChild(textArea)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                        addToast('Contraseña copiada', 'success')
                      }
                    } catch (err) {
                      console.error('Error al copiar:', err)
                      addToast('No se pudo copiar la contraseña', 'error')
                    }
                  }}
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
          </>
        )}
      </ModalMotion>

      {/* Detalle chofer */}
      <ModalMotion
        show={!!detailId}
        backdropClassName="bg-slate-900/40"
        panelClassName="w-full max-w-md rounded-2xl bg-white shadow-modal"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-base font-semibold text-slate-900">Detalle del chofer</h3>
          <button type="button" onClick={closeDetail} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-4 p-6">
          {detailLoading && (
            <div className="flex justify-center py-6">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
            </div>
          )}
          {!detailLoading && detailChofer && (
            <>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</dt>
                  <dd className="break-words text-slate-900">
                    {detailChofer.nombre.length > 50 ? detailChofer.nombre.slice(0, 47) + '...' : detailChofer.nombre}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                  <dd className="break-words text-slate-900">
                    {detailChofer.email.length > 50 ? detailChofer.email.slice(0, 47) + '...' : detailChofer.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cédula</dt>
                  <dd className="text-slate-900">{detailChofer.cedula ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Celular</dt>
                  <dd className="text-slate-900">{detailChofer.celular}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</dt>
                  <dd className="text-slate-900">{detailChofer.rol}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</dt>
                  <dd className="text-slate-900">{detailChofer.activo ? 'Activo' : 'Inactivo'}</dd>
                </div>
              </dl>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={closeDetail} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cerrar</button>
                <button type="button" onClick={() => { closeDetail(); handleEdit(detailChofer) }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
                  <span className="material-symbols-outlined text-base">edit</span>
                  Editar
                </button>
              </div>
            </>
          )}
        </div>
      </ModalMotion>

      <ModalMotion show={!!deleteConfirmChofer} backdropClassName="bg-slate-900/40" panelClassName="w-full max-w-md rounded-2xl bg-white shadow-modal">
        {deleteConfirmChofer && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-display text-base font-semibold text-slate-900">Eliminar chofer</h3>
              <button type="button" onClick={() => !deleteChoferSubmitting && setDeleteConfirmChofer(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40" aria-label="Cerrar">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-slate-600">
                ¿Eliminar definitivamente a <span className="font-semibold text-slate-900">{deleteConfirmChofer.nombre}</span>? En la base de datos se eliminan <span className="font-semibold">todas las rutas</span> donde figura como chofer (paradas, guías, fotos y seguimiento) y después el chofer. No queda rastro operativo de esas rutas.
              </p>
              <p className="text-xs text-slate-500">
                Para solo desactivar el acceso, use el interruptor en la columna Estado.
              </p>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" disabled={deleteChoferSubmitting} onClick={() => setDeleteConfirmChofer(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" disabled={deleteChoferSubmitting} onClick={() => void executeDeleteChofer()}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {deleteChoferSubmitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                  Eliminar
                </button>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : choferesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">
              {searchTerm ? 'search_off' : 'local_shipping'}
            </span>
            <p className="mt-2 text-sm text-slate-400">
              {searchTerm ? 'No se encontraron choferes con ese criterio' : 'No hay choferes registrados'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Vista móvil */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {choferesFiltrados.map((ch) => (
                <div key={ch.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {ch.nombre.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">{trunc(ch.nombre)}</p>
                      <p className="text-xs text-slate-500">{trunc(ch.email)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-12">
                    <ToggleActivo activo={ch.activo} onToggle={() => handleToggleActivo(ch.id)} />
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openDetail(ch.id) }}
                        className="rounded p-1 text-slate-400 hover:text-primary" aria-label="Ver detalle">
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(ch) }}
                        className="rounded p-1 text-slate-400 hover:text-primary" aria-label="Editar">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteChoferModal(ch) }}
                        className="rounded p-1 text-slate-400 hover:text-red-600" aria-label="Eliminar">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop */}
            <table className="hidden w-full min-w-[700px] text-left text-sm sm:table">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {['Nombre', 'Cédula', 'Celular', 'Email', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {choferesFiltrados.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {ch.nombre.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{trunc(ch.nombre)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{ch.cedula ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{ch.celular}</td>
                    <td className="px-4 py-3 text-slate-500">{trunc(ch.email)}</td>
                    <td className="px-4 py-3">
                      <ToggleActivo activo={ch.activo} onToggle={() => handleToggleActivo(ch.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={(e) => { e.stopPropagation(); openDetail(ch.id) }}
                          className="rounded p-1 text-slate-400 transition-colors hover:text-primary"
                          title="Ver detalle" aria-label="Ver detalle">
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(ch) }}
                          className="rounded p-1 text-slate-400 transition-colors hover:text-primary"
                          title="Editar" aria-label="Editar">
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteChoferModal(ch) }}
                          className="rounded p-1 text-slate-400 transition-colors hover:text-red-600"
                          title="Eliminar de la base de datos" aria-label="Eliminar de la base de datos">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </>
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
