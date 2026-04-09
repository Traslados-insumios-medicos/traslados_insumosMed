import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils'

type TabId = 'cliente' | 'fechas' | 'chofer'

interface ResumenCliente {
  clienteId: string; nombre: string; total: number
  entregados: number; pendientes: number; incidencias: number
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

export function AdminReportesPage() {
  const addToast = useToastStore((s) => s.addToast)

  const [tab, setTab] = useState<TabId>('cliente')
  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [choferId, setChoferId] = useState('')

  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [choferes, setChoferes] = useState<ChoferOption[]>([])

  const [dataCliente, setDataCliente] = useState<ResumenCliente[]>([])
  const [dataFechas, setDataFechas] = useState<GuiaFecha[]>([])
  const [dataChofer, setDataChofer] = useState<ResumenChofer[]>([])

  const [loading, setLoading] = useState(false)
  const [choferExpandidoId, setChoferExpandidoId] = useState<string | null>(null)

  // Load filter options
  useEffect(() => {
    api.get<{ data: ClienteOption[] }>('/clientes?limit=100').then((r) => setClientes(r.data.data)).catch(() => {})
    api.get<{ data: ChoferOption[] }>('/usuarios?rol=CHOFER&limit=100').then((r) => setChoferes(r.data.data)).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'cliente') {
        const res = await api.get<ResumenCliente[]>('/reportes/clientes')
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
        const res = await api.get<ResumenChofer[]>(`/reportes/choferes?${params}`)
        setDataChofer(res.data)
      }
    } catch {
      addToast('Error al cargar reporte', 'error')
    } finally {
      setLoading(false)
    }
  }, [tab, fechaDesde, fechaHasta, clienteId, choferId, addToast])

  useEffect(() => { fetchData() }, [fetchData])

  // Export helpers
  const handleExportClienteExcel = () => {
    exportToExcel(
      dataCliente.map((r) => ({ Cliente: r.nombre, 'Total guías': r.total, Entregados: r.entregados, Pendientes: r.pendientes, Incidencias: r.incidencias })),
      'reporte-por-cliente', 'Por Cliente',
    )
  }
  const handleExportClientePDF = () => {
    exportToPDF('Reporte por Cliente', ['Cliente', 'Total guías', 'Entregados', 'Pendientes', 'Incidencias'],
      dataCliente.map((r) => [r.nombre, r.total, r.entregados, r.pendientes, r.incidencias]), 'reporte-por-cliente')
  }

  const buildChoferRows = () => {
    const rows: Record<string, string | number>[] = []
    dataChofer.filter((c) => !choferId || c.choferId === choferId).forEach((ch) => {
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
  const handleExportChoferExcel = () => exportToExcel(buildChoferRows(), 'reporte-por-chofer', 'Por Chofer')
  const handleExportChoferPDF = () => {
    const rows = buildChoferRows()
    exportToPDF('Reporte por Chofer',
      ['Chofer', 'Ruta', 'Fecha', 'Cliente', 'Nº Guía', 'Estado', 'Recibido por', 'H. Llegada', 'H. Salida', 'Temp.', 'Novedades'],
      rows.map((r) => [r['Chofer'], r['Ruta'], r['Fecha'], r['Cliente'], r['Nº Guía'], r['Estado'], r['Recibido por'], r['Hora llegada'], r['Hora salida'], r['Temperatura'], r['Novedades']]),
      'reporte-por-chofer')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
        <p className="text-sm text-slate-500">Filtros y reportes por cliente, fechas y chofer.</p>
      </div>

      {/* Filtros globales */}
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-wrap items-end gap-10">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm min-w-[180px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chofer</label>
            <select value={choferId} onChange={(e) => setChoferId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm min-w-[180px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Todos</option>
              {choferes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
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
                <div className="flex justify-end gap-2 border-b border-slate-100 p-3">
                  <button type="button" onClick={handleExportClienteExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    <span className="material-symbols-outlined text-sm">table_view</span>Excel
                  </button>
                  <button type="button" onClick={handleExportClientePDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>PDF
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-right">Total guías</th>
                        <th className="px-4 py-3 text-right">Entregados</th>
                        <th className="px-4 py-3 text-right">Pendientes</th>
                        <th className="px-4 py-3 text-right">Incidencias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataCliente.map((r) => (
                        <tr key={r.clienteId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                          <td className="px-4 py-3 text-right">{r.total}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">{r.entregados}</td>
                          <td className="px-4 py-3 text-right">{r.pendientes}</td>
                          <td className="px-4 py-3 text-right text-amber-600">{r.incidencias}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'fechas' && (
              <div className="p-4">
                <p className="mb-4 text-sm text-slate-500">
                  Guías en el rango: <strong className="text-slate-900">{dataFechas.length}</strong>
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
                      {dataFechas.slice(0, 50).map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-primary">{g.numeroGuia}</td>
                          <td className="px-4 py-3 text-slate-600">{g.cliente.nombre}</td>
                          <td className="px-4 py-3 text-slate-500">{g.ruta.chofer.nombre}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${
                              g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                              g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{g.estado}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{new Date(g.createdAt).toLocaleDateString('es-ES')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dataFechas.length > 50 && <p className="mt-2 text-xs text-slate-500">Mostrando 50 de {dataFechas.length}</p>}
              </div>
            )}

            {tab === 'chofer' && (
              <div>
                <div className="flex justify-end gap-2 border-b border-slate-100 p-3">
                  <button type="button" onClick={handleExportChoferExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    <span className="material-symbols-outlined text-sm">table_view</span>Excel
                  </button>
                  <button type="button" onClick={handleExportChoferPDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>PDF
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {dataChofer.filter((c) => !choferId || c.choferId === choferId).map((ch) => {
                    const expandido = choferExpandidoId === ch.choferId
                    const totalGuias = ch.rutas.reduce((a, r) => a + r.guias.length, 0)
                    const entregadas = ch.rutas.reduce((a, r) => a + r.guias.filter((g) => g.estado === 'ENTREGADO').length, 0)
                    return (
                      <div key={ch.choferId}>
                        <button type="button" onClick={() => setChoferExpandidoId(expandido ? null : ch.choferId)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-slate-400 transition-transform ${expandido ? 'rotate-90' : ''}`}>chevron_right</span>
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <span className="material-symbols-outlined text-sm">person</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{ch.nombre}</p>
                              <p className="text-xs text-slate-500">{ch.rutas.length} rutas · {entregadas}/{totalGuias} guías entregadas</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-emerald-600">
                            {totalGuias > 0 ? Math.round((entregadas / totalGuias) * 100) : 0}%
                          </span>
                        </button>

                        {expandido && (
                          <div className="border-t border-slate-100 bg-slate-50">
                            {ch.rutas.map((ruta) => (
                              <div key={ruta.rutaId} className="border-b border-slate-100 px-12 py-3 last:border-0">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                                  Ruta #{ruta.rutaId.slice(-6)} · {ruta.fecha} · <span className="normal-case font-normal text-slate-500">{ruta.estado}</span>
                                </p>
                                <div className="space-y-2">
                                  {ruta.guias.map((g) => (
                                    <div key={g.guiaId} className="rounded-lg border border-slate-200 bg-white p-3">
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-semibold text-slate-900">{g.cliente} · <span className="text-primary">{g.numeroGuia}</span></p>
                                          <p className="text-xs text-slate-500">{g.descripcion}</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                                          g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                                          'bg-slate-100 text-slate-600'
                                        }`}>{g.estado}</span>
                                      </div>
                                      {(g.receptorNombre || g.horaLlegada || g.temperatura) && (
                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                          {g.receptorNombre && <span>Receptor: {g.receptorNombre}</span>}
                                          {g.horaLlegada && <span>Llegada: {g.horaLlegada}</span>}
                                          {g.horaSalida && <span>Salida: {g.horaSalida}</span>}
                                          {g.temperatura && <span>Temperatura: {g.temperatura}</span>}
                                        </div>
                                      )}
                                      {g.novedades.length > 0 && (
                                        <div className="mt-1.5 text-xs text-amber-600">Novedades: {g.novedades.join(' · ')}</div>
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
