import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MapboxAddressInput } from '../../components/ui/MapboxAddressInput'
import { ModalMotion } from '../../components/ui/ModalMotion'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'
import { useDbRefresh } from '../../hooks/useDbRefresh'

type TipoCliente = 'PRINCIPAL' | 'SECUNDARIO'
interface ClientePrincipalRef { id: string; nombre: string }
interface Cliente {
  id: string; nombre: string; ruc: string; direccion: string
  lat?: number | null; lng?: number | null
  telefonoContacto?: string | null; emailContacto?: string | null
  activo: boolean; tipo: TipoCliente; clientePrincipalId?: string | null
  clientePrincipal?: ClientePrincipalRef | null
  clientesSecundarios?: { id: string; nombre: string; ruc: string; activo: boolean }[]
}
interface PaginatedResponse { data: Cliente[]; total: number; page: number; limit: number }
interface PasswordModalData { clienteNombre: string; password: string }

function ToggleActivo({ activo, onToggle }: { activo: boolean; onToggle: () => void }) {
  const base = 'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
  const thumb = 'pointer-events-none inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200'
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`${base} ${activo ? 'bg-emerald-500' : 'bg-slate-200'}`}>
      <span className={`${thumb} ${activo ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

const LIMIT = 10

export function AdminClientesPage() {
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
  const addToast = useToastStore((s) => s.addToast)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'' | TipoCliente>('')
  const [principales, setPrincipales] = useState<ClientePrincipalRef[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [direccion, setDireccion] = useState('')
  const [coordsDireccion, setCoordsDireccion] = useState<{ lat: number; lng: number } | null>(null)
  const [telefono, setTelefono] = useState('')
  const [emailContacto, setEmailContacto] = useState('')
  const [tipo, setTipo] = useState<TipoCliente>('SECUNDARIO')
  const [clientePrincipalId, setClientePrincipalId] = useState('')
  const [usarMismoEmail, setUsarMismoEmail] = useState(false)
  const [tipoOriginal, setTipoOriginal] = useState<TipoCliente | null>(null)
  const [showTipoChangeModal, setShowTipoChangeModal] = useState(false)
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [usuarioEmail, setUsuarioEmail] = useState('')
  const [passwordModal, setPasswordModal] = useState<PasswordModalData | null>(null)
  const [copied, setCopied] = useState(false)
  const [filtroPrincipal, setFiltroPrincipal] = useState('Cliente Principal')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailCliente, setDetailCliente] = useState<Cliente | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteConfirmCliente, setDeleteConfirmCliente] = useState<Cliente | null>(null)
  const [deleteClienteSubmitting, setDeleteClienteSubmitting] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // Errores de validación
  const [nombreError, setNombreError] = useState('')
  const [rucError, setRucError] = useState('')
  const [telefonoError, setTelefonoError] = useState('')
  const [emailContactoError, setEmailContactoError] = useState('')
  const [usuarioNombreError, setUsuarioNombreError] = useState('')
  const [usuarioEmailError, setUsuarioEmailError] = useState('')
  const [direccionError, setDireccionError] = useState('')

  const NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]*$/
  const RUC_REGEX = /^\d{0,13}$/
  const TELEFONO_REGEX = /^\d{0,10}$/
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

  const handleNombreChange = (val: string) => {
    if (!NOMBRE_REGEX.test(val)) return
    setNombre(val)
    if (!val.trim()) {
      setNombreError('')
      return
    }
    setNombreError(!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(val) ? 'El nombre solo debe contener letras, tildes y ñ' : '')
  }

  const handleRucChange = (val: string) => {
    if (!RUC_REGEX.test(val)) return
    setRuc(val)
    if (!val.trim()) {
      setRucError('')
      return
    }
    setRucError(val.length !== 13 ? 'El RUC debe tener exactamente 13 dígitos numéricos' : '')
  }

  const handleTelefonoChange = (val: string) => {
    if (!TELEFONO_REGEX.test(val)) return
    setTelefono(val)
    if (!val.trim()) {
      setTelefonoError('')
      return
    }
    setTelefonoError(val.length !== 10 ? 'El teléfono debe tener exactamente 10 dígitos' : '')
  }

  const handleEmailContactoChange = (val: string) => {
    setEmailContacto(val)
    if (!val) {
      setEmailContactoError('El email es obligatorio')
    } else if (!EMAIL_REGEX.test(val)) {
      setEmailContactoError('El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)')
    } else {
      setEmailContactoError('')
    }
  }

  const handleUsuarioNombreChange = (val: string) => {
    if (!NOMBRE_REGEX.test(val)) return
    setUsuarioNombre(val)
    if (!val.trim()) {
      setUsuarioNombreError('')
      return
    }
    setUsuarioNombreError(!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(val) ? 'El nombre solo debe contener letras, tildes y ñ' : '')
  }

  const handleUsuarioEmailChange = (val: string) => {
    setUsuarioEmail(val)
    if (!val.trim()) {
      setUsuarioEmailError('')
      return
    }
    setUsuarioEmailError(!EMAIL_REGEX.test(val) ? 'El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)' : '')
  }
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchClientes = useCallback(async (p: number, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (filtroTipo) params.set('tipo', filtroTipo)
      const res = await api.get<PaginatedResponse>(`/clientes?${params}`)
      setClientes(res.data.data); setTotal(res.data.total); setPage(p)
    } catch { addToast('Error al cargar clientes', 'error') }
    finally { if (!silent) setLoading(false) }
  }, [addToast, filtroTipo])

  useEffect(() => { fetchClientes(1) }, [fetchClientes])
  useDbRefresh('clientes', () => fetchClientes(page, true))
  useEffect(() => {
    api.get<PaginatedResponse>('/clientes?tipo=PRINCIPAL&limit=100')
      .then((r) => setPrincipales(r.data.data.map((c) => ({ id: c.id, nombre: c.nombre }))))
      .catch(() => {})
  }, [])

  // Sincronizar email de usuario con email de contacto cuando está marcado "usar mismo correo"
  useEffect(() => {
    if (usarMismoEmail) {
      setUsuarioEmail(emailContacto)
      if (emailContacto && EMAIL_REGEX.test(emailContacto)) {
        setUsuarioEmailError('')
      }
    }
  }, [emailContacto, usarMismoEmail])

  const resetForm = () => {
    setEditingId(null); setNombre(''); setRuc(''); setDireccion(''); setCoordsDireccion(null)
    setTelefono(''); setEmailContacto(''); setTipo('SECUNDARIO'); setTipoOriginal(null)
    setClientePrincipalId(''); setUsarMismoEmail(false)
    setUsuarioNombre(''); setUsuarioEmail(''); setShowModal(false)
    setNombreError(''); setRucError(''); setTelefonoError('')
    setEmailContactoError(''); setUsuarioNombreError(''); setUsuarioEmailError('')
    setDireccionError('')
  }

  const handleEdit = (c: Cliente) => {
    setEditingId(c.id); setNombre(c.nombre); setRuc(c.ruc)
    setDireccion(c.direccion)
    setCoordsDireccion(c.lat && c.lng ? { lat: c.lat, lng: c.lng } : null)
    setTelefono(c.telefonoContacto ?? '')
    setEmailContacto(c.emailContacto ?? ''); setTipo(c.tipo)
    setTipoOriginal(c.tipo)
    setClientePrincipalId(c.clientePrincipalId ?? '')
    setUsuarioNombre(''); setUsuarioEmail('')
    setShowModal(true)
  }

  const toggleThrottleRef = useRef<Map<string, number>>(new Map())

  const handleToggleActivo = async (id: string) => {
    const now = Date.now()
    const last = toggleThrottleRef.current.get(id) ?? 0
    if (now - last < 1000) return
    toggleThrottleRef.current.set(id, now)

    setClientes((prev) => prev.map((c) => c.id === id ? { ...c, activo: !c.activo } : c))
    try {
      const res = await api.patch<Cliente>(`/clientes/${id}/toggle-activo`)
      setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, activo: res.data.activo } : c)))
    } catch {
      setClientes((prev) => prev.map((c) => c.id === id ? { ...c, activo: !c.activo } : c))
      addToast('Error al cambiar estado', 'error')
    }
  }

  const openDetail = (id: string) => {
    setDetailId(id)
    setDetailCliente(null)
    setDetailLoading(true)
    api.get<Cliente>(`/clientes/${id}`)
      .then((r) => setDetailCliente(r.data))
      .catch(() => { addToast('Error al cargar detalle', 'error'); setDetailId(null) })
      .finally(() => setDetailLoading(false))
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetailCliente(null)
  }

  const openDeleteClienteModal = (c: Cliente) => setDeleteConfirmCliente(c)

  const executeDeleteCliente = async () => {
    const c = deleteConfirmCliente
    if (!c) return
    setDeleteClienteSubmitting(true)
    try {
      await api.delete(`/clientes/${c.id}`)
      if (detailId === c.id) closeDetail()
      addToast(c.tipo === 'PRINCIPAL' ? 'Cliente y datos vinculados eliminados' : 'Cliente eliminado', 'success')
      setDeleteConfirmCliente(null)
      await fetchClientes(page)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (status === 409 && message) addToast(message, 'error')
      else addToast('No se pudo eliminar el cliente', 'error')
    } finally {
      setDeleteClienteSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !ruc.trim() || !direccion.trim() || !telefono.trim() || !emailContacto.trim()) {
      if (!nombre.trim()) setNombreError(REQUIRED_MESSAGE)
      if (!ruc.trim()) setRucError(REQUIRED_MESSAGE)
      if (!direccion.trim()) setDireccionError(REQUIRED_MESSAGE)
      if (!telefono.trim()) setTelefonoError(REQUIRED_MESSAGE)
      if (!emailContacto.trim()) setEmailContactoError(REQUIRED_MESSAGE)
      return
    }
    if (((editingId && tipoOriginal === 'SECUNDARIO' && tipo === 'PRINCIPAL') || (!editingId && tipo === 'PRINCIPAL'))) {
      if (!usuarioNombre.trim()) setUsuarioNombreError(REQUIRED_MESSAGE)
      if (!usuarioEmail.trim()) setUsuarioEmailError(REQUIRED_MESSAGE)
      if (!usuarioNombre.trim() || !usuarioEmail.trim()) return
    }
    if (nombreError || rucError || telefonoError || emailContactoError || usuarioNombreError || usuarioEmailError) return
    if (ruc.length !== 13) { setRucError('El RUC debe tener exactamente 13 dígitos numéricos'); return }
    if (!EMAIL_REGEX.test(emailContacto)) { setEmailContactoError('El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)'); return }
    
    // Detectar cambio de tipo PRINCIPAL a SECUNDARIO
    if (editingId && tipoOriginal === 'PRINCIPAL' && tipo === 'SECUNDARIO') {
      setShowTipoChangeModal(true)
      return
    }
    
    setSubmitting(true)
    try {
      if (editingId) {
        const res = await api.put<Cliente>(`/clientes/${editingId}`, {
          nombre, ruc, direccion,
          lat: coordsDireccion?.lat ?? undefined,
          lng: coordsDireccion?.lng ?? undefined,
          telefonoContacto: telefono,
          emailContacto: emailContacto, tipo,
          clientePrincipalId: tipo === 'SECUNDARIO' ? (clientePrincipalId || undefined) : undefined,
        })
        setClientes((prev) => prev.map((c) => (c.id === editingId ? res.data : c)))
        addToast('Cliente actualizado', 'success')
        
        // SOLO crear usuario si cambió de SECUNDARIO a PRINCIPAL (no si ya era PRINCIPAL)
        if (tipoOriginal === 'SECUNDARIO' && tipo === 'PRINCIPAL' && usuarioNombre && usuarioEmail) {
          try {
            const userRes = await api.post<{ usuario: object; passwordTemporal: string }>('/auth/register', {
              nombre: usuarioNombre, email: usuarioEmail, rol: 'CLIENTE', clienteId: editingId,
            })
            setPasswordModal({ clienteNombre: usuarioNombre, password: userRes.data.passwordTemporal })
          } catch (userErr: unknown) {
            const userMessage = (userErr as { response?: { data?: { message?: string } } })?.response?.data?.message
            addToast(userMessage || 'Error al crear usuario de acceso', 'error')
          }
        }
        
        await fetchClientes(page)
        resetForm()
      } else {
        const clienteRes = await api.post<Cliente>('/clientes', {
          nombre, ruc, direccion,
          lat: coordsDireccion?.lat ?? undefined,
          lng: coordsDireccion?.lng ?? undefined,
          telefonoContacto: telefono,
          emailContacto: emailContacto, tipo,
          clientePrincipalId: tipo === 'SECUNDARIO' ? (clientePrincipalId || undefined) : undefined,
        })
        addToast('Cliente creado', 'success')
        if (tipo === 'PRINCIPAL' && usuarioNombre && usuarioEmail) {
          const userRes = await api.post<{ usuario: object; passwordTemporal: string }>('/auth/register', {
            nombre: usuarioNombre, email: usuarioEmail, rol: 'CLIENTE', clienteId: clienteRes.data.id,
          })
          setPasswordModal({ clienteNombre: usuarioNombre, password: userRes.data.passwordTemporal })
        }
        await fetchClientes(1); resetForm()
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const responseData = (err as { response?: { data?: any } })?.response?.data
      const message = responseData?.message
      const errors = responseData?.errors
      
      if (status === 409) {
        addToast(message || 'Ya existe un cliente con ese RUC', 'error')
      } else if (errors && Array.isArray(errors) && errors.length > 0) {
        // Mostrar el primer error de validación de Zod
        addToast(errors[0].message || 'Datos inválidos', 'error')
      } else {
        addToast(message || 'Error al guardar cliente', 'error')
      }
    } finally { setSubmitting(false) }
  }

  const handleCopyPassword = async () => {
    if (!passwordModal) return
    try {
      // Intentar usar la API moderna del portapapeles
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(passwordModal.password)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        addToast('Contraseña copiada', 'success')
      } else {
        // Fallback para navegadores que no soportan clipboard API
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
  }

  const totalActivos = clientes.filter((c) => c.activo).length

  // Filtrado combinado: búsqueda general + filtro de tipo + filtro de principal
  const clientesFiltrados = clientes.filter((c) => {
    // Filtro de búsqueda general
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      const match = c.nombre.toLowerCase().includes(q) ||
        c.ruc.includes(busqueda) ||
        (c.emailContacto ?? '').toLowerCase().includes(q)
      if (!match) return false
    }
    
    // Filtro de tipo (Principal/Secundario/Todos)
    if (filtroTipo && c.tipo !== filtroTipo) return false
    
    // Filtro de cliente principal (solo para secundarios)
    if (filtroPrincipal && filtroPrincipal !== 'Cliente Principal' && c.tipo === 'SECUNDARIO') {
      const principalNombre = c.clientePrincipal?.nombre?.toLowerCase() || ''
      if (!principalNombre.includes(filtroPrincipal.toLowerCase())) return false
    }
    
    return true
  })

  const trunc = (str: string, max = 47) =>
    str.length > max ? str.slice(0, max) + '...' : str

  const actionIconClass = 'flex items-center justify-center rounded p-1.5 text-slate-400 transition-colors hover:text-primary'
  const rowActions = (c: Cliente) => (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); openDetail(c.id) }} className={actionIconClass} title="Ver detalle" aria-label="Ver detalle">
        <span className="material-symbols-outlined text-base">visibility</span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(c) }} className={actionIconClass} title="Editar" aria-label="Editar">
        <span className="material-symbols-outlined text-base">edit</span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); openDeleteClienteModal(c) }} className={`${actionIconClass} hover:text-red-600`} title="Eliminar de la base de datos" aria-label="Eliminar de la base de datos">
        <span className="material-symbols-outlined text-base">delete</span>
      </button>
    </>
  )


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clientes</h2>
          <p className="text-sm text-slate-500">Gestión de clientes corporativos de logística médica.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {(['', 'PRINCIPAL', 'SECUNDARIO'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setFiltroTipo(t)}
                className={['rounded-md px-3 py-1.5 text-xs font-semibold transition-all', filtroTipo === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'].join(' ')}>
                {t === '' ? 'Todos' : t === 'PRINCIPAL' ? 'Principales' : 'Secundarios'}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{totalActivos} activos</span>
          <button type="button" onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow hover:bg-primary/90">
            <span className="material-symbols-outlined text-base">add</span> Nuevo cliente
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, RUC o email..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        {busqueda && (
          <button type="button" onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      <ModalMotion show={showModal} backdropClassName="bg-black/50" panelClassName="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['PRINCIPAL', 'SECUNDARIO'] as TipoCliente[]).map((t) => (
                <label key={t} className={['flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-3 transition-all', tipo === t ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'].join(' ')}>
                  <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                  <div className={['flex size-9 shrink-0 items-center justify-center rounded-lg', tipo === t ? 'bg-primary/10' : 'bg-slate-100'].join(' ')}>
                    <span className={['material-symbols-outlined text-[18px]', tipo === t ? 'text-primary' : 'text-slate-400'].join(' ')}>
                      {t === 'PRINCIPAL' ? 'corporate_fare' : 'location_on'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={['text-sm font-semibold', tipo === t ? 'text-primary' : 'text-slate-800'].join(' ')}>
                      {t === 'PRINCIPAL' ? 'Principal' : 'Secundario'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {t === 'PRINCIPAL' ? 'Empresa' : 'Punto entrega'}
                    </p>
                  </div>
                  {tipo === t && (
                    <span className="ml-auto shrink-0 material-symbols-outlined text-base text-primary">check_circle</span>
                  )}
                </label>
              ))}
            </div>
          </div>
          {tipo === 'SECUNDARIO' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cliente principal</label>
              <select value={clientePrincipalId} onChange={(e) => setClientePrincipalId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Sin asignar</option>
                {principales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre *</label>
                <span className={`text-[10px] ${nombre.length > 80 ? 'text-amber-500' : 'text-slate-400'}`}>{nombre.length}/100</span>
              </div>
              <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${nombreError ? 'border-red-400' : 'border-slate-300'}`}
                value={nombre} onChange={(e) => handleNombreChange(e.target.value)} onBlur={() => {
                  if (!nombre.trim()) {
                    setNombreError(REQUIRED_MESSAGE)
                    return
                  }
                  setNombreError('')
                }} required maxLength={100} />
              {nombreError && <p className="text-xs text-red-500">{nombreError}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">RUC *</label>
              <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${rucError ? 'border-red-400' : 'border-slate-300'}`}
                value={ruc} onChange={(e) => handleRucChange(e.target.value)} onBlur={() => {
                  if (!ruc.trim()) {
                    setRucError(REQUIRED_MESSAGE)
                    return
                  }
                  if (ruc.length !== 13) {
                    setRucError('El RUC debe tener exactamente 13 dígitos numéricos')
                    return
                  }
                  setRucError('')
                }} required inputMode="numeric" />
              {rucError && <p className="text-xs text-red-500">{rucError}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dirección *</label>
            <MapboxAddressInput
              value={direccion}
              coords={coordsDireccion}
              onChange={(val, coords) => {
                setDireccion(val)
                if (val.trim()) setDireccionError('')
                if (coords) setCoordsDireccion(coords)
              }}
            />
            {direccionError && <p className="text-xs text-red-500">{direccionError}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teléfono *</label>
              <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${telefonoError ? 'border-red-400' : 'border-slate-300'}`}
                value={telefono} onChange={(e) => handleTelefonoChange(e.target.value)} onBlur={() => {
                  if (!telefono.trim()) {
                    setTelefonoError(REQUIRED_MESSAGE)
                    return
                  }
                  if (telefono.length !== 10) {
                    setTelefonoError('El teléfono debe tener exactamente 10 dígitos')
                    return
                  }
                  setTelefonoError('')
                }} inputMode="numeric" required />
              {telefonoError && <p className="text-xs text-red-500">{telefonoError}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email *</label>
                <span className={`text-[10px] ${emailContacto.length > 120 ? 'text-amber-500' : 'text-slate-400'}`}>{emailContacto.length}/150</span>
              </div>
              <input type="email" className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${emailContactoError ? 'border-red-400' : 'border-slate-300'}`}
                value={emailContacto} onChange={(e) => handleEmailContactoChange(e.target.value)} onBlur={() => {
                  if (!emailContacto.trim()) {
                    setEmailContactoError(REQUIRED_MESSAGE)
                    return
                  }
                  if (!EMAIL_REGEX.test(emailContacto)) {
                    setEmailContactoError('El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)')
                    return
                  }
                  setEmailContactoError('')
                }} maxLength={150} size={50} required />
              {emailContactoError && <p className="text-xs text-red-500">{emailContactoError}</p>}
            </div>
          </div>
          {((editingId && tipoOriginal === 'SECUNDARIO' && tipo === 'PRINCIPAL') || (!editingId && tipo === 'PRINCIPAL')) && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Usuario de acceso</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre usuario *</label>
                  <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${usuarioNombreError ? 'border-red-400' : 'border-slate-300'}`}
                    value={usuarioNombre} onChange={(e) => handleUsuarioNombreChange(e.target.value)} onBlur={() => {
                      if (!usuarioNombre.trim()) {
                        setUsuarioNombreError(REQUIRED_MESSAGE)
                        return
                      }
                      setUsuarioNombreError('')
                    }} required />
                  {usuarioNombreError && <p className="text-xs text-red-500">{usuarioNombreError}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email usuario *</label>
                    <span className={`text-[10px] ${usuarioEmail.length > 120 ? 'text-amber-500' : 'text-slate-400'}`}>{usuarioEmail.length}/150</span>
                  </div>
                  <input type="email" className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${usuarioEmailError ? 'border-red-400' : 'border-slate-300'}`}
                    value={usuarioEmail} onChange={(e) => handleUsuarioEmailChange(e.target.value)} onBlur={() => {
                      if (!usuarioEmail.trim()) {
                        setUsuarioEmailError(REQUIRED_MESSAGE)
                        return
                      }
                      if (!EMAIL_REGEX.test(usuarioEmail)) {
                        setUsuarioEmailError('El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)')
                        return
                      }
                      setUsuarioEmailError('')
                    }} required maxLength={150} disabled={usarMismoEmail} />
                  {usuarioEmailError && <p className="text-xs text-red-500">{usuarioEmailError}</p>}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={usarMismoEmail} onChange={(e) => {
                  setUsarMismoEmail(e.target.checked)
                  if (e.target.checked) {
                    setUsuarioEmail(emailContacto)
                    setUsuarioEmailError('')
                  }
                }} className="rounded" />
                <span className="text-xs text-slate-600">Usar el mismo correo del cliente</span>
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={
              submitting || 
              !nombre || !ruc || !direccion || !telefono || !emailContacto ||
              !!nombreError || !!rucError || !!telefonoError || !!emailContactoError || 
              !!usuarioNombreError || !!usuarioEmailError ||
              (((editingId && tipoOriginal === 'SECUNDARIO' && tipo === 'PRINCIPAL') || (!editingId && tipo === 'PRINCIPAL')) && (!usuarioNombre || !usuarioEmail))
            }
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60">
              {submitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
              {editingId ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </ModalMotion>

      <ModalMotion show={!!passwordModal} backdropClassName="bg-black/50" panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {passwordModal && (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Usuario creado</h3>
              <button type="button" onClick={() => { setPasswordModal(null); setCopied(false) }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-slate-600">El usuario <span className="font-semibold">{passwordModal.clienteNombre}</span> fue creado exitosamente.</p>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Contraseña temporal</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded-lg bg-white px-3 py-2.5 font-mono font-bold text-slate-900 shadow-sm">{passwordModal.password}</code>
                  <button type="button" onClick={handleCopyPassword}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                    <span className="material-symbols-outlined text-base">{copied ? 'check' : 'content_copy'}</span>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => { setPasswordModal(null); setCopied(false) }}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90">Entendido</button>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      <ModalMotion show={!!deleteConfirmCliente} backdropClassName="bg-black/50" panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {deleteConfirmCliente && (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Eliminar cliente</h3>
              <button type="button" onClick={() => !deleteClienteSubmitting && setDeleteConfirmCliente(null)} className="text-slate-400 hover:text-slate-600 disabled:opacity-40" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-slate-600">
                ¿Eliminar definitivamente a <span className="font-semibold text-slate-900">{deleteConfirmCliente.nombre}</span>? Se eliminan en la base todas sus guías y paradas, el usuario de panel cliente si existe y <span className="font-semibold">cualquier ruta que quede vacía</span> (sin paradas) con todo lo vinculado. Rutas compartidas con otros clientes siguen si los demás puntos permanecen.
              </p>
              {deleteConfirmCliente.tipo === 'PRINCIPAL' && (deleteConfirmCliente.clientesSecundarios?.length ?? 0) > 0 && (
                <p className="text-xs font-medium text-amber-700">
                  Es principal: también se eliminarán todos sus clientes secundarios ({deleteConfirmCliente.clientesSecundarios!.length}) y sus datos vinculados.
                </p>
              )}
              <p className="text-xs text-slate-500">
                Para solo desactivar el acceso, use el interruptor en la columna Estado.
              </p>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" disabled={deleteClienteSubmitting} onClick={() => setDeleteConfirmCliente(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" disabled={deleteClienteSubmitting} onClick={() => void executeDeleteCliente()}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                  {deleteClienteSubmitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                  Eliminar
                </button>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      <ModalMotion show={showTipoChangeModal} backdropClassName="bg-black/50" panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <span className="material-symbols-outlined text-amber-600">warning</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Cambio de tipo de cliente</h3>
              <p className="mt-2 text-sm text-slate-600">
                Al cambiar este cliente de <span className="font-semibold">Principal</span> a <span className="font-semibold">Secundario</span>, se eliminará el usuario de acceso asociado y perderá acceso al sistema.
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                ¿Desea continuar con este cambio?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setShowTipoChangeModal(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                setShowTipoChangeModal(false)
                setSubmitting(true)
                try {
                  await api.put<Cliente>(`/clientes/${editingId}`, {
                    nombre, direccion,
                    lat: coordsDireccion?.lat ?? undefined,
                    lng: coordsDireccion?.lng ?? undefined,
                    telefonoContacto: telefono,
                    emailContacto: emailContacto, tipo,
                    clientePrincipalId: tipo === 'SECUNDARIO' ? (clientePrincipalId || undefined) : undefined,
                  })
                  addToast('Cliente actualizado y usuario de acceso eliminado', 'success')
                  await fetchClientes(page)
                  resetForm()
                } catch (err: unknown) {
                  const status = (err as { response?: { status?: number } })?.response?.status
                  const responseData = (err as { response?: { data?: any } })?.response?.data
                  const message = responseData?.message
                  const errors = responseData?.errors
                  
                  if (status === 409) {
                    addToast(message || 'Ya existe un cliente con ese RUC', 'error')
                  } else if (errors && Array.isArray(errors) && errors.length > 0) {
                    addToast(errors[0].message || 'Datos inválidos', 'error')
                  } else {
                    addToast(message || 'Error al guardar cliente', 'error')
                  }
                } finally {
                  setSubmitting(false)
                }
              }}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Sí, cambiar a Secundario
            </button>
          </div>
        </div>
      </ModalMotion>

      <ModalMotion show={!!detailId} backdropClassName="bg-black/50" panelClassName="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900">Detalle del cliente</h3>
          <button type="button" onClick={closeDetail} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar detalle">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="space-y-4 p-6">
          {detailLoading && (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
            </div>
          )}
          {!detailLoading && detailCliente && (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div><dt className="text-xs font-semibold text-slate-400">Nombre</dt><dd className="text-sm text-slate-900">{detailCliente.nombre}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">RUC</dt><dd className="text-sm text-slate-900">{detailCliente.ruc}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">Tipo</dt><dd className="text-sm text-slate-900">{detailCliente.tipo}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">Estado</dt><dd className="text-sm text-slate-900">{detailCliente.activo ? 'Activo' : 'Inactivo'}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-slate-400">Dirección</dt>
                  <dd className="mt-1 text-sm text-slate-900">{detailCliente.direccion}</dd>
                  {detailCliente.direccion && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                      <img
                        src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+0f172a(${encodeURIComponent(detailCliente.direccion)})/auto/400x180@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
                        alt="Mapa de ubicación"
                        className="w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                </div>
                <div><dt className="text-xs font-semibold text-slate-400">Teléfono</dt><dd className="text-sm text-slate-900">{detailCliente.telefonoContacto ?? '—'}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">Email</dt><dd className="text-sm text-slate-900">{detailCliente.emailContacto ?? '—'}</dd></div>
              </dl>
              <div className="flex justify-end">
                <button type="button" onClick={closeDetail} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </ModalMotion>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : (
          <>
            {/* Vista móvil */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {clientesFiltrados.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">
                  {busqueda || filtroPrincipal ? 'Sin resultados para los filtros aplicados' : 'No hay clientes registrados.'}
                </div>
              ) : (
                clientesFiltrados.map((c) => (
                  <div key={c.id} className="px-4 py-3.5">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${c.tipo === 'PRINCIPAL' ? 'bg-primary/10' : 'bg-slate-100'}`}>
                        <span className={`material-symbols-outlined text-[17px] ${c.tipo === 'PRINCIPAL' ? 'text-primary' : 'text-slate-400'}`}>
                          {c.tipo === 'PRINCIPAL' ? 'corporate_fare' : 'location_on'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{c.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono">{c.ruc}</p>
                        {c.tipo === 'SECUNDARIO' && c.clientePrincipal && (
                          <p className="text-xs text-slate-400 mt-0.5">→ {c.clientePrincipal.nombre}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-12">
                      <ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} />
                      <div className="flex items-center gap-0.5">{rowActions(c)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Vista desktop */}
            <table className="hidden min-w-[640px] w-full text-left text-sm sm:table">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</div>
                  </th>
                  <th className="px-4 py-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">RUC</div>
                  </th>
                  <th className="px-4 py-2.5">
                    <div className="relative overflow-hidden">
                      <input
                        type="text"
                        placeholder="Buscar cliente principal..."
                        value={filtroPrincipal}
                        onChange={(e) => setFiltroPrincipal(e.target.value)}
                        onFocus={(e) => { if (e.target.value === 'Cliente Principal') setFiltroPrincipal('') }}
                        onBlur={(e) => { if (e.target.value === '') setFiltroPrincipal('Cliente Principal') }}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 pr-9 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      {filtroPrincipal && filtroPrincipal !== 'Cliente Principal' && (
                        <button
                          type="button"
                          onClick={() => setFiltroPrincipal('Cliente Principal')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Limpiar filtro"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</div>
                  </th>
                  <th className="px-4 py-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-sm text-slate-400">
                      {busqueda || (filtroPrincipal && filtroPrincipal !== 'Cliente Principal') ? 'Sin resultados para los filtros aplicados' : 'No hay clientes registrados.'}
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{trunc(c.nombre)}</p>
                          {c.emailContacto && <p className="mt-0.5 text-xs text-slate-400">{trunc(c.emailContacto)}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.ruc}</td>
                      <td className="px-4 py-3">
                        {c.tipo === 'PRINCIPAL' ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            Principal
                          </span>
                        ) : (
                          <span className="text-xs text-slate-700">{c.clientePrincipal?.nombre || 'Sin asignar'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {rowActions(c)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">{total} cliente{total !== 1 ? 's' : ''} en total</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchClientes(page - 1)} disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Anterior</button>
            <span className="text-slate-400">{page} / {totalPages}</span>
            <button type="button" onClick={() => fetchClientes(page + 1)} disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}