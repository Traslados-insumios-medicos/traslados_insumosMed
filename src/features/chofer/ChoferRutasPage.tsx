import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

interface GuiaApi { id: string; estado: string }
interface StopApi { id: string; orden: number; direccion: string }
interface RutaApi {
  id: string; fecha: string; estado: string; createdAt: string
  chofer: { id: string; nombre: string }
  stops: StopApi[]
  guias: GuiaApi[]
}

interface PaginatedRutas {
  data: RutaApi[]
  total: number
  page: number
  limit: number
}

type Filtro = 'activas' | 'todas' | 'completadas'
type FiltroFecha = 'hoy' | 'ayer' | 'manana' | 'todas'

const LIMIT = 10

export function ChoferRutasPage() {
  const { currentUser } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)

  const [rutas, setRutas] = useState<RutaApi[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const isHistorial = location.pathname.includes('historial')
  const [filtro, setFiltro] = useState<Filtro>(isHistorial ? 'todas' : 'activas')
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('hoy')
  const [fechaCustom, setFechaCustom] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Debounce para el buscador
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setFiltro(isHistorial ? 'todas' : 'activas')
  }, [isHistorial])

  const getFechaFiltro = useCallback(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    if (filtroFecha === 'hoy') return hoy.toISOString().slice(0, 10)
    if (filtroFecha === 'ayer') {
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      return ayer.toISOString().slice(0, 10)
    }
    if (filtroFecha === 'manana') {
      const manana = new Date(hoy)
      manana.setDate(manana.getDate() + 1)
      return manana.toISOString().slice(0, 10)
    }
    return fechaCustom || undefined
  }, [filtroFecha, fechaCustom])

  const fetchRutas = useCallback(async (p: number = 1) => {
    setLoading(true)
    try {
      const fechaParam = getFechaFiltro()
      const params = new URLSearchParams({ page: p.toString(), limit: LIMIT.toString() })
      if (fechaParam) params.append('fecha', fechaParam)
      if (filtroEstado) params.append('estado', filtroEstado)
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())
      
      const res = await api.get<PaginatedRutas>(`/rutas?${params.toString()}`)
      setRutas(res.data.data)
      setTotal(res.data.total)
      setPage(p)
    } catch {
      addToast('Error al cargar rutas', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, getFechaFiltro, filtroEstado, debouncedSearch])

  useEffect(() => { fetchRutas(1) }, [fetchRutas])

  useEffect(() => {
    // Recargar cuando cambie el filtro de fecha
    fetchRutas(1)
  }, [filtroFecha, fechaCustom, filtroEstado, debouncedSearch, fetchRutas])

  const rutasFiltradas = rutas.filter((r) => {
    if (filtro === 'activas') return r.estado === 'PENDIENTE' || r.estado === 'EN_CURSO'
    if (filtro === 'completadas') return r.estado === 'COMPLETADA' || r.estado === 'CANCELADA'
    return true
  })

  // Stats
  const totalGuias = rutas.flatMap((r) => r.guias).length
  const entregadasTotal = rutas.flatMap((r) => r.guias).filter((g) => g.estado === 'ENTREGADO').length
  const incidenciasTotal = rutas.flatMap((r) => r.guias).filter((g) => g.estado === 'INCIDENCIA').length
  const rutasEnCurso = rutas.filter((r) => r.estado === 'EN_CURSO').length

  const estadoBadge = (estado: string) => {
    if (estado === 'EN_CURSO') return 'bg-emerald-100 text-emerald-700'
    if (estado === 'COMPLETADA') return 'bg-slate-100 text-slate-500'
    if (estado === 'PENDIENTE') return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-600'
  }

  const hoy = new Date()

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Hola, {currentUser?.nombre?.split(' ')[0]}
          </h2>
        </div>
        {rutasEnCurso > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            En ruta
          </span>
        )}
      </div>

      {/* Mini dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Rutas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{rutas.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Entregas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {entregadasTotal}<span className="text-sm font-normal text-slate-400">/{totalGuias}</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Incidencias</p>
          <p className={`mt-1 text-2xl font-bold ${incidenciasTotal > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {incidenciasTotal}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Progreso</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {totalGuias ? Math.round((entregadasTotal / totalGuias) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por cliente o receptor..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Filtros de fecha */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500">Fecha:</span>
        {(['hoy', 'ayer', 'manana', 'todas'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFiltroFecha(f)
              setFechaCustom('')
            }}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filtroFecha === f && !fechaCustom
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'hoy' ? 'Hoy' : f === 'ayer' ? 'Ayer' : f === 'manana' ? 'Ma••ana' : 'Todas'}
          </button>
        ))}
        <input
          type="date"
          value={fechaCustom}
          onChange={(e) => {
            setFechaCustom(e.target.value)
            setFiltroFecha('todas')
          }}
          placeholder="Fecha espec••fica"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px]"
        />
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500">Estado:</span>
        {[
          { value: '', label: 'Todos' },
          { value: 'PENDIENTE', label: 'Pendiente' },
          { value: 'EN_CURSO', label: 'En Curso' },
          { value: 'COMPLETADA', label: 'Completada' },
        ].map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => setFiltroEstado(e.value)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filtroEstado === e.value
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Filtros de tipo (legacy - mantener compatibilidad) */}
      <div className="flex flex-wrap gap-1.5">
        {(['activas', 'todas', 'completadas'] as Filtro[]).map((f) => (
          <button key={f} type="button" onClick={() => setFiltro(f)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filtro === f ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {f === 'activas' ? 'Activas' : f === 'todas' ? 'Todas' : 'Completadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
        </div>
      ) : rutasFiltradas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300">
            {debouncedSearch || filtroEstado || fechaCustom ? 'search_off' : 'route'}
          </span>
          <p className="mt-2 text-sm text-slate-500">
            {debouncedSearch || filtroEstado || fechaCustom
              ? 'No se encontraron rutas con los filtros aplicados.'
              : filtro === 'activas' 
                ? 'No ten••s rutas activas.' 
                : 'No hay rutas en esta categor••a.'}
          </p>
          {(debouncedSearch || filtroEstado || fechaCustom) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setFiltroEstado('')
                setFechaCustom('')
                setFiltroFecha('hoy')
              }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rutasFiltradas.map((ruta) => {
            console.log('Ruta data:', { id: ruta.id, createdAt: ruta.createdAt, fecha: ruta.fecha })
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
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Creada: {new Date(ruta.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${estadoBadge(ruta.estado)}`}>
                    {ruta.estado === 'EN_CURSO' ? 'En Curso' : ruta.estado === 'COMPLETADA' ? 'Completada' : ruta.estado === 'PENDIENTE' ? 'Pendiente' : 'Cancelada'}
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
      )}

      {/* Paginaci••n */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">{total} ruta{total !== 1 ? 's' : ''} en total</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchRutas(page - 1)} disabled={page <= 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Anterior
            </button>
            <span className="text-slate-500">{page} / {totalPages}</span>
            <button type="button" onClick={() => fetchRutas(page + 1)} disabled={page >= totalPages || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
