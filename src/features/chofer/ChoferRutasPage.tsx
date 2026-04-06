import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'

export function ChoferRutasPage() {
  const { currentUser } = useAuthStore()
  const { rutas, stops, guias } = useLogisticsStore()
  const [filtro, setFiltro] = useState<'todas' | 'activas' | 'completadas'>('activas')

  const misRutas = rutas.filter((r) => r.choferId === currentUser?.id)

  // Stats del día
  const totalGuias = guias.filter((g) => misRutas.some((r) => r.id === g.rutaId)).length
  const entregadasTotal = guias.filter(
    (g) => misRutas.some((r) => r.id === g.rutaId) && g.estado === 'ENTREGADO',
  ).length
  const incidenciasTotal = guias.filter(
    (g) => misRutas.some((r) => r.id === g.rutaId) && g.estado === 'INCIDENCIA',
  ).length
  const rutasEnCurso = misRutas.filter((r) => r.estado === 'EN_CURSO').length

  const rutasFiltradas = misRutas.filter((r) => {
    if (filtro === 'activas') return r.estado === 'PENDIENTE' || r.estado === 'EN_CURSO'
    if (filtro === 'completadas') return r.estado === 'COMPLETADA' || r.estado === 'CANCELADA'
    return true
  })

  const estadoBadge = (estado: string) => {
    if (estado === 'EN_CURSO') return 'bg-emerald-100 text-emerald-700'
    if (estado === 'COMPLETADA') return 'bg-slate-100 text-slate-500'
    if (estado === 'PENDIENTE') return 'bg-amber-100 text-amber-700'
    if (estado === 'CANCELADA') return 'bg-red-100 text-red-600'
    return 'bg-slate-100 text-slate-600'
  }

  const estadoLabel = (estado: string) => {
    if (estado === 'EN_CURSO') return 'En Curso'
    if (estado === 'COMPLETADA') return 'Completada'
    if (estado === 'PENDIENTE') return 'Pendiente'
    if (estado === 'CANCELADA') return 'Cancelada'
    return estado
  }

  const hoy = new Date()

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Saludo + fecha */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Hola, {currentUser?.nombre?.split(' ')[0]} 👋
          </h2>
        </div>
        {rutasEnCurso > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            En ruta
          </span>
        )}
      </div>

      {/* Mini dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Rutas hoy</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{misRutas.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Entregas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {entregadasTotal}
            <span className="text-sm font-normal text-slate-400">/{totalGuias}</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Incidencias</p>
          <p className={`mt-1 text-2xl font-bold ${incidenciasTotal > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
            {incidenciasTotal}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Progreso</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {totalGuias ? Math.round((entregadasTotal / totalGuias) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['activas', 'todas', 'completadas'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtro === f
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {f === 'activas' ? 'Activas' : f === 'todas' ? 'Todas' : 'Completadas'}
          </button>
        ))}
      </div>

      {/* Lista de rutas */}
      {rutasFiltradas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <span className="material-symbols-outlined text-4xl text-slate-300">route</span>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {filtro === 'activas' ? 'No tenés rutas activas.' : 'No hay rutas en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rutasFiltradas.map((ruta) => {
            const rutaStops = stops.filter((s) => ruta.stopIds.includes(s.id))
            const guiasRuta = guias.filter((g) => g.rutaId === ruta.id)
            const entregadas = guiasRuta.filter((g) => g.estado === 'ENTREGADO').length
            const incidencias = guiasRuta.filter((g) => g.estado === 'INCIDENCIA').length
            const progreso = guiasRuta.length
              ? Math.round(((entregadas + incidencias) / guiasRuta.length) * 100)
              : 0

            return (
              <Link
                key={ruta.id}
                to={`/chofer/rutas/${ruta.id}`}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Ruta #{ruta.id.replace('ruta-', '')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {ruta.fecha} · {rutaStops.length} paradas
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${estadoBadge(ruta.estado)}`}>
                    {estadoLabel(ruta.estado)}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Progreso</span>
                    <span className="font-semibold text-slate-700 dark:text-white">
                      {entregadas + incidencias} / {guiasRuta.length} guías
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${progreso}%` }} />
                  </div>
                </div>

                {incidencias > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {incidencias} incidencia{incidencias > 1 ? 's' : ''}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
