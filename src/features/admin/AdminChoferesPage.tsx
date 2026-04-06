import { type FormEvent, useMemo, useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import { generateId } from '../../utils/generateId'

export function AdminChoferesPage() {
  const { usuarios, toggleChoferActivo, addChofer, updateChofer } = useLogisticsStore()

  const choferes = useMemo(
    () => usuarios.filter((u) => u.rol === 'CHOFER'),
    [usuarios],
  )

  const [editingId, setEditingId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [activoInicial, setActivoInicial] = useState(true)

  const resetForm = () => {
    setEditingId(null)
    setNombre('')
    setCedula('')
    setActivoInicial(true)
  }

  const handleEdit = (id: string): void => {
    const ch = choferes.find((c) => c.id === id)
    if (!ch) return
    setEditingId(ch.id)
    setNombre(ch.nombre)
    setCedula(ch.cedula ?? '')
    setActivoInicial(ch.activo)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!nombre) return

    if (editingId) {
      updateChofer({ id: editingId, nombre, cedula: cedula || undefined, rol: 'CHOFER', activo: activoInicial })
    } else {
      addChofer({ id: generateId('chofer'), nombre, cedula: cedula || undefined, rol: 'CHOFER', activo: true })
    }

    resetForm()
  }

  const totalActivos = choferes.filter((c) => c.activo).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choferes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestión de choferes y asignaciones de rutas.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {totalActivos} activos
        </span>
      </div>

      {/* Formulario creación/edición */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {editingId ? 'Editar chofer' : 'Nuevo chofer'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-primary"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Número de cédula</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej: 1712345678"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivoInicial((v) => !v)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                activoInicial
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activoInicial ? 'Activo' : 'Inactivo'}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Estado inicial del chofer
            </span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
          >
            {editingId ? 'Guardar cambios' : 'Crear chofer'}
          </button>
        </div>
      </form>

      {/* Listado de choferes */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Cédula</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {choferes.map((ch) => (
              <tr key={ch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{ch.nombre}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">ID: {ch.id}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {ch.cedula ?? <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleChoferActivo(ch.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      ch.activo
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {ch.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleEdit(ch.id)}
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

