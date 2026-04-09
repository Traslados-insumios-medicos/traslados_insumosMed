import React, { useCallback, useEffect, useState } from 'react'
import { MapboxAddressInput } from '../../components/ui/MapboxAddressInput'
import { ModalMotion } from '../../components/ui/ModalMotion'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

type TipoCliente = 'PRINCIPAL' | 'SECUNDARIO'
interface ClientePrincipalRef { id: string; nombre: string }
interface Cliente {
  id: string; nombre: string; ruc: string; direccion: string
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

const LIMIT = 20

export function AdminClientesPage() {
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
  const [, setCoordsDireccion] = useState<{ lat: number; lng: number } | null>(null)
  const [telefono, setTelefono] = useState('')
  const [emailContacto, setEmailContacto] = useState('')
  const [tipo, setTipo] = useState<TipoCliente>('SECUNDARIO')
  const [clientePrincipalId, setClientePrincipalId] = useState('')
  const [crearUsuario, setCrearUsuario] = useState(false)
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [usuarioEmail, setUsuarioEmail] = useState('')
  const [passwordModal, setPasswordModal] = useState<PasswordModalData | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedPrincipales, setExpandedPrincipales] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailCliente, setDetailCliente] = useState<Cliente | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Errores de validación
  const [nombreError, setNombreError] = useState('')
  const [rucError, setRucError] = useState('')
  const [telefonoError, setTelefonoError] = useState('')
  const [emailContactoError, setEmailContactoError] = useState('')
  const [usuarioNombreError, setUsuarioNombreError] = useState('')
  const [usuarioEmailError, setUsuarioEmailError] = useState('')

  const NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]*$/
  const RUC_REGEX = /^\d{0,13}$/
  const TELEFONO_REGEX = /^\d{0,10}$/
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

  const handleNombreChange = (val: string) => {
    if (!NOMBRE_REGEX.test(val)) return
    setNombre(val)
    setNombreError(val && !/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(val) ? 'El nombre solo debe contener letras, tildes y ñ' : '')
  }

  const handleRucChange = (val: string) => {
    if (!RUC_REGEX.test(val)) return
    setRuc(val)
    setRucError(val && val.length !== 13 ? 'El RUC debe tener exactamente 13 dígitos numéricos' : '')
  }

  const handleTelefonoChange = (val: string) => {
    if (!TELEFONO_REGEX.test(val)) return
    setTelefono(val)
    setTelefonoError(val && val.length !== 10 ? 'El teléfono debe tener exactamente 10 dígitos' : '')
  }

  const handleEmailContactoChange = (val: string) => {
    setEmailContacto(val)
    setEmailContactoError(val && !EMAIL_REGEX.test(val) ? 'El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)' : '')
  }

  const handleUsuarioNombreChange = (val: string) => {
    if (!NOMBRE_REGEX.test(val)) return
    setUsuarioNombre(val)
    setUsuarioNombreError(val && !/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(val) ? 'El nombre solo debe contener letras, tildes y ñ' : '')
  }

  const handleUsuarioEmailChange = (val: string) => {
    setUsuarioEmail(val)
    setUsuarioEmailError(val && !EMAIL_REGEX.test(val) ? 'El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)' : '')
  }
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchClientes = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (filtroTipo) params.set('tipo', filtroTipo)
      const res = await api.get<PaginatedResponse>(`/clientes?${params}`)
      setClientes(res.data.data); setTotal(res.data.total); setPage(p)
    } catch { addToast('Error al cargar clientes', 'error') }
    finally { setLoading(false) }
  }, [addToast, filtroTipo])

  useEffect(() => { fetchClientes(1) }, [fetchClientes])
  useEffect(() => {
    api.get<PaginatedResponse>('/clientes?tipo=PRINCIPAL&limit=100')
      .then((r) => setPrincipales(r.data.data.map((c) => ({ id: c.id, nombre: c.nombre }))))
      .catch(() => {})
  }, [])

  const resetForm = () => {
    setEditingId(null); setNombre(''); setRuc(''); setDireccion(''); setCoordsDireccion(null)
    setTelefono(''); setEmailContacto(''); setTipo('SECUNDARIO')
    setClientePrincipalId(''); setCrearUsuario(false)
    setUsuarioNombre(''); setUsuarioEmail(''); setShowModal(false)
    setNombreError(''); setRucError(''); setTelefonoError('')
    setEmailContactoError(''); setUsuarioNombreError(''); setUsuarioEmailError('')
  }

  const handleEdit = (c: Cliente) => {
    setEditingId(c.id); setNombre(c.nombre); setRuc(c.ruc)
    setDireccion(c.direccion); setCoordsDireccion(null); setTelefono(c.telefonoContacto ?? '')
    setEmailContacto(c.emailContacto ?? ''); setTipo(c.tipo)
    setClientePrincipalId(c.clientePrincipalId ?? '')
    setCrearUsuario(false); setUsuarioNombre(''); setUsuarioEmail('')
    setShowModal(true)
  }

  const handleToggleActivo = async (id: string) => {
    setClientes((prev) => prev.map((c) => c.id === id ? { ...c, activo: !c.activo } : c))
    try {
      const res = await api.patch<Cliente>(`/clientes/${id}/toggle-activo`)
      setClientes((prev) => prev.map((c) => (c.id === id ? res.data : c)))
      await fetchClientes(page)
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

  const handleDeleteCliente = async (c: Cliente) => {
    if (!window.confirm(`¿Eliminar definitivamente a "${c.nombre}"?`)) return
    try {
      await api.delete(`/clientes/${c.id}`)
      setClientes((prev) => prev.filter((x) => x.id !== c.id))
      if (detailId === c.id) closeDetail()
      addToast('Cliente eliminado', 'success')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (status === 409 && message) addToast(message, 'error')
      else addToast('No se pudo eliminar el cliente', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !ruc || !direccion) return
    if (nombreError || rucError || telefonoError || emailContactoError || usuarioNombreError || usuarioEmailError) return
    if (ruc.length !== 13) { setRucError('El RUC debe tener exactamente 13 dígitos numéricos'); return }
    if (emailContacto && !EMAIL_REGEX.test(emailContacto)) { setEmailContactoError('El email debe contener @, dominio y extensión válida (ej. usuario@empresa.com)'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        const res = await api.put<Cliente>(`/clientes/${editingId}`, {
          nombre, direccion, telefonoContacto: telefono || undefined,
          emailContacto: emailContacto || undefined, tipo,
          clientePrincipalId: tipo === 'SECUNDARIO' ? (clientePrincipalId || undefined) : undefined,
        })
        setClientes((prev) => prev.map((c) => (c.id === editingId ? res.data : c)))
        addToast('Cliente actualizado', 'success')
        await fetchClientes(page)
        resetForm()
      } else {
        const clienteRes = await api.post<Cliente>('/clientes', {
          nombre, ruc, direccion, telefonoContacto: telefono || undefined,
          emailContacto: emailContacto || undefined, tipo,
          clientePrincipalId: tipo === 'SECUNDARIO' ? (clientePrincipalId || undefined) : undefined,
        })
        addToast('Cliente creado', 'success')
        if (tipo === 'PRINCIPAL' && crearUsuario && usuarioNombre && usuarioEmail) {
          const userRes = await api.post<{ usuario: object; passwordTemporal: string }>('/auth/register', {
            nombre: usuarioNombre, email: usuarioEmail, rol: 'CLIENTE', clienteId: clienteRes.data.id,
          })
          setPasswordModal({ clienteNombre: usuarioNombre, password: userRes.data.passwordTemporal })
        }
        await fetchClientes(1); resetForm()
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) addToast('Ya existe un cliente con ese RUC', 'error')
      else addToast('Error al guardar cliente', 'error')
    } finally { setSubmitting(false) }
  }

  const handleCopyPassword = async () => {
    if (!passwordModal) return
    try {
      await navigator.clipboard.writeText(passwordModal.password)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { addToast('No se pudo copiar', 'error') }
  }

  const toggleExpand = (id: string) => {
    setExpandedPrincipales((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })
  }

  const totalActivos = clientes.filter((c) => c.activo).length

  const buildGrupos = (list: Cliente[]) => {
    const grupos = new Map<string, { label: string; items: Cliente[] }>()
    for (const c of list) {
      const key = c.clientePrincipal?.id ?? '__sin_principal__'
      const label = c.clientePrincipal?.nombre ?? 'Sin principal asignado'
      if (!grupos.has(key)) grupos.set(key, { label, items: [] })
      grupos.get(key)!.items.push(c)
    }
    return Array.from(grupos.values())
  }

  const actionIconClass = 'rounded p-1 text-slate-400 transition-colors hover:text-primary'
  const rowActions = (c: Cliente) => (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); openDetail(c.id) }} className={`${actionIconClass} hidden sm:inline-flex`} title="Ver detalle" aria-label="Ver detalle">
        <span className="material-symbols-outlined text-base">visibility</span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(c) }} className={actionIconClass} title="Editar" aria-label="Editar">
        <span className="material-symbols-outlined text-base">edit</span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); void handleDeleteCliente(c) }} className={`${actionIconClass} hover:text-red-600 hidden sm:inline-flex`} title="Eliminar de la base de datos" aria-label="Eliminar de la base de datos">
        <span className="material-symbols-outlined text-base">delete</span>
      </button>
    </>
  )


  return (
    <div className="space-y-6">
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

      <ModalMotion show={showModal} backdropClassName="bg-black/50" panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo *</label>
            <div className="flex gap-3">
              {(['PRINCIPAL', 'SECUNDARIO'] as TipoCliente[]).map((t) => (
                <label key={t} className={['flex flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all', tipo === t ? 'border-primary bg-primary/5' : 'border-slate-200'].join(' ')}>
                  <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                  <span className={['material-symbols-outlined text-xl', tipo === t ? 'text-primary' : 'text-slate-400'].join(' ')}>
                    {t === 'PRINCIPAL' ? 'corporate_fare' : 'location_on'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t === 'PRINCIPAL' ? 'Principal' : 'Secundario'}</p>
                    <p className="text-[11px] text-slate-400">{t === 'PRINCIPAL' ? 'Empresa contratante' : 'Punto de entrega'}</p>
                  </div>
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre *</label>
              <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${nombreError ? 'border-red-400' : 'border-slate-300'}`}
                value={nombre} onChange={(e) => handleNombreChange(e.target.value)} required />
              {nombreError && <p className="text-xs text-red-500">{nombreError}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">RUC *</label>
              <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm disabled:opacity-50 focus:ring-2 focus:ring-primary ${rucError ? 'border-red-400' : 'border-slate-300'}`}
                value={ruc} onChange={(e) => handleRucChange(e.target.value)} required disabled={!!editingId} inputMode="numeric" />
              {rucError && <p className="text-xs text-red-500">{rucError}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dirección *</label>
            <MapboxAddressInput
              value={direccion}
              onChange={(val, coords) => { setDireccion(val); if (coords) setCoordsDireccion(coords) }}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teléfono</label>
              <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${telefonoError ? 'border-red-400' : 'border-slate-300'}`}
                value={telefono} onChange={(e) => handleTelefonoChange(e.target.value)} inputMode="numeric" />
              {telefonoError && <p className="text-xs text-red-500">{telefonoError}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
              <input type="email" className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${emailContactoError ? 'border-red-400' : 'border-slate-300'}`}
                value={emailContacto} onChange={(e) => handleEmailContactoChange(e.target.value)} />
              {emailContactoError && <p className="text-xs text-red-500">{emailContactoError}</p>}
            </div>
          </div>
          {!editingId && tipo === 'PRINCIPAL' && (
            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={crearUsuario} onChange={(e) => setCrearUsuario(e.target.checked)} className="rounded" />
                <span className="text-sm font-medium text-slate-700">Crear usuario de acceso</span>
              </label>
              {crearUsuario && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre usuario *</label>
                    <input className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${usuarioNombreError ? 'border-red-400' : 'border-slate-300'}`}
                      value={usuarioNombre} onChange={(e) => handleUsuarioNombreChange(e.target.value)} required={crearUsuario} />
                    {usuarioNombreError && <p className="text-xs text-red-500">{usuarioNombreError}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email usuario *</label>
                    <input type="email" className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary ${usuarioEmailError ? 'border-red-400' : 'border-slate-300'}`}
                      value={usuarioEmail} onChange={(e) => handleUsuarioEmailChange(e.target.value)} required={crearUsuario} />
                    {usuarioEmailError && <p className="text-xs text-red-500">{usuarioEmailError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={submitting || !!nombreError || !!rucError || !!telefonoError || !!emailContactoError || !!usuarioNombreError || !!usuarioEmailError}
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
        ) : clientes.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-400">No hay clientes registrados.</div>
        ) : filtroTipo === 'PRINCIPAL' ? (
          <>
            <div className="divide-y divide-slate-100 sm:hidden">
              {clientes.filter((c) => c.tipo === 'PRINCIPAL').map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="material-symbols-outlined shrink-0 text-sm text-primary">corporate_fare</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{c.nombre}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{c.ruc}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} />
                    <div className="flex items-center gap-0.5">
                      {rowActions(c)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden min-w-[640px] w-full text-left text-sm sm:table">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">RUC</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.filter((c) => c.tipo === 'PRINCIPAL').map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-base text-primary">corporate_fare</span>
                        <div>
                          <p className="font-medium text-slate-900">{c.nombre}</p>
                          {c.emailContacto && <p className="mt-0.5 text-xs text-slate-400">{c.emailContacto}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{c.ruc}</td>
                    <td className="px-6 py-4"><ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {rowActions(c)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : filtroTipo === 'SECUNDARIO' ? (
          <>
            <div className="divide-y divide-slate-100 sm:hidden">
              {buildGrupos(clientes).map((grupo) => (
                <div key={grupo.label}>
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5">
                    <span className="material-symbols-outlined text-sm text-primary">corporate_fare</span>
                    <span className="text-xs font-semibold text-slate-600">{grupo.label}</span>
                  </div>
                  {grupo.items.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 border-t border-slate-100 py-2.5 pl-8 pr-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="size-1.5 shrink-0 rounded-full bg-slate-300" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{c.nombre}</p>
                          <p className="text-xs text-slate-400">{c.ruc}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} />
                        {rowActions(c)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <table className="hidden min-w-[640px] w-full text-left text-sm sm:table">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">RUC</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {buildGrupos(clientes).map((grupo) => (
                  <React.Fragment key={grupo.label}>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={4} className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-primary">corporate_fare</span>
                          <span className="text-xs font-semibold text-slate-600">{grupo.label}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {grupo.items.length} punto{grupo.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {grupo.items.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-6 py-4 pl-10">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-base text-slate-400">location_on</span>
                            <div>
                              <p className="font-medium text-slate-900">{c.nombre}</p>
                              {c.emailContacto && <p className="mt-0.5 text-xs text-slate-400">{c.emailContacto}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{c.ruc}</td>
                        <td className="px-6 py-4"><ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {rowActions(c)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div className="divide-y divide-slate-100 sm:hidden">
              {clientes.filter((c) => c.tipo === 'PRINCIPAL').map((c) => {
                const isOpen = expandedPrincipales.has(c.id)
                const secundarios = c.clientesSecundarios ?? []
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="material-symbols-outlined shrink-0 text-sm text-primary">corporate_fare</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{c.nombre}</p>
                          <p className="text-xs text-slate-400">{c.ruc}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} />
                        {rowActions(c)}
                        {secundarios.length > 0 && (
                          <button type="button" onClick={() => toggleExpand(c.id)} className="text-slate-400">
                            <span className="material-symbols-outlined text-base transition-transform duration-200"
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {isOpen && secundarios.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 py-2.5 pl-8 pr-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="size-1.5 shrink-0 rounded-full bg-slate-300" />
                          <p className="truncate text-sm text-slate-600">{s.nombre}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {s.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <table className="hidden min-w-[640px] w-full text-left text-sm sm:table">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">RUC</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientes.filter((c) => c.tipo === 'PRINCIPAL').map((c) => {
                  const isOpen = expandedPrincipales.has(c.id)
                  const secundarios = c.clientesSecundarios ?? []
                  return (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-slate-50/60">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-base text-primary">corporate_fare</span>
                            <div>
                              <p className="font-medium text-slate-900">{c.nombre}</p>
                              {c.emailContacto && <p className="mt-0.5 text-xs text-slate-400">{c.emailContacto}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{c.ruc}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">Principal</span>
                        </td>
                        <td className="px-6 py-4"><ToggleActivo activo={c.activo} onToggle={() => handleToggleActivo(c.id)} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {rowActions(c)}
                            {secundarios.length > 0 && (
                              <button type="button" onClick={() => toggleExpand(c.id)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-base transition-transform duration-200"
                                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && secundarios.map((s) => (
                        <tr key={s.id} className="bg-slate-50/60">
                          <td className="py-3.5 pl-14 pr-6">
                            <div className="flex items-center gap-2">
                              <div className="size-1.5 shrink-0 rounded-full bg-slate-300" />
                              <p className="text-sm text-slate-600">{s.nombre}</p>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-400">{s.ruc}</td>
                          <td className="px-6 py-3.5">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Secundario</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {s.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5" />
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
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