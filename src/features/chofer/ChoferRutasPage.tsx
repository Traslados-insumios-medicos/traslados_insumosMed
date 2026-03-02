import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'

export function ChoferRutasPage() {
  const { currentUser } = useAuthStore()
  const { rutas, stops, guias } = useLogisticsStore()

  const misRutas = rutas.filter((r) => r.choferId === currentUser?.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mis rutas</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rutas asignadas al chofer actual con resumen de paradas y guías.
        </p>
      </div>

      {misRutas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
            route
          </span>
          <p className="mt-2 text-sm text-slate-500">No tienes rutas asignadas por el momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {misRutas.map((ruta) => {
            const rutaStops = stops.filter((s) => ruta.stopIds.includes(s.id))
            const guiasRuta = guias.filter((g) => g.rutaId === ruta.id)
            const entregadas = guiasRuta.filter((g) => g.estado === 'ENTREGADO').length
            const progreso = guiasRuta.length ? Math.round((entregadas / guiasRuta.length) * 100) : 0

            return (
              <Link
                key={ruta.id}
                to={`/chofer/rutas/${ruta.id}`}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-primary hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Ruta #{ruta.id.replace('ruta-', '')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Distribución de Insumos Médicos
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                      ruta.estado === 'EN_CURSO'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {ruta.estado === 'EN_CURSO' ? 'En Curso' : ruta.estado}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Progreso de entrega: {progreso}%
                    </span>
                    <span className="font-bold text-primary">
                      {entregadas} / {guiasRuta.length} Paradas
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-2.5 rounded-full bg-primary"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Fecha: {ruta.fecha} · {rutaStops.length} paradas
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
