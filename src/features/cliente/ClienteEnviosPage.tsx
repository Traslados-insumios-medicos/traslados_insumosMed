import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'

const estadoLabel: Record<string, string> = {
  ENTREGADO: 'Entregado',
  INCIDENCIA: 'Incidencia',
  PENDIENTE: 'En tránsito',
}

const estadoClass: Record<string, string> = {
  ENTREGADO: 'bg-emerald-100 text-emerald-800',
  INCIDENCIA: 'bg-rose-100 text-rose-800',
  PENDIENTE: 'bg-blue-100 text-blue-800',
}

const rutaEstadoLabel: Record<string, string> = {
  EN_CURSO: 'En curso',
  PENDIENTE: 'Planificada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

export function ClienteEnviosPage() {
  const { currentUser } = useAuthStore()
  const { guias, rutas, clientes } = useLogisticsStore()
  const [busqueda, setBusqueda] = useState('')

  // El cliente principal ve las guías de todos sus clientes secundarios
  const clientesSecundarios = clientes.filter((c) => c.clientePrincipalId === currentUser?.clienteId)
  const idsSecundarios = clientesSecundarios.map((c) => c.id)
  const guiasCliente = guias.filter((g) => idsSecundarios.includes(g.clienteId))

  const activas = guiasCliente.filter(
    (g) =>
      g.estado === 'PENDIENTE' ||
      g.estado === 'INCIDENCIA' ||
      rutas.find((r) => r.id === g.rutaId)?.estado === 'EN_CURSO',
  ).length
  const entregadosHoy = guiasCliente.filter((g) => g.estado === 'ENTREGADO').length
  const conIncidencia = guiasCliente.filter((g) => g.estado === 'INCIDENCIA').length
  const nombreCliente = clientes.find((c) => c.id === currentUser?.clienteId)?.nombre ?? 'Cliente'

  const guiasFiltradas = guiasCliente.filter(
    (g) =>
      busqueda === '' ||
      g.numeroGuia.toLowerCase().includes(busqueda.toLowerCase()) ||
      g.descripcion.toLowerCase().includes(busqueda.toLowerCase()),
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {nombreCliente} Dashboard
        </h1>
        <p className="text-sm text-slate-500 sm:text-base">
          Seguimiento de envíos y logística de insumos médicos en tiempo real
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">Envíos activos</p>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <span className="material-symbols-outlined">local_shipping</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900">{activas}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span>En curso</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">Entregados hoy</p>
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <span className="material-symbols-outlined">task_alt</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900">{entregadosHoy}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span>Al día</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">Con incidencia</p>
            <span className="rounded-lg bg-amber-100 p-2 text-amber-600">
              <span className="material-symbols-outlined">warning</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900">{conIncidencia}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-rose-600">
            <span className="material-symbols-outlined text-xs">report_problem</span>
            <span>Requieren atención</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
          <h3 className="text-lg font-bold text-slate-900">
            Mis envíos
            <span className="ml-2 text-sm font-normal text-slate-400">({guiasFiltradas.length})</span>
          </h3>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por guía o descripción..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Nº Guía</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Punto de entrega</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Ruta</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guiasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    {busqueda ? 'Sin resultados para esa búsqueda.' : 'Este cliente aún no tiene envíos asignados.'}
                  </td>
                </tr>
              ) : (
                guiasFiltradas.map((g) => {
                  const ruta = rutas.find((r) => r.id === g.rutaId)
                  return (
                    <tr key={g.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-primary">{g.numeroGuia}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{g.descripcion}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {clientes.find((c) => c.id === g.clienteId)?.nombre ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClass[g.estado] ?? ''}`}>
                          {estadoLabel[g.estado] ?? g.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {ruta ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`size-1.5 rounded-full ${ruta.estado === 'EN_CURSO' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            Ruta #{ruta.id.replace('ruta-', '')} · {rutaEstadoLabel[ruta.estado] ?? ruta.estado}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/cliente/envios/${g.id}`} className="text-slate-400 transition-colors hover:text-primary">
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
