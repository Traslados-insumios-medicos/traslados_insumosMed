import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../services/api'

interface RutaDashboard {
  id: string; fecha: string; estado: string; progreso: number
  totalGuias: number; primerDestino: string
  chofer: { id: string; nombre: string }
}

interface NovedadDashboard {
  id: string; tipo: string; descripcion: string; createdAt: string
  guia: { numeroGuia: string; clienteId: string }
}

interface DashboardData {
  enviosActivos: number; rutasEnCurso: number
  entregasCompletadas: number; novedadesCount: number
  ultimasRutas: RutaDashboard[]; ultimasNovedades: NovedadDashboard[]
}

const tipoLabel: Record<string, string> = {
  CLIENTE_AUSENTE: 'Cliente ausente',
  DIRECCION_INCORRECTA: 'Dirección incorrecta',
  MERCADERIA_DANADA: 'Mercadería dañada',
  OTRO: 'Otro',
}

const estadoBadge = (estado: string) => {
  if (estado === 'EN_CURSO') return 'bg-emerald-100 text-emerald-700'
  if (estado === 'COMPLETADA') return 'bg-slate-100 text-slate-600'
  if (estado === 'PENDIENTE') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

const kpiContainer = {
  show: { transition: { staggerChildren: 0.07 } },
}
const kpiItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

const novedadList = {
  show: { transition: { staggerChildren: 0.08 } },
}
const novedadItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardData>('/reportes/dashboard')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
      </div>
    )
  }

  const {
    enviosActivos = 0, rutasEnCurso = 0,
    entregasCompletadas = 0, novedadesCount = 0,
    ultimasRutas = [], ultimasNovedades = [],
  } = data ?? {}

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={kpiContainer}
        initial="hidden"
        animate="show"
      >
        {/* Envíos activos */}
        <motion.div variants={kpiItem} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50">
              <span className="material-symbols-outlined text-xl text-primary">package_2</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Activos</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{enviosActivos}</p>
          <p className="mt-1 text-sm text-slate-500">Envíos activos</p>
        </motion.div>

        {/* Rutas en curso */}
        <motion.div variants={kpiItem} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-50">
              <span className="material-symbols-outlined text-xl text-violet-600">route</span>
            </div>
            <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">En curso</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{rutasEnCurso}</p>
          <p className="mt-1 text-sm text-slate-500">Rutas en curso</p>
        </motion.div>

        {/* Entregas completadas */}
        <motion.div variants={kpiItem} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50">
              <span className="material-symbols-outlined text-xl text-emerald-600">check_circle</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Completadas</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{entregasCompletadas}</p>
          <p className="mt-1 text-sm text-slate-500">Entregas completadas</p>
        </motion.div>

        {/* Novedades */}
        <motion.div
          variants={kpiItem}
          className={`rounded-xl border p-5 shadow-sm ${novedadesCount > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}
        >
          <div className="flex items-center justify-between">
            <div className={`flex size-10 items-center justify-center rounded-lg ${novedadesCount > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
              <span className={`material-symbols-outlined text-xl ${novedadesCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>warning</span>
            </div>
            {novedadesCount > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Atención</span>
            )}
          </div>
          <p className={`mt-4 text-3xl font-bold ${novedadesCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{novedadesCount}</p>
          <p className="mt-1 text-sm text-slate-500">Novedades / Incidencias</p>
        </motion.div>
      </motion.div>

      {/* Rutas recientes + Novedades */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rutas recientes */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Rutas recientes</h3>
          </div>
          <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {ultimasRutas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">route</span>
                <p className="mt-2 text-sm text-slate-400">No hay rutas registradas</p>
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {ultimasRutas.map((ruta) => (
                    <div key={ruta.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                          {ruta.chofer.nombre.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {ruta.chofer.nombre.length > 50 ? ruta.chofer.nombre.slice(0, 50) + '...' : ruta.chofer.nombre}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {ruta.primerDestino.length > 50 ? ruta.primerDestino.slice(0, 50) + '...' : ruta.primerDestino}
                          </p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${estadoBadge(ruta.estado)}`}>
                        {ruta.estado === 'EN_CURSO' ? 'En Curso' : ruta.estado === 'COMPLETADA' ? 'Completada' : ruta.estado === 'PENDIENTE' ? 'Pendiente' : 'Cancelada'}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Desktop: table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Chofer</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Destino</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Progreso</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ultimasRutas.map((ruta) => (
                        <tr key={ruta.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                                {ruta.chofer.nombre.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-800">
                                {ruta.chofer.nombre.length > 50 ? ruta.chofer.nombre.slice(0, 50) + '...' : ruta.chofer.nombre}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="max-w-[300px] truncate">
                              {ruta.primerDestino.length > 50 ? ruta.primerDestino.slice(0, 50) + '...' : ruta.primerDestino}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ruta.progreso}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">{ruta.progreso}%</span>
                            </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estadoBadge(ruta.estado)}`}>
                            {ruta.estado === 'EN_CURSO' ? 'En Curso' : ruta.estado === 'COMPLETADA' ? 'Completada' : ruta.estado === 'PENDIENTE' ? 'Pendiente' : 'Cancelada'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Novedades recientes */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Novedades recientes</h3>
            {novedadesCount > 0 && <span className="size-2 animate-pulse rounded-full bg-red-500" />}
          </div>
          <motion.div
            className="space-y-3"
            variants={novedadList}
            initial="hidden"
            animate="show"
            key={ultimasNovedades.map((n) => n.id).join(',')}
          >
            {ultimasNovedades.length === 0 ? (
              <motion.div
                variants={novedadItem}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-10 text-center shadow-sm"
              >
                <span className="material-symbols-outlined text-3xl text-slate-300">check_circle</span>
                <p className="mt-2 text-sm text-slate-400">Sin novedades</p>
              </motion.div>
            ) : (
              ultimasNovedades.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  variants={novedadItem}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-50">
                      <span className="material-symbols-outlined text-sm text-red-500">warning</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{tipoLabel[n.tipo] ?? n.tipo}</p>
                      <p className="text-xs text-primary">Guía {n.guia.numeroGuia}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{n.descripcion}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
