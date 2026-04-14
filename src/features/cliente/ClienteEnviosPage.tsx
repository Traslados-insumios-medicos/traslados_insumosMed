import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGsapStaggerChildren } from '../../hooks/useGsapStaggerChildren'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

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

type VistaTab = 'activos' | 'historial' | 'todos'

interface RutaMini {
  id: string
  fecha: string
  estado: string
}

interface GuiaListItem {
  id: string
  numeroGuia: string
  descripcion: string
  estado: string
  clienteId: string
  cliente: { id: string; nombre: string }
  ruta: RutaMini
}

interface MisEnviosResponse {
  data: GuiaListItem[]
  total: number
  page: number
  limit: number
  resumen: {
    activas: number
    entregadosHoy: number
    incidencias: number
    nombreEmpresa: string
  }
}

export function ClienteEnviosPage() {
  const addToast = useToastStore((s) => s.addToast)
  const rootRef = useRef<HTMLDivElement>(null)

  const [vista, setVista] = useState<VistaTab>('activos')
  const [busqueda, setBusqueda] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<MisEnviosResponse | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(busqueda.trim()), 350)
    return () => window.clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, vista])

  const fetchEnvios = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        vista,
        page: String(page),
        limit: '10',
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await api.get<MisEnviosResponse>(`/guias/mis-envios?${params}`)
      setPayload(res.data)
    } catch {
      addToast('No se pudieron cargar los envíos', 'error')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [vista, page, debouncedSearch, addToast])

  useEffect(() => {
    fetchEnvios()
  }, [fetchEnvios])

  useGsapStaggerChildren(rootRef, '[data-gsap-reveal]', [loading, vista])

  const resumen = payload?.resumen
  const guiasFiltradas = payload?.data ?? []
  const total = payload?.total ?? 0
  const limit = payload?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div ref={rootRef} className="space-y-6 sm:space-y-8">
      <div data-gsap-reveal>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {resumen?.nombreEmpresa ?? '…'} · Panel
        </h1>
        <p className="text-sm text-slate-500 sm:text-base">
          Seguimiento de envíos y logística de insumos médicos
        </p>
      </div>

      <div data-gsap-reveal className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {(
          [
            { id: 'activos' as const, label: 'En curso' },
            { id: 'historial' as const, label: 'Historial (entregados)' },
            { id: 'todos' as const, label: 'Todos' },
          ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setVista(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              vista === t.id
                ? 'bg-primary text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div
          data-gsap-reveal
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">Envíos activos</p>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <span className="material-symbols-outlined">local_shipping</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900">{resumen?.activas ?? '—'}</p>
          <p className="text-sm font-medium text-slate-500">En curso o con incidencia</p>
        </div>
        <div
          data-gsap-reveal
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">Entregados hoy</p>
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <span className="material-symbols-outlined">task_alt</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900">{resumen?.entregadosHoy ?? '—'}</p>
          <p className="text-sm font-medium text-slate-500">Según fecha del servidor</p>
        </div>
        <div
          data-gsap-reveal
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">Con incidencia</p>
            <span className="rounded-lg bg-amber-100 p-2 text-amber-600">
              <span className="material-symbols-outlined">warning</span>
            </span>
          </div>
          <p className="text-3xl font-bold leading-tight text-slate-900">{resumen?.incidencias ?? '—'}</p>
          <p className="text-sm font-medium text-rose-600">Requieren seguimiento</p>
        </div>
      </div>

      <div
        data-gsap-reveal
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
          <h3 className="text-lg font-bold text-slate-900">
            Listado
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({loading ? '…' : total} registros)
            </span>
          </h3>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por guía o descripción…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
            </div>
          ) : (
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
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                      {debouncedSearch ? 'Sin resultados para esa búsqueda.' : 'No hay envíos en esta vista.'}
                    </td>
                  </tr>
                ) : (
                  guiasFiltradas.map((g) => {
                    const ruta = g.ruta
                    return (
                      <tr key={g.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-primary">{g.numeroGuia}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{g.descripcion}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{g.cliente?.nombre ?? '—'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClass[g.estado] ?? ''}`}
                          >
                            {estadoLabel[g.estado] ?? g.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {ruta ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`size-1.5 rounded-full ${ruta.estado === 'EN_CURSO' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                              />
                              Ruta #{ruta.id.slice(-6)} · {rutaEstadoLabel[ruta.estado] ?? ruta.estado}
                            </span>
                          ) : (
                            '—'
                          )}
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
          )}
        </div>
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
              Página {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
