import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'

export function ClienteEnviosPage() {
  const { currentUser } = useAuthStore()
  const { guias, rutas, clientes } = useLogisticsStore()

  const guiasCliente = guias.filter((g) => g.clienteId === currentUser?.clienteId)
  const activas = guiasCliente.filter(
    (g) =>
      g.estado === 'PENDIENTE' ||
      g.estado === 'INCIDENCIA' ||
      rutas.find((r) => r.id === g.rutaId)?.estado === 'EN_CURSO',
  ).length
  const entregadosHoy = guiasCliente.filter((g) => g.estado === 'ENTREGADO').length
  const conIncidencia = guiasCliente.filter((g) => g.estado === 'INCIDENCIA').length
  const nombreCliente = clientes.find((c) => c.id === currentUser?.clienteId)?.nombre ?? 'Cliente'

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {nombreCliente} Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Seguimiento de envíos y logística de insumos médicos en tiempo real
        </p>
      </div>

      {/* Stats - mobile: 1 col, tablet+: 3 cols */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Envíos activos
            </p>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <span className="material-symbols-outlined">local_shipping</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900 dark:text-white">{activas}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span>En curso</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Entregados hoy
            </p>
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <span className="material-symbols-outlined">task_alt</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900 dark:text-white">
            {entregadosHoy}
          </p>
          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span>On track</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Con incidencia
            </p>
            <span className="rounded-lg bg-amber-100 p-2 text-amber-600">
              <span className="material-symbols-outlined">warning</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900 dark:text-white">
            {conIncidencia}
          </p>
          <div className="flex items-center gap-1 text-sm font-semibold text-rose-600">
            <span className="material-symbols-outlined text-xs">report_problem</span>
            <span>Requieren atención</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Envíos activos</h3>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por número de guía..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Nº Guía</th>
                <th className="px-6 py-4">Destino / Descripción</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Ruta</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {guiasCliente.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Este cliente aún no tiene envíos asignados.
                  </td>
                </tr>
              ) : (
                guiasCliente.map((g) => {
                  const ruta = rutas.find((r) => r.id === g.rutaId)
                  const statusClass =
                    g.estado === 'ENTREGADO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : g.estado === 'INCIDENCIA'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                  return (
                    <tr
                      key={g.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4 font-semibold text-primary">{g.numeroGuia}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {g.descripcion}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                        >
                          {g.estado === 'ENTREGADO'
                            ? 'Entregado'
                            : g.estado === 'INCIDENCIA'
                              ? 'Incidencia'
                              : 'En tránsito'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {ruta ? `${ruta.id} · ${ruta.estado}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/cliente/envios/${g.id}`}
                          className="text-slate-400 transition-colors hover:text-primary"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
