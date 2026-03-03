import { useMemo, useState } from 'react'
import { useLogisticsStore } from '../../store/logisticsStore'
import type { GuiaEntrega } from '../../types/models'

/** Insumos mock para modal de guía (prototipo) */
function getInsumosMock(guia: GuiaEntrega): string[] {
  const base = guia.descripcion.toLowerCase()
  if (base.includes('metrored')) return ['Material de curación', 'Guantes quirúrgicos', 'Jeringas 5ml', 'Alcohol 70%', 'Gasas estériles']
  if (base.includes('asistanet')) return ['Medicamentos según pedido', 'Suero fisiológico', 'Vendas', 'Mascarillas']
  if (base.includes('fybeca')) return ['Inventario farmacéutico', 'Medicamentos controlados', 'Material descartable']
  return ['Insumos médicos varios', 'Material según descripción de la guía']
}

export function AdminNovedadesPage() {
  const { novedades, guias, clientes, seguimientosNovedades, addSeguimientoToNovedad } = useLogisticsStore()
  const [clienteId, setClienteId] = useState<string>('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [guiaVerId, setGuiaVerId] = useState<string | null>(null)
  const [notaSeguimiento, setNotaSeguimiento] = useState<Record<string, string>>({})

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

  const seguimientosPorNovedad = useMemo(() => {
    const map: Record<string, { id: string; nota: string; createdAt: string }[]> = {}
    ;(seguimientosNovedades ?? []).forEach((s) => {
      if (!map[s.novedadId]) map[s.novedadId] = []
      map[s.novedadId].push({ id: s.id, nota: s.nota, createdAt: s.createdAt })
    })
    Object.keys(map).forEach((k) => map[k].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    return map
  }, [seguimientosNovedades])

  const guiaVer = useMemo(() => (guiaVerId ? guias.find((g) => g.id === guiaVerId) : null), [guias, guiaVerId])
  const clienteGuiaVer = useMemo(() => (guiaVer && clientes.find((c) => c.id === guiaVer.clienteId)) ?? null, [guiaVer, clientes])

  const handleAddSeguimiento = (novedadId: string) => {
    const nota = notaSeguimiento[novedadId]?.trim()
    if (!nota) return
    addSeguimientoToNovedad(novedadId, nota)
    setNotaSeguimiento((prev) => ({ ...prev, [novedadId]: '' }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novedades</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gestión y seguimiento de incidencias reportadas por los choferes.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Cliente</label>
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
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      {/* Listado */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total novedades (filtradas): <strong className="text-slate-900 dark:text-white">{novedadesFiltradas.length}</strong>
          </p>
        </div>
        <div className="divide-y divide-slate-100 p-4 dark:divide-slate-700">
          {novedadesFiltradas.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay novedades con los filtros aplicados.</p>
          ) : (
            novedadesFiltradas.map((n) => {
              const segs = seguimientosPorNovedad[n.id] ?? []
              const nota = notaSeguimiento[n.id] ?? ''
              return (
                <div
                  key={n.id}
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-600"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {n.tipo}
                      </span>
                      <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(n.createdAt).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Guía: {guias.find((g) => g.id === n.guiaId)?.numeroGuia ?? n.guiaId}</span>
                      <button
                        type="button"
                        onClick={() => setGuiaVerId(n.guiaId)}
                        className="text-xs font-medium text-primary hover:underline dark:text-primary"
                      >
                        Ver guía
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-900 dark:text-white">{n.descripcion}</p>

                  {/* Seguimiento */}
                  <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-600">
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Seguimiento ({segs.length})
                    </h5>
                    {segs.length > 0 && (
                      <ul className="mb-3 space-y-2">
                        {segs.map((s) => (
                          <li
                            key={s.id}
                            className="rounded-lg bg-slate-50 py-2 pl-3 pr-2 text-sm text-slate-700 dark:bg-slate-700/50 dark:text-slate-200"
                          >
                            <p>{s.nota}</p>
                            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                              {new Date(s.createdAt).toLocaleString('es-ES')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nota}
                        onChange={(e) => setNotaSeguimiento((prev) => ({ ...prev, [n.id]: e.target.value }))}
                        placeholder="Añadir nota de seguimiento..."
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSeguimiento(n.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSeguimiento(n.id)}
                        disabled={!nota.trim()}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal: Guía de entrega */}
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
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Insumos (prototipo)</p>
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
