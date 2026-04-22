import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

interface GuiaApi { id: string; estado: string }
interface StopApi { 
  id: string
  orden: number
  direccion: string
  cliente: { nombre: string }
}
interface RutaApi {
  id: string
  fecha: string
  estado: string
  chofer: { id: string; nombre: string }
  stops: StopApi[]
  guias: GuiaApi[]
}

const LIMIT = 10

export function ChoferHistorialPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [rutas, setRutas] = useState<RutaApi[]>([])
  const [loading, setLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<'' | 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA'>('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setPage(1)
  }, [estadoFiltro, fechaDesde, fechaHasta])

  const rutasFiltradas = useMemo(() => {
    let filtered = [...rutas]

    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase()
      filtered = filtered.filter((ruta) => {
        if (ruta.id.toLowerCase().includes(search)) return true
        const hasClienteMatch = ruta.stops.some((stop) =>
          stop.cliente?.nombre?.toLowerCase().includes(search)
        )
        if (hasClienteMatch) return true
        return false
      })
    }

    if (estadoFiltro) {
      filtered = filtered.filter((ruta) => ruta.estado === estadoFiltro)
    }

    if (fechaDesde) {
      filtered = filtered.filter((ruta) => ruta.fecha >= fechaDesde)
    }

    if (fechaHasta) {
      filtered = filtered.filter((ruta) => ruta.fecha <= fechaHasta)
    }

    return filtered
  }, [rutas, debouncedSearch, estadoFiltro, fechaDesde, fechaHasta])

  const totalPages = Math.max(1, Math.ceil(rutasFiltradas.length / LIMIT))
  const rutasPaginadas = rutasFiltradas.slice((page - 1) * LIMIT, page * LIMIT)

  const limpiarFiltros = () => {
    setSearchTerm('')
    setDebouncedSearch('')
    setEstadoFiltro('')
    setFechaDesde('')
    setFechaHasta('')
    setPage(1)
  }

  const hayFiltrosActivos = searchTerm || estadoFiltro || fechaDesde || fechaHasta

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Historial de Rutas</h2>
        <p className="text-sm text-slate-500">Consulta y filtra tus rutas anteriores</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Buscar</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente o ID de ruta..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estado</label>
            <div className="relative">
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as any)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_CURSO">En Curso</option>
                <option value="COMPLETADA">Completada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Acciones</label>
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={!hayFiltrosActivos}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              Limpiar
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>

        {hayFiltrosActivos && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-sm">filter_alt</span>
            <span>Mostrando {rutasFiltradas.length} de {rutas.length} rutas</span>
          </div>
        )}
      </div>

      {rutasPaginadas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">
            {hayFiltrosActivos ? 'search_off' : 'history'}
          </span>
          <p className="mt-2 text-sm text-slate-500">
            {hayFiltrosActivos ? 'No se encontraron rutas con los filtros aplicados' : 'No hay rutas en el historial'}
          </p>
          {hayFiltrosActivos && (
            <button type="button" onClick={limpiarFiltros} className="mt-3 text-sm font-semibold text-primary hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rutasPaginadas.map((ruta) => {
              const entregadas = ruta.guias.filter((g) => g.estado === 'ENTREGADO').length
              const incidencias = ruta.guias.filter((g) => g.estado === 'INCIDENCIA').length
              const total = ruta.guias.length
              const progreso = total ? Math.round(((entregadas + incidencias) / total) * 100) : 0

              return (
                <Link key={ruta.id} to={`/chofer/rutas/${ruta.id}`} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary hover:shadow-lg">
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-500">
                Página {page} de {totalPages} • {rutasFiltradas.length} ruta{rutasFiltradas.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-500">{page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
