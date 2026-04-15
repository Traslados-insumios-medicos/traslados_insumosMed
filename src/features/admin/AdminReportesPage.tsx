import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils'

type TabId = 'cliente' | 'fechas' | 'chofer'

interface ResumenCliente {
  clienteId: string; nombre: string; total: number
  entregados: number; pendientes: number; incidencias: number
  tipo: 'PRINCIPAL' | 'SECUNDARIO'
  clientePrincipal?: { nombre: string } | null
}

interface GuiaFecha {
  id: string; numeroGuia: string; descripcion: string; estado: string
  createdAt: string; cliente: { nombre: string }
  ruta: { chofer: { nombre: string } }
}

interface GuiaChofer {
  guiaId: string; numeroGuia: string; descripcion: string; estado: string
  cliente: string; receptorNombre?: string; horaLlegada?: string
  horaSalida?: string; temperatura?: string; observaciones?: string
  novedades: string[]
}

interface RutaChofer { rutaId: string; fecha: string; estado: string; guias: GuiaChofer[] }
interface ResumenChofer { choferId: string; nombre: string; cedula?: string; rutas: RutaChofer[] }

interface ChoferOption { id: string; nombre: string }
interface ClienteOption { id: string; nombre: string }

const tabs: { id: TabId; label: string }[] = [
  { id: 'cliente', label: 'Por cliente' },
  { id: 'fechas', label: 'Por rango de fechas' },
  { id: 'chofer', label: 'Por chofer' },
]

const LIMIT = 10

const trunc = (str: string | undefined | null, max = 50) => {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 3) + '...' : str
}

