import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { ModalMotion } from '../../components/ui/ModalMotion'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

type TipoCliente = 'PRINCIPAL' | 'SECUNDARIO'

interface ClientePrincipalRef { id: string; nombre: string }

interface Cliente {
  id: string
  nombre: string
  ruc: string
  direccion: string
  telefonoContacto?: string | null
  emailContacto?: string | null
  activo: boolean
  tipo: TipoCliente
  clientePrincipalId?: string | null
  clientePrincipal?: ClientePrincipalRef | null
  clientesSecundarios?: { id: string; nombre: string; ruc: string; activo: boolean }[]
}

interface PaginatedResponse { data: Cliente[]; total: number; page: number; limit: number }
interface PasswordModalData { clienteNombre: string; password: string }

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
  /** Datos mostrados solo lectura al editar tipo (nombre, RUC, etc.) */
  const [editSnapshot, setEditSnapshot] = useState<Cliente | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [emailContacto, setEmailContacto] = useState('')
  const [tipo, setTipo] = useState<TipoCliente>('SECUNDARIO')
  const [clientePrincipalId, setClientePrincipalId] = useState('')

  const [crearUsuario, setCrearUsuario] = useState(false)
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [usuarioEmail, setUsuarioEmail] = useState('')

  const [passwordModal, setPasswordModal] = useState<PasswordModalData | null>(null)
  const [copied, setCopied] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailCliente, setDetailCliente] = useState<Cliente | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchClientes = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (filtroTipo) params.set('tipo', filtroTipo)
      const res = await api.get<PaginatedResponse>(`/clientes?${params}`)
      setClientes(res.data.data)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      addToast('Error al cargar clientes', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, filtroTipo])

  useEffect(() => { fetchClientes(1) }, [fetchClientes])

  useEffect(() => {
    api.get<PaginatedResponse>('/clientes?tipo=PRINCIPAL&limit=100')
      .then((r) => setPrincipales(r.data.data.map((c) => ({ id: c.id, nombre: c.nombre }))))
      .catch(() => {})
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setEditSnapshot(null)
    setNombre(''); setRuc(''); setDireccion('')
    setTelefono(''); setEmailContacto(''); setTipo('SECUNDARIO')
    setClientePrincipalId(''); setCrearUsuario(false)
    setUsuarioNombre(''); setUsuarioEmail(''); setShowModal(false)
  }

  const openCreateModal = () => {
    setEditingId(null)
    setEditSnapshot(null)
    setNombre(''); setRuc(''); setDireccion('')
    setTelefono(''); setEmailContacto(''); setTipo('SECUNDARIO')
    setClientePrincipalId(''); setCrearUsuario(false)
    setUsuarioNombre(''); setUsuarioEmail('')
    setShowModal(true)
  }

  const handleEdit = (c: Cliente) => {
    setEditingId(c.id)
    setEditSnapshot(c)
    setTipo(c.tipo)
    setClientePrincipalId('')
    setShowModal(true)
  }

  const handleToggleActivo = async (id: string) => {
    try {
      const res = await api.patch<Cliente>(`/clientes/${id}/toggle-activo`)
      setClientes((prev) => prev.map((c) => (c.id === id ? res.data : c)))
      setDetailCliente((d) => (d && d.id === id ? { ...d, ...res.data } : d))
      addToast('Estado actualizado', 'success')
    } catch { addToast('Error al cambiar estado', 'error') }
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

  const handleEliminarCliente = async (c: Cliente) => {
    if (!c.activo) return
    if (!window.confirm(`¿Desactivar a "${c.nombre}"? Quedará inactivo; puede reactivarlo desde la columna Estado.`)) return
    await handleToggleActivo(c.id)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (editingId && editSnapshot) {
      setSubmitting(true)
      try {
        const body: { tipo: TipoCliente; clientePrincipalId?: string | null } = { tipo }
        if (tipo === 'PRINCIPAL') body.clientePrincipalId = null
        const res = await api.put<Cliente>(`/clientes/${editingId}`, body)
        setClientes((prev) => prev.map((c) => (c.id === editingId ? res.data : c)))
        setDetailCliente((d) => (d && d.id === editingId ? { ...d, ...res.data } : d))
        addToast('Tipo de cliente actualizado', 'success')
        resetForm()
      } catch {
        addToast('Error al actualizar cliente', 'error')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!nombre || !ruc || !direccion) return
    setSubmitting(true)
    try {
      const clienteRes = await api.post<Cliente>('/clientes', {
        nombre, ruc, direccion,
        telefonoContacto: telefono || undefined,
        emailContacto: emailContacto || undefined,
        tipo,
        clientePrincipalId: tipo === 'SECUNDARIO' ? (clientePrincipalId || undefined) : undefined,
      })
      addToast('Cliente creado', 'success')

      if (tipo === 'PRINCIPAL' && crearUsuario && usuarioNombre && usuarioEmail) {
        const userRes = await api.post<{ usuario: object; passwordTemporal: string }>('/auth/register', {
          nombre: usuarioNombre, email: usuarioEmail,
          rol: 'CLIENTE', clienteId: clienteRes.data.id,
        })
        setPasswordModal({ clienteNombre: usuarioNombre, password: userRes.data.passwordTemporal })
      }

      await fetchClientes(1)
      resetForm()
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

  const totalActivos = clientes.filter((c) => c.activo).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clientes</h2>
          <p className="text-sm text-slate-600">Gestión de clientes corporativos de logística médica.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {(['', 'PRINCIPAL', 'SECUNDARIO'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setFiltroTipo(t)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  filtroTipo === t
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t === '' ? 'Todos' : t === 'PRINCIPAL' ? 'Principales' : 'Secundarios'}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{totalActivos} activos</span>
          <button type="button" onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow hover:bg-primary/90">
            <span className="material-symbols-outlined text-base">add</span>
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Form Modal */}
      <ModalMotion
        show={showModal}
        backdropClassName="bg-black/50"
        panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {editingId && editSnapshot ? (
                <>
                  <p className="text-xs text-slate-500">
                    Datos de solo lectura. Solo indique si este registro es <strong className="font-semibold text-slate-700">Principal</strong> o <strong className="font-semibold text-slate-700">Secundario</strong>. Aquí no se asigna la jerarquía (eso va al crear el cliente o en otros flujos).
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <dl className="space-y-2.5 text-sm">
                      <div><dt className="text-xs font-medium text-slate-400">Nombre</dt><dd className="font-semibold text-slate-900">{editSnapshot.nombre}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-400">RUC</dt><dd className="text-slate-800">{editSnapshot.ruc}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-400">Dirección</dt><dd className="text-slate-800">{editSnapshot.direccion}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-400">Teléfono</dt><dd className="text-slate-800">{editSnapshot.telefonoContacto ?? '—'}</dd></div>
                      <div><dt className="text-xs font-medium text-slate-400">Email contacto</dt><dd className="text-slate-800">{editSnapshot.emailContacto ?? '—'}</dd></div>
                      {editSnapshot.tipo === 'SECUNDARIO' && editSnapshot.clientePrincipal && (
                        <div>
                          <dt className="text-xs font-medium text-slate-400">Cliente principal (referencia actual)</dt>
                          <dd className="text-slate-800">{editSnapshot.clientePrincipal.nombre}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Tipo de cliente *</label>
                    <p className="mb-2 text-[11px] text-slate-400">Primero: Principal (empresa con panel). Segundo: Secundario (sucursal / punto de entrega).</p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {(['PRINCIPAL', 'SECUNDARIO'] as TipoCliente[]).map((t) => (
                        <label key={t} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                          tipo === t ? 'border-primary bg-primary/5' : 'border-slate-200'
                        }`}>
                          <input type="radio" name="tipo_edit" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                          <span className={`material-symbols-outlined text-lg ${tipo === t ? 'text-primary' : 'text-slate-400'}`}>
                            {t === 'PRINCIPAL' ? 'corporate_fare' : 'location_on'}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{t === 'PRINCIPAL' ? 'Principal' : 'Secundario'}</p>
                            <p className="text-[10px] text-slate-400">
                              {t === 'PRINCIPAL' ? 'Empresa contratante con acceso al panel' : 'Punto de entrega / sucursal'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Tipo de cliente *</label>
                    <div className="flex gap-3">
                      {(['PRINCIPAL', 'SECUNDARIO'] as TipoCliente[]).map((t) => (
                        <label key={t} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                          tipo === t ? 'border-primary bg-primary/5' : 'border-slate-200'
                        }`}>
                          <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                          <span className={`material-symbols-outlined text-lg ${tipo === t ? 'text-primary' : 'text-slate-400'}`}>
                            {t === 'PRINCIPAL' ? 'corporate_fare' : 'location_on'}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{t === 'PRINCIPAL' ? 'Principal' : 'Secundario'}</p>
                            <p className="text-[10px] text-slate-400">
                              {t === 'PRINCIPAL' ? 'Empresa contratante con acceso al panel' : 'Punto de entrega / sucursal'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {tipo === 'SECUNDARIO' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Cliente principal</label>
                      <select value={clientePrincipalId} onChange={(e) => setClientePrincipalId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                        <option value="">Sin asignar</option>
                        {principales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Nombre *</label>
                      <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                        value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">RUC *</label>
                      <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                        value={ruc} onChange={(e) => setRuc(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Dirección *</label>
                    <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                      value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Teléfono</label>
                      <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                        value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Email contacto</label>
                      <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                        value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} />
                    </div>
                  </div>

                  {tipo === 'PRINCIPAL' && (
                    <div className="rounded-lg border border-slate-200 p-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={crearUsuario} onChange={(e) => setCrearUsuario(e.target.checked)} className="rounded" />
                        <span className="text-sm font-medium text-slate-700">
                          Crear usuario de acceso para este cliente
                        </span>
                      </label>
                      {crearUsuario && (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Nombre del usuario *</label>
                            <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                              value={usuarioNombre} onChange={(e) => setUsuarioNombre(e.target.value)} required={crearUsuario} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400">Email del usuario *</label>
                            <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary"
                              value={usuarioEmail} onChange={(e) => setUsuarioEmail(e.target.value)} required={crearUsuario} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={resetForm}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60">
                  {submitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                  {editingId ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
      </ModalMotion>

      {/* Password Modal */}
      <ModalMotion
        show={!!passwordModal}
        backdropClassName="bg-black/50"
        panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        {passwordModal && (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="text-lg font-bold text-slate-900">Usuario creado</h3>
              <button type="button" onClick={() => { setPasswordModal(null); setCopied(false) }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-600">
                El usuario <span className="font-semibold">{passwordModal.clienteNombre}</span> fue creado exitosamente.
              </p>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Contraseña temporal</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded bg-white px-3 py-2 text-base font-mono font-bold text-slate-900 shadow-sm">
                    {passwordModal.password}
                  </code>
                  <button type="button" onClick={handleCopyPassword}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                    <span className="material-symbols-outlined text-base">{copied ? 'check' : 'content_copy'}</span>
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">Comparta esta contraseña con el usuario. No se volverá a mostrar.</p>
              <div className="flex justify-end">
                <button type="button" onClick={() => { setPasswordModal(null); setCopied(false) }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
                  Entendido
                </button>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      {/* Detalle (solo lectura) */}
      <ModalMotion
        show={!!detailId}
        backdropClassName="bg-black/50"
        panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h3 className="text-lg font-bold text-slate-900">Detalle del cliente</h3>
          <button type="button" onClick={closeDetail} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar detalle">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="space-y-4 p-5">
          {detailLoading && (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
            </div>
          )}
          {!detailLoading && detailCliente && (
            <>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs font-medium text-slate-400">Nombre</dt><dd className="font-semibold text-slate-900">{detailCliente.nombre}</dd></div>
                <div><dt className="text-xs font-medium text-slate-400">RUC</dt><dd className="text-slate-800">{detailCliente.ruc}</dd></div>
                <div><dt className="text-xs font-medium text-slate-400">Dirección</dt><dd className="text-slate-800">{detailCliente.direccion}</dd></div>
                <div><dt className="text-xs font-medium text-slate-400">Teléfono</dt><dd className="text-slate-800">{detailCliente.telefonoContacto ?? '—'}</dd></div>
                <div><dt className="text-xs font-medium text-slate-400">Email contacto</dt><dd className="text-slate-800">{detailCliente.emailContacto ?? '—'}</dd></div>
                <div><dt className="text-xs font-medium text-slate-400">Tipo</dt><dd className="text-slate-800">{detailCliente.tipo === 'PRINCIPAL' ? 'Principal' : 'Secundario'}</dd></div>
                <div><dt className="text-xs font-medium text-slate-400">Cliente principal</dt><dd className="text-slate-800">{detailCliente.clientePrincipal?.nombre ?? '—'}</dd></div>
                <div><dt className="text-xs font-medium text-slate-400">Estado</dt><dd className="text-slate-800">{detailCliente.activo ? 'Activo' : 'Inactivo'}</dd></div>
              </dl>
              {!!detailCliente.clientesSecundarios?.length && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-400">Sucursales / secundarios</p>
                  <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 text-xs text-slate-700">
                    {detailCliente.clientesSecundarios.map((s) => (
                      <li key={s.id} className="flex justify-between border-b border-slate-100 px-3 py-2 last:border-0">
                        <span>{s.nombre}</span>
                        <span className={`shrink-0 font-medium ${s.activo ? 'text-emerald-600' : 'text-slate-400'}`}>{s.ruc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={closeDetail} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar</button>
                <button type="button" onClick={() => { const c = detailCliente; closeDetail(); handleEdit(c) }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
                  <span className="material-symbols-outlined text-base">edit</span>
                  Editar
                </button>
              </div>
            </>
          )}
        </div>
      </ModalMotion>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : clientes.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No hay clientes registrados.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">RUC</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:table-cell">Principal</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${c.tipo === 'PRINCIPAL' ? 'text-primary' : 'text-slate-400'}`}>
                        {c.tipo === 'PRINCIPAL' ? 'corporate_fare' : 'location_on'}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{c.nombre}</p>
                        {c.emailContacto && <p className="text-xs text-slate-400">{c.emailContacto}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.ruc}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      c.tipo === 'PRINCIPAL'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.tipo === 'PRINCIPAL' ? 'Principal' : 'Secundario'}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                    {c.clientePrincipal?.nombre ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handleToggleActivo(c.id)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        c.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-0.5">
                      <button type="button" onClick={() => openDetail(c.id)}
                        className="inline-flex rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-primary"
                        title="Ver detalle" aria-label="Ver detalle">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                      <button type="button" onClick={() => handleEdit(c)}
                        className="inline-flex rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-primary"
                        title="Editar" aria-label="Editar">
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button type="button" onClick={() => void handleEliminarCliente(c)} disabled={!c.activo}
                        className="inline-flex rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-600"
                        title={c.activo ? 'Desactivar cliente' : 'Ya inactivo'} aria-label="Eliminar / desactivar cliente">
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-400">{total} cliente{total !== 1 ? 's' : ''} en total</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchClientes(page - 1)} disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Anterior
            </button>
            <span className="text-slate-400">{page} / {totalPages}</span>
            <button type="button" onClick={() => fetchClientes(page + 1)} disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
