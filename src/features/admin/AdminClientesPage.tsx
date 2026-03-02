import { type FormEvent, useMemo, useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { generateId } from '../../utils/generateId'

export function AdminClientesPage() {
  const { clientes, toggleClienteActivo, addCliente, updateCliente } = useLogisticsStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [ruc, setRuc] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')

  const totalActivos = useMemo(
    () => clientes.filter((c) => c.activo).length,
    [clientes],
  )

  const resetForm = () => {
    setEditingId(null)
    setNombre('')
    setRuc('')
    setDireccion('')
    setTelefono('')
    setEmail('')
  }

  const handleEdit = (id: string): void => {
    const c = clientes.find((cl) => cl.id === id)
    if (!c) return
    setEditingId(c.id)
    setNombre(c.nombre)
    setRuc(c.ruc)
    setDireccion(c.direccion)
    setTelefono(c.telefonoContacto ?? '')
    setEmail(c.emailContacto ?? '')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!nombre || !ruc || !direccion) return

    if (editingId) {
      updateCliente({
        id: editingId,
        nombre,
        ruc,
        direccion,
        telefonoContacto: telefono || undefined,
        emailContacto: email || undefined,
        activo: clientes.find((c) => c.id === editingId)?.activo ?? true,
      })
    } else {
      addCliente({
        id: generateId('cliente'),
        nombre,
        ruc,
        direccion,
        telefonoContacto: telefono || undefined,
        emailContacto: email || undefined,
        activo: true,
      })
    }

    resetForm()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Clientes</h2>
          <p className="text-xs text-slate-500 sm:text-sm">
            Gestión de clientes corporativos de logística médica.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {totalActivos} activos
        </span>
      </div>

      {/* Formulario creación/edición - mobile first */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingId ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-500 hover:text-primary"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Nombre</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-primary"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">RUC</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-primary"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Dirección</label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-primary"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Teléfono</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-primary"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Email contacto</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
          >
            {editingId ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </form>

      {/* Tabla de clientes - scroll horizontal en móvil */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">RUC</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{c.nombre}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-none">
                    {c.telefonoContacto} {c.emailContacto ? `· ${c.emailContacto}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.ruc}</td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate sm:max-w-none sm:whitespace-normal">{c.direccion}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleClienteActivo(c.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleEdit(c.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