export function AdminReportesPage() {
  const addToast = useToastStore((s) => s.addToast)

  const [tab, setTab] = useState<TabId>('cliente')
  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [choferId, setChoferId] = useState('')
  const [tipoCliente, setTipoCliente] = useState<'' | 'PRINCIPAL' | 'SECUNDARIO'>('')

  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [choferes, setChoferes] = useState<ChoferOption[]>([])

  const [dataCliente, setDataCliente] = useState<ResumenCliente[]>([])
  const [dataFechas, setDataFechas] = useState<GuiaFecha[]>([])
  const [dataChofer, setDataChofer] = useState<ResumenChofer[]>([])

  const [loading, setLoading] = useState(false)
  const [choferExpandidoId, setChoferExpandidoId] = useState<string | null>(null)
  
  // Paginación
  const [pageCliente, setPageCliente] = useState(1)
  const [pageFechas, setPageFechas] = useState(1)
  const [pageChofer, setPageChofer] = useState(1)

  const totalPagesCliente = Math.max(1, Math.ceil(dataCliente.length / LIMIT))
  const totalPagesFechas = Math.max(1, Math.ceil(dataFechas.length / LIMIT))
  const totalPagesChofer = Math.max(1, Math.ceil(dataChofer.length / LIMIT))

  const dataClientePaginada = dataCliente.slice((pageCliente - 1) * LIMIT, pageCliente * LIMIT)
  const dataFechasPaginada = dataFechas.slice((pageFechas - 1) * LIMIT, pageFechas * LIMIT)
  const dataChoferPaginada = dataChofer.slice((pageChofer - 1) * LIMIT, pageChofer * LIMIT)

  // Load filter options
  useEffect(() => {
    const params = new URLSearchParams()
    if (tipoCliente) params.set('tipo', tipoCliente)
    params.set('limit', '100')
    api.get<{ data: ClienteOption[] }>(`/clientes?${params}`).then((r) => setClientes(r.data.data)).catch(() => {})
    api.get<{ data: ChoferOption[] }>('/usuarios?rol=CHOFER&limit=100').then((r) => setChoferes(r.data.data)).catch(() => {})
  }, [tipoCliente])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'cliente') {
        const params = new URLSearchParams()
        if (clienteId) params.set('clienteId', clienteId)
        if (tipoCliente) params.set('tipo', tipoCliente)
        if (fechaDesde) params.set('desde', fechaDesde)
        if (fechaHasta) params.set('hasta', fechaHasta)
        const res = await api.get<ResumenCliente[]>(`/reportes/clientes?${params}`)
        setDataCliente(res.data)
      } else if (tab === 'fechas') {
        const params = new URLSearchParams()
        if (fechaDesde) params.set('desde', fechaDesde)
        if (fechaHasta) params.set('hasta', fechaHasta)
        if (clienteId) params.set('clienteId', clienteId)
        const res = await api.get<GuiaFecha[]>(`/reportes/fechas?${params}`)
        setDataFechas(res.data)
      } else {
        const params = new URLSearchParams()
        if (choferId) params.set('choferId', choferId)
        if (fechaDesde) params.set('desde', fechaDesde)
        if (fechaHasta) params.set('hasta', fechaHasta)
        const res = await api.get<ResumenChofer[]>(`/reportes/choferes?${params}`)
        setDataChofer(res.data)
      }
    } catch {
      addToast('Error al cargar reporte', 'error')
    } finally {
      setLoading(false)
    }
  }, [tab, fechaDesde, fechaHasta, clienteId, choferId, tipoCliente, addToast])

  useEffect(() => { 
    fetchData()
    // Reset pagination when changing tabs or filters
    setPageCliente(1)
    setPageFechas(1)
    setPageChofer(1)
  }, [fetchData])

  // Export helpers
  const buildFilterInfo = () => {
    const filters: string[] = []
    if (tipoCliente) {
      filters.push(`Tipo de cliente: ${tipoCliente === 'PRINCIPAL' ? 'Principales' : 'Secundarios'}`)
    }
    if (clienteId) {
      const cliente = clientes.find(c => c.id === clienteId)
      if (cliente) filters.push(`Cliente: ${cliente.nombre}`)
    }
    if (fechaDesde) {
      filters.push(`Desde: ${new Date(fechaDesde).toLocaleDateString('es-ES')}`)
    }
    if (fechaHasta) {
      filters.push(`Hasta: ${new Date(fechaHasta).toLocaleDateString('es-ES')}`)
    }
    if (choferId) {
      const chofer = choferes.find(c => c.id === choferId)
      if (chofer) filters.push(`Chofer: ${chofer.nombre}`)
    }
    return filters.length > 0 ? filters : undefined
  }

  const handleExportClienteExcel = () => {
    exportToExcel(
      dataCliente.map((r) => ({ 
        Cliente: r.nombre, 
        Tipo: r.tipo === 'PRINCIPAL' ? 'Principal' : `Secundario (${r.clientePrincipal?.nombre || 'Sin asignar'})`,
        'Total guías': r.total, 
        Entregados: r.entregados, 
        Pendientes: r.pendientes, 
        Incidencias: r.incidencias 
      })),
      'reporte-por-cliente', 
      'Por Cliente',
      buildFilterInfo()
    )
  }
  const handleExportClientePDF = () => {
    exportToPDF(
      'Reporte por Cliente', 
      ['Cliente', 'Tipo', 'Total guías', 'Entregados', 'Pendientes', 'Incidencias'],
      dataCliente.map((r) => [
        r.nombre, 
        r.tipo === 'PRINCIPAL' ? 'Principal' : `Secundario (${r.clientePrincipal?.nombre || 'Sin asignar'})`,
        r.total, 
        r.entregados, 
        r.pendientes, 
        r.incidencias
      ]), 
      'reporte-por-cliente',
      buildFilterInfo()
    )
  }

  const buildChoferRows = () => {
    const rows: Record<string, string | number>[] = []
    dataChofer.forEach((ch) => {
      ch.rutas.forEach((r) => {
        r.guias.forEach((g) => {
          rows.push({
            Chofer: ch.nombre, Ruta: r.rutaId, Fecha: r.fecha, Cliente: g.cliente,
            'Nº Guía': g.numeroGuia, Estado: g.estado, 'Recibido por': g.receptorNombre ?? '—',
            'Hora llegada': g.horaLlegada ?? '—', 'Hora salida': g.horaSalida ?? '—',
            Temperatura: g.temperatura ?? '—', Novedades: g.novedades.join(' | ') || '—',
          })
        })
      })
    })
    return rows
  }
  const handleExportChoferExcel = () => exportToExcel(buildChoferRows(), 'reporte-por-chofer', 'Por Chofer', buildFilterInfo())
  const handleExportChoferPDF = () => {
    const rows = buildChoferRows()
    exportToPDF('Reporte por Chofer',
      ['Chofer', 'Ruta', 'Fecha', 'Cliente', 'Nº Guía', 'Estado', 'Recibido por', 'H. Llegada', 'H. Salida', 'Temp.', 'Novedades'],
      rows.map((r) => [r['Chofer'], r['Ruta'], r['Fecha'], r['Cliente'], r['Nº Guía'], r['Estado'], r['Recibido por'], r['Hora llegada'], r['Hora salida'], r['Temperatura'], r['Novedades']]),
      'reporte-por-chofer',
      buildFilterInfo())
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
        <p className="text-sm text-slate-500">Filtros y reportes por cliente, fechas y chofer.</p>
      </div>

      {/* Filtros globales */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tipo de cliente</label>
            <div className="relative">
              <select 
                value={tipoCliente} 
                onChange={(e) => {
                  setTipoCliente(e.target.value as '' | 'PRINCIPAL' | 'SECUNDARIO')
                  setClienteId('') // Reset cliente selection when tipo changes
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="">Todos</option>
                <option value="PRINCIPAL">Principales</option>
                <option value="SECUNDARIO">Secundarios</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cliente</label>
            <div className="relative">
              <select 
                value={clienteId} 
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="">Todos</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Desde</label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hasta</label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Chofer</label>
            <div className="relative">
              <select 
                value={choferId} 
                onChange={(e) => setChoferId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <option value="">Todos</option>
                {choferes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        
        {/* Botones de exportación */}
        <div className="flex gap-2 pb-2">
          {tab === 'cliente' && (
            <>
              <button type="button" onClick={handleExportClienteExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                <span className="material-symbols-outlined text-sm">table_view</span>Excel
              </button>
              <button type="button" onClick={handleExportClientePDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>PDF
              </button>
            </>
          )}
          {tab === 'chofer' && (
            <>
              <button type="button" onClick={handleExportChoferExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                <span className="material-symbols-outlined text-sm">table_view</span>Excel
              </button>
              <button type="button" onClick={handleExportChoferPDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>PDF
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : (
          <>
            {tab === 'cliente' && (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Tipo / Pertenece a</th>
                        <th className="px-4 py-3 text-center">Total guías</th>
                        <th className="px-4 py-3 text-center">Entregados</th>
                        <th className="px-4 py-3 text-center">Pendientes</th>
                        <th className="px-4 py-3 text-center">Incidencias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataClientePaginada.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                            No hay datos para mostrar con los filtros seleccionados
                          </td>
                        </tr>
                      ) : (
                        dataClientePaginada.map((r) => (
                          <tr key={r.clienteId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                  r.tipo === 'PRINCIPAL' ? 'bg-primary/10' : 'bg-slate-100'
                                }`}>
                                  <span className={`material-symbols-outlined text-[16px] ${
                                    r.tipo === 'PRINCIPAL' ? 'text-primary' : 'text-slate-400'
                                  }`}>
                                    {r.tipo === 'PRINCIPAL' ? 'corporate_fare' : 'location_on'}
                                  </span>
                                </div>
                                <span className="font-medium text-slate-900">{trunc(r.nombre, 40)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {r.tipo === 'PRINCIPAL' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                  <span className="material-symbols-outlined text-[14px]">verified</span>
                                  Principal
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <span className="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                                  <span>{r.clientePrincipal?.nombre || 'Sin asignar'}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                                {r.total}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                                {r.entregados}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
                                {r.pendientes}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700">
                                {r.incidencias}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPagesCliente > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                    <p className="text-slate-500">{dataCliente.length} cliente{dataCliente.length !== 1 ? 's' : ''}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPageCliente(p => p - 1)} disabled={pageCliente <= 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        Anterior
                      </button>
                      <span className="text-slate-500">{pageCliente} / {totalPagesCliente}</span>
                      <button type="button" onClick={() => setPageCliente(p => p + 1)} disabled={pageCliente >= totalPagesCliente}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'fechas' && (
              <div className="p-4">
                <p className="mb-4 text-sm text-slate-500">
                  Guías en el rango: <strong className="text-slate-900">{dataFechas.length}</strong>
                  {(fechaDesde || fechaHasta) && (
                    <span className="ml-2 text-xs">
                      ({fechaDesde && `desde ${fechaDesde}`} {fechaHasta && `hasta ${fechaHasta}`})
                    </span>
                  )}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Guía</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Chofer</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataFechasPaginada.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-primary max-w-[120px] break-words overflow-hidden">{trunc(g.numeroGuia)}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-[150px] break-words overflow-hidden">{trunc(g.cliente.nombre)}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-[150px] break-words overflow-hidden">{trunc(g.ruta.chofer.nombre)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${
                              g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                              g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{g.estado}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(g.createdAt).toLocaleDateString('es-ES')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPagesFechas > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3 text-sm">
                    <p className="text-slate-500">{dataFechas.length} guía{dataFechas.length !== 1 ? 's' : ''}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPageFechas(p => p - 1)} disabled={pageFechas <= 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        Anterior
                      </button>
                      <span className="text-slate-500">{pageFechas} / {totalPagesFechas}</span>
                      <button type="button" onClick={() => setPageFechas(p => p + 1)} disabled={pageFechas >= totalPagesFechas}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'chofer' && (
              <div>
                <div className="divide-y divide-slate-100">
                  {dataChoferPaginada.map((ch) => {
                    const expandido = choferExpandidoId === ch.choferId
                    const totalGuias = ch.rutas.reduce((a, r) => a + r.guias.length, 0)
                    const entregadas = ch.rutas.reduce((a, r) => a + r.guias.filter((g) => g.estado === 'ENTREGADO').length, 0)
                    return (
                      <div key={ch.choferId}>
                        <button type="button" onClick={() => setChoferExpandidoId(expandido ? null : ch.choferId)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-slate-400 transition-transform ${expandido ? 'rotate-90' : ''}`}>chevron_right</span>
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                              <span className="material-symbols-outlined text-sm">person</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 break-words overflow-hidden">{trunc(ch.nombre)}</p>
                              <p className="text-xs text-slate-500">{ch.rutas.length} rutas · {entregadas}/{totalGuias} guías entregadas</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-emerald-600">
                            Completado: {totalGuias > 0 ? Math.round((entregadas / totalGuias) * 100) : 0}%
                          </span>
                        </button>

                        {expandido && (
                          <div className="border-t border-slate-100 bg-slate-50">
                            {ch.rutas.map((ruta) => (
                              <div key={ruta.rutaId} className="border-b border-slate-100 px-12 py-3 last:border-0">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                                  RUTA #{ruta.rutaId.slice(-6).toUpperCase()} • {ruta.fecha} • <span className="normal-case font-normal text-slate-500">{ruta.estado}</span>
                                </p>
                                <div className="space-y-2">
                                  {ruta.guias.map((g) => (
                                    <div key={g.guiaId} className="rounded-lg border border-slate-200 bg-white p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-semibold text-slate-900 break-words overflow-hidden">{trunc(g.cliente)} · <span className="text-primary">{trunc(g.numeroGuia)}</span></p>
                                          <p className="text-xs text-slate-500 break-words overflow-hidden">{trunc(g.descripcion)}</p>
                                        </div>
                                        <span className={`whitespace-nowrap flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                                          g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                                          'bg-slate-100 text-slate-600'
                                        }`}>{g.estado}</span>
                                      </div>
                                      {(g.receptorNombre || g.horaLlegada || g.temperatura) && (
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                          {g.receptorNombre && <span className="break-words overflow-hidden">Receptor: {trunc(g.receptorNombre)}</span>}
                                          {g.horaLlegada && <span className="whitespace-nowrap">Llegada: {g.horaLlegada}</span>}
                                          {g.horaSalida && <span className="whitespace-nowrap">Salida: {g.horaSalida}</span>}
                                          {g.temperatura && <span className="whitespace-nowrap">Temperatura: {g.temperatura}</span>}
                                        </div>
                                      )}
                                      {g.novedades.length > 0 && (
                                        <div className="mt-1.5 text-xs text-amber-600 break-words overflow-hidden">Novedades: {g.novedades.map(n => trunc(n)).join(' · ')}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {totalPagesChofer > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                    <p className="text-slate-500">{dataChofer.length} chofer{dataChofer.length !== 1 ? 'es' : ''}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPageChofer(p => p - 1)} disabled={pageChofer <= 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        Anterior
                      </button>
                      <span className="text-slate-500">{pageChofer} / {totalPagesChofer}</span>
                      <button type="button" onClick={() => setPageChofer(p => p + 1)} disabled={pageChofer >= totalPagesChofer}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
