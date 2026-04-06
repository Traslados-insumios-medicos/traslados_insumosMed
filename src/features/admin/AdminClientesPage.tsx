import { type FormEvent, useMemo, useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { generateId } from '../../utils/generateId'
import type { TipoCliente } from '../../types/models'

export function AdminClientesPage() {
  const { clientes, toggleClienteActivo, addCliente, updateCliente } = useLogisticsStore()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoCliente>('PRINCIPAL')
  const [clientePrincipalId, setClientePrincipalId] = useState('')
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')

  const clientesPrincipales = useMemo(
    () => clientes.filter((c) => c.tipo === 'PRINCIPAL'),
    [clientes],
  )
  const totalActivos = useMemo(() => clientes.filter((c) => c.activo).length, [clientes])

  const resetForm = () => {
    setEditingId(null)
    setTipo('PRINCIPAL')
    setClientePrincipalId('')
    setNombre('')
    setRuc('')
    setDireccion('')
    setTelefono('')
    setEmail('')
    setShowModal(false)
  }

  const handleEdit = (id: string) => {
    const c = clientes.find((cl) => cl.id === id)
    if (!c) return
    setEditingId(c.id)
    setTipo(c.tipo)
    setClientePrincipalId(c.clientePrincipalId ?? '')
    setNombre(c.nombre)
    setRuc(c.ruc)
    setDireccion(c.direccion)
    setTelefono(c.telefonoContacto ?? '')
    setEmail(c.emailContacto ?? '')
    setShowModal(true)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!nombre || !ruc || !direccion) return
    if (tipo === 'SECUNDARIO' && !clientePrincipalId) return

    const base = {
      nombre,
      ruc,
      direccion,
      telefonoContacto: telefono || undefined,
      emailContacto: email || undefined,
      tipo,
      clientePrincipalId: tipo === 'SECUNDARIO' ? clientePrincipalId : undefined,
    }

    if (editingId) {
      updateCliente({ id: editingId, activo: clientes.find((c) => c.id === editingId)?.activo ?? true, ...base })
    } else {
      addCliente({ id: generateId('cliente'), activo: true, ...base })
    }
    resetForm()
  }

  const clientesAgrupados = useMemo(() => {
    return clientesPrincipales.map((p) => ({
      principal: p,
      secundarios: clientes.filter((c) => c.clientePrincipalId === p.id),
    }))
  }, [clientes, clientesPrincipales])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clientes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de clientes corporativos de logística médica.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{totalActivos} activos</span>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {/* Tipo de cliente */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo de cliente</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['PRINCIPAL', 'SECUNDARIO'] as TipoCliente[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTipo(t); setClientePrincipalId('') }}
                      className={`rounded-lg border-2 py-3 text-sm font-semibold transition-all ${
                        tipo === t
                          ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                          : 'border-slate-200 text-slate-500 hover:border-primary/50 dark:border-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t === 'PRINCIPAL' ? 'Principal' : 'Secundario'}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {tipo === 'PRINCIPAL'
                    ? 'Tiene acceso al panel de cliente para ver todas sus entregas.'
                    : 'Es un punto de entrega. No tiene acceso al sistema.'}
                </p>
              </div>

              {/* Cliente principal (solo si es secundario) */}
              {tipo === 'SECUNDARIO' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Cliente principal al que reporta
                  </label>
                  <select
                    value={clientePrincipalId}
                    onChange={(e) => setClientePrincipalId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleccionar cliente principal...</option>
                    {clientesPrincipales.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre</label>
                  <input className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">RUC</label>
                  <input className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary" value={ruc} onChange={(e) => setRuc(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Dirección</label>
                <input className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary" value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Teléfono</label>
                  <input className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Email contacto</label>
                  <input type="email" className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
                  {editingId ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla agrupada */}
      <div className="space-y-4">
        {clientesAgrupados.map(({ principal, secundarios }) => (
          <div key={principal.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
            {/* Fila principal */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-primary/5 px-4 py-3 dark:border-slate-700 dark:bg-primary/10">
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">P</div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{principal.nombre}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{principal.emailContacto} · {principal.ruc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {secundarios.length} punto{secundarios.length !== 1 ? 's' : ''} de entrega
                </span>
                <button type="button" onClick={() => toggleClienteActivo(principal.id)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${principal.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {principal.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button type="button" onClick={() => handleEdit(principal.id)} className="text-xs font-medium text-primary hover:underline">Editar</button>
              </div>
            </div>

            {/* Secundarios */}
            {secundarios.length > 0 && (
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {secundarios.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-2.5 pl-12">
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{c.nombre}</span>
                        </div>
                        <p className="pl-4 text-xs text-slate-400">{c.direccion}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{c.ruc}</td>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => toggleClienteActivo(c.id)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button type="button" onClick={() => handleEdit(c.id)} className="text-xs font-medium text-primary hover:underline">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
