import { useMemo, useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import type { GuiaEntrega } from '../../types/models'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils'

type TabId = 'cliente' | 'fechas' | 'chofer'

/** Insumos mock para prototipo: lista básica por guía */
function getInsumosMock(guia: GuiaEntrega): string[] {
  const base = guia.descripcion.toLowerCase()
  if (base.includes('metrored')) return ['Material de curación', 'Guantes quirúrgicos', 'Jeringas 5ml', 'Alcohol 70%', 'Gasas estériles']
  if (base.includes('asistanet')) return ['Medicamentos según pedido', 'Suero fisiológico', 'Vendas', 'Mascarillas']
  if (base.includes('fybeca')) return ['Inventario farmacéutico', 'Medicamentos controlados', 'Material descartable']
  return ['Insumos médicos varios', 'Material según descripción de la guía']
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'cliente', label: 'Por cliente' },
  { id: 'fechas', label: 'Por rango de fechas' },
  { id: 'chofer', label: 'Por chofer' },
]

export function AdminReportesPage() {
  const { clientes, usuarios, rutas, guias, novedades } = useLogisticsStore()

  const [tab, setTab] = useState<TabId>('cliente')
  const [clienteId, setClienteId] = useState<string>('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [choferId, setChoferId] = useState<string>('')
  const [guiaVerId, setGuiaVerId] = useState<string | null>(null)
  const [choferExpandidoId, setChoferExpandidoId] = useState<string | null>(null)

  const choferes = useMemo(
    () => usuarios.filter((u) => u.rol === 'CHOFER'),
    [usuarios],
  )

  const guiasPorCliente = useMemo(() => {
    if (!clienteId) return guias
    return guias.filter((g) => g.clienteId === clienteId)
  }, [guias, clienteId])

  const guiasEnRango = useMemo(() => {
    return guiasPorCliente.filter((g) => {
      const d = new Date(g.createdAt).getTime()
      if (fechaDesde && d < new Date(fechaDesde).getTime()) return false
      if (fechaHasta && d > new Date(fechaHasta + 'T23:59:59').getTime()) return false
      return true
    })
  }, [guiasPorCliente, fechaDesde, fechaHasta])

  const resumenPorCliente = useMemo(() => {
    return clientes.map((c) => {
      const gs = guias.filter((g) => g.clienteId === c.id)
      return {
        ...c,
        total: gs.length,
        entregados: gs.filter((g) => g.estado === 'ENTREGADO').length,
        incidencias: gs.filter((g) => g.estado === 'INCIDENCIA').length,
        pendientes: gs.filter((g) => g.estado === 'PENDIENTE').length,
      }
    })
  }, [clientes, guias])

  const resumenPorChofer = useMemo(() => {
    return choferes.map((ch) => {
      const rs = rutas.filter((r) => r.choferId === ch.id)
      const gs = guias.filter((g) => rs.some((r) => r.id === g.rutaId))
      return {
        ...ch,
        rutasCount: rs.length,
        guiasEntregadas: gs.filter((g) => g.estado === 'ENTREGADO').length,
        guiasTotal: gs.length,
      }
    })
  }, [choferes, rutas, guias])

  const guiaVer = useMemo(() => (guiaVerId ? guias.find((g) => g.id === guiaVerId) : null), [guias, guiaVerId])
  const clienteGuiaVer = useMemo(() => (guiaVer && clientes.find((c) => c.id === guiaVer.clienteId)) ?? null, [guiaVer, clientes])

  // Export helpers
  const handleExportClienteExcel = () => {
    exportToExcel(
      resumenPorCliente.map((r) => ({
        Cliente: r.nombre,
        'Total guías': r.total,
        Entregados: r.entregados,
        Pendientes: r.pendientes,
        Incidencias: r.incidencias,
      })),
      'reporte-por-cliente',
      'Por Cliente',
    )
  }

  const handleExportClientePDF = () => {
    exportToPDF(
      'Reporte por Cliente',
      ['Cliente', 'Total guías', 'Entregados', 'Pendientes', 'Incidencias'],
      resumenPorCliente.map((r) => [r.nombre, r.total, r.entregados, r.pendientes, r.incidencias]),
      'reporte-por-cliente',
    )
  }

  const buildChoferRows = () => {
    const rows: Record<string, string | number>[] = []
    resumenPorChofer
      .filter((r) => !choferId || r.id === choferId)
      .forEach((ch) => {
        const rutasCh = rutas.filter((r) => r.choferId === ch.id)
        rutasCh.forEach((ruta) => {
          const guiasRuta = guias.filter((g) => g.rutaId === ruta.id)
          guiasRuta.forEach((g) => {
            const cliente = clientes.find((c) => c.id === g.clienteId)
            const novedadesG = novedades.filter((n) => n.guiaId === g.id)
            rows.push({
              Chofer: ch.nombre,
              Ruta: ruta.id,
              Fecha: ruta.fecha,
              Cliente: cliente?.nombre ?? g.clienteId,
              'Nº Guía': g.numeroGuia,
              Estado: g.estado,
              'Recibido por': g.receptorNombre ?? '—',
              'Hora llegada': g.horaLlegada ?? '—',
              'Hora salida': g.horaSalida ?? '—',
              Temperatura: g.temperatura ?? '—',
              Observaciones: g.observaciones ?? '—',
              Novedades: novedadesG.map((n) => n.descripcion).join(' | ') || '—',
            })
          })
        })
      })
    return rows
  }

  const handleExportChoferExcel = () => {
    exportToExcel(buildChoferRows(), 'reporte-por-chofer', 'Por Chofer')
  }

  const handleExportChoferPDF = () => {
    const rows = buildChoferRows()
    exportToPDF(
      'Reporte por Chofer',
      ['Chofer', 'Ruta', 'Fecha', 'Cliente', 'Nº Guía', 'Estado', 'Recibido por', 'H. Llegada', 'H. Salida', 'Temp.', 'Novedades'],
      rows.map((r) => [r['Chofer'], r['Ruta'], r['Fecha'], r['Cliente'], r['Nº Guía'], r['Estado'], r['Recibido por'], r['Hora llegada'], r['Hora salida'], r['Temperatura'], r['Novedades']]),
      'reporte-por-chofer',
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reportes</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Filtros y reportes por cliente, fechas, chofer y novedades.
        </p>
      </div>

      {/* Filtros globales */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Chofer</label>
          <select
            value={choferId}
            onChange={(e) => setChoferId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="">Todos</option>
            {choferes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por tab */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {tab === 'cliente' && (
          <div>
            <div className="flex justify-end gap-2 border-b border-slate-100 p-3 dark:border-slate-700">
              <button type="button" onClick={handleExportClienteExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                <span className="material-symbols-outlined text-sm">table_view</span>Excel
              </button>
              <button type="button" onClick={handleExportClientePDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>PDF
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 text-right">Total guías</th>
                    <th className="px-4 py-3 text-right">Entregados</th>
                    <th className="px-4 py-3 text-right">Pendientes</th>
                    <th className="px-4 py-3 text-right">Incidencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumenPorCliente.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.nombre}</td>
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
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Guías en el rango seleccionado: <strong className="text-slate-900 dark:text-white">{guiasEnRango.length}</strong>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Guía</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {guiasEnRango.slice(0, 50).map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium text-primary dark:text-primary">{g.numeroGuia}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{g.descripcion}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {g.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(g.createdAt).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setGuiaVerId(g.id)}
                          className="text-xs font-medium text-primary hover:underline dark:text-primary dark:hover:underline"
                        >
                          Ver guía
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {guiasEnRango.length > 50 && (
              <p className="mt-2 text-xs text-slate-500">Mostrando 50 de {guiasEnRango.length}</p>
            )}
          </div>
        )}

        {tab === 'chofer' && (
          <div>
            <div className="flex justify-end gap-2 border-b border-slate-100 p-3 dark:border-slate-700">
              <button type="button" onClick={handleExportChoferExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                <span className="material-symbols-outlined text-sm">table_view</span>Excel
              </button>
              <button type="button" onClick={handleExportChoferPDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>PDF
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {resumenPorChofer
                .filter((r) => !choferId || r.id === choferId)
                .map((ch) => {
                  const expandido = choferExpandidoId === ch.id
                  const rutasCh = rutas.filter((r) => r.choferId === ch.id)
                  return (
                    <div key={ch.id}>
                      {/* Fila chofer */}
                      <button
                        type="button"
                        onClick={() => setChoferExpandidoId(expandido ? null : ch.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined text-slate-400 transition-transform ${expandido ? 'rotate-90' : ''}`}>chevron_right</span>
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-sm">person</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{ch.nombre}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{ch.rutasCount} rutas · {ch.guiasEntregadas}/{ch.guiasTotal} guías entregadas</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">{ch.guiasTotal > 0 ? Math.round((ch.guiasEntregadas / ch.guiasTotal) * 100) : 0}%</span>
                      </button>

                      {/* Submenú expandible: rutas → clientes */}
                      {expandido && (
                        <div className="border-t border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                          {rutasCh.length === 0 ? (
                            <p className="px-12 py-3 text-xs text-slate-400">Sin rutas registradas.</p>
                          ) : (
                            rutasCh.map((ruta) => {
                              const guiasRuta = guias.filter((g) => g.rutaId === ruta.id)
                              return (
                                <div key={ruta.id} className="border-b border-slate-100 px-12 py-3 dark:border-slate-700 last:border-0">
                                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                                    Ruta #{ruta.id.replace('ruta-', '')} · {ruta.fecha} · <span className="text-slate-500 dark:text-slate-400 normal-case font-normal">{ruta.estado}</span>
                                  </p>
                                  <div className="space-y-2">
                                    {guiasRuta.map((g) => {
                                      const cliente = clientes.find((c) => c.id === g.clienteId)
                                      const novsG = novedades.filter((n) => n.guiaId === g.id)
                                      return (
                                        <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                              <p className="text-xs font-semibold text-slate-900 dark:text-white">{cliente?.nombre ?? g.clienteId} · <span className="text-primary">{g.numeroGuia}</span></p>
                                              <p className="text-xs text-slate-500 dark:text-slate-400">{g.descripcion}</p>
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                              g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                                              g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                                              'bg-slate-100 text-slate-600'
                                            }`}>{g.estado}</span>
                                          </div>
                                          {(g.receptorNombre || g.horaLlegada || g.temperatura) && (
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                                              {g.receptorNombre && <span>👤 {g.receptorNombre}</span>}
                                              {g.horaLlegada && <span>🕐 Llegada: {g.horaLlegada}</span>}
                                              {g.horaSalida && <span>🕐 Salida: {g.horaSalida}</span>}
                                              {g.temperatura && <span>🌡 {g.temperatura}</span>}
                                            </div>
                                          )}
                                          {novsG.length > 0 && (
                                            <div className="mt-1.5 text-xs text-amber-600">
                                              ⚠ {novsG.map((n) => n.descripcion).join(' · ')}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Guía de entrega (contenido básico para prototipo) */}
      {guiaVer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-guia-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
              <h3 id="modal-guia-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Guía de entrega — {guiaVer.numeroGuia}
              </h3>
              <button
                type="button"
                onClick={() => setGuiaVerId(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descripción</p>
                <p className="mt-1 text-sm text-slate-900 dark:text-white">{guiaVer.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Cliente</p>
                  <p className="mt-0.5 text-slate-900 dark:text-white">{clienteGuiaVer?.nombre ?? guiaVer.clienteId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Estado</p>
                  <p className="mt-0.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      guiaVer.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      guiaVer.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {guiaVer.estado}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Fecha creación</p>
                  <p className="mt-0.5 text-slate-900 dark:text-white">{new Date(guiaVer.createdAt).toLocaleString('es-ES')}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Insumos médicos a entregar (prototipo)</p>
                <ul className="mt-2 list-inside list-disc space-y-1 rounded-lg border border-slate-200 bg-slate-50 py-3 pl-4 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
                  {getInsumosMock(guiaVer).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
