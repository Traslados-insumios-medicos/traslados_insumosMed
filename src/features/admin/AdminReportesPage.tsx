import { useMemo, useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'

type TabId = 'cliente' | 'fechas' | 'chofer' | 'novedades'

const tabs: { id: TabId; label: string }[] = [
  { id: 'cliente', label: 'Por cliente' },
  { id: 'fechas', label: 'Por rango de fechas' },
  { id: 'chofer', label: 'Por chofer' },
  { id: 'novedades', label: 'Novedades' },
]

export function AdminReportesPage() {
  const { clientes, usuarios, rutas, guias, novedades } = useLogisticsStore()

  const [tab, setTab] = useState<TabId>('cliente')
  const [clienteId, setClienteId] = useState<string>('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [choferId, setChoferId] = useState<string>('')

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

  const novedadesFiltradas = useMemo(() => {
    let list = [...novedades]
    if (clienteId) {
      const guiaIdsCliente = new Set(guias.filter((g) => g.clienteId === clienteId).map((g) => g.id))
      list = list.filter((n) => guiaIdsCliente.has(n.guiaId))
    }
    if (fechaDesde)
      list = list.filter((n) => new Date(n.createdAt).getTime() >= new Date(fechaDesde).getTime())
    if (fechaHasta)
      list = list.filter(
        (n) => new Date(n.createdAt).getTime() <= new Date(fechaHasta + 'T23:59:59').getTime(),
      )
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [novedades, clienteId, fechaDesde, fechaHasta, guias])

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
        <p className="text-sm text-slate-500">
          Filtros y reportes por cliente, fechas, chofer y novedades.
        </p>
      </div>

      {/* Filtros globales */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
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
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Chofer</label>
          <select
            value={choferId}
            onChange={(e) => setChoferId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {choferes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por tab */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === 'cliente' && (
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
                {resumenPorCliente.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
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
        )}

        {tab === 'fechas' && (
          <div className="p-4">
            <p className="mb-4 text-sm text-slate-500">
              Guías en el rango seleccionado: <strong className="text-slate-900">{guiasEnRango.length}</strong>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Guía</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guiasEnRango.slice(0, 50).map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-primary">{g.numeroGuia}</td>
                      <td className="px-4 py-3 text-slate-600">{g.descripcion}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                          g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {g.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(g.createdAt).toLocaleDateString('es-ES')}</td>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Chofer</th>
                  <th className="px-4 py-3 text-right">Rutas</th>
                  <th className="px-4 py-3 text-right">Guías total</th>
                  <th className="px-4 py-3 text-right">Entregadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumenPorChofer
                  .filter((r) => !choferId || r.id === choferId)
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                      <td className="px-4 py-3 text-right">{r.rutasCount}</td>
                      <td className="px-4 py-3 text-right">{r.guiasTotal}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{r.guiasEntregadas}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'novedades' && (
          <div className="p-4">
            <p className="mb-4 text-sm text-slate-500">
              Total novedades (filtradas): <strong className="text-slate-900">{novedadesFiltradas.length}</strong>
            </p>
            <div className="space-y-3">
              {novedadesFiltradas.length === 0 ? (
                <p className="text-sm text-slate-500">No hay novedades con los filtros aplicados.</p>
              ) : (
                novedadesFiltradas.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">{n.tipo}</span>
                      <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString('es-ES')}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-900">{n.descripcion}</p>
                    <p className="mt-1 text-xs text-slate-500">Guía: {n.guiaId}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
