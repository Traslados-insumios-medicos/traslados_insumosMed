import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

interface GuiaApi { id: string; estado: string }
interface StopApi { id: string; orden: number; direccion: string }
interface RutaApi {
  id: string; fecha: string; estado: string
  chofer: { id: string; nombre: string }
  stops: StopApi[]
  guias: GuiaApi[]
}

export function ChoferHistorialPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [rutas, setRutas] = useState<RutaApi[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRutas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: RutaApi[] }>('/rutas?limit=100')
      setRutas(res.data.data)
    } catch {
      addToast('Error al cargar historial', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { fetchRutas() }, [fetchRutas])

  const estadoBadge = (estado: string) => {
    if (estado === 'EN_CURSO') return 'bg-emerald-100 text-emerald-700'
    if (estado === 'COMPLETADA') return 'bg-slate-100 text-slate-500'
    if (estado === 'PENDIENTE') return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-600'
  }

  const estadoLabel = (estado: string) => {
    if (estado === 'EN_CURSO') return 'En Curso'
    if (estado === 'COMPLETADA') return 'Completada'
    if (estado === 'PENDIENTE') return 'Pendiente'
    return 'Cancelada'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
      </div>
    )
  }

  if (rutas.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300">history</span>
        <p className="mt-2 text-sm text-slate-500">No hay rutas en el historial.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {rutas.map((ruta) => {
        const entregadas = ruta.guias.filter((g) => g.estado === 'ENTREGADO').length
        const incidencias = ruta.guias.filter((g) => g.estado === 'INCIDENCIA').length
        const total = ruta.guias.length
        const progreso = total ? Math.round(((entregadas + incidencias) / total) * 100) : 0

        return (
          <Link key={ruta.id} to={`/chofer/rutas/${ruta.id}`}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">RUTA #{ruta.id.slice(-6).toUpperCase()}</h3>
                <p className="text-xs text-slate-500">{ruta.fecha} • {ruta.stops.length} paradas</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${estadoBadge(ruta.estado)}`}>
                {estadoLabel(ruta.estado)}
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Progreso</span>
                <span className="font-semibold text-slate-700">{entregadas + incidencias} / {total} guías</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
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
  )
}
