import { Link, useParams } from 'react-router-dom'
import { useLogisticsStore } from '../../store/logisticsStore'

export function ClienteEnvioDetallePage() {
  const { guiaId } = useParams<{ guiaId: string }>()
  const { guias, fotos, novedades } = useLogisticsStore()

  const guia = guias.find((g) => g.id === guiaId)
  const fotosGuia = fotos.filter((f) => f.guiaId === guiaId)
  const novedadesGuia = novedades.filter((n) => n.guiaId === guiaId)

  if (!guia) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-8">
        <p className="text-sm text-slate-500 dark:text-slate-400">Guía no encontrada.</p>
        <Link to="/cliente/envios" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Volver a Envíos
        </Link>
      </div>
    )
  }

  const statusSteps = [
    { key: 'created', label: 'Pedido recibido', done: true, active: false },
    { key: 'transit', label: 'En tránsito', done: guia.estado !== 'PENDIENTE', active: guia.estado === 'PENDIENTE' },
    { key: 'delivery', label: 'En entrega', done: guia.estado === 'ENTREGADO', active: guia.estado === 'INCIDENCIA' },
    { key: 'delivered', label: 'Entregado', done: guia.estado === 'ENTREGADO', active: false },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Detalle de envío · {guia.numeroGuia}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{guia.descripcion}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            guia.estado === 'ENTREGADO'
              ? 'bg-emerald-100 text-emerald-800'
              : guia.estado === 'INCIDENCIA'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-blue-100 text-blue-800'
          }`}
        >
          {guia.estado}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main: Timeline + Gallery */}
        <div className="space-y-6 lg:col-span-2">
          {/* Delivery Progress Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">
              Progreso de entrega
            </h3>
            <div className="relative space-y-8 before:absolute before:left-5 before:h-full before:w-0.5 before:bg-slate-200 before:content-['']:bg-slate-800">
              {statusSteps.map((step, i) => (
                <div key={step.key} className="relative flex items-center gap-6">
                  <div
                    className={`z-10 flex size-10 items-center justify-center rounded-full ${
                      step.active
                        ? 'border-2 border-primary bg-primary/20 text-primary ring-4 ring-primary/10'
                        : step.done
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {step.key === 'created'
                        ? 'receipt_long'
                        : step.key === 'transit'
                          ? 'inventory_2'
                          : step.key === 'delivery'
                            ? 'delivery_dining'
                            : 'check_circle'}
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        step.active ? 'text-primary' : step.done ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {guia.createdAt && i === 0
                        ? new Date(guia.createdAt).toLocaleString('es-ES')
                        : step.done && guia.updatedAt && i >= 2
                          ? new Date(guia.updatedAt).toLocaleString('es-ES')
                          : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Novedades */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Novedades</h3>
            {novedadesGuia.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin novedades registradas para esta guía.</p>
            ) : (
              <ul className="space-y-3">
                {novedadesGuia.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-slate-100 p-3 text-sm"
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{n.tipo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(n.createdAt).toLocaleString('es-ES')}
                    </p>
                    <p className="mt-1 text-slate-600">{n.descripcion}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar: Photo Gallery */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Fotos de entrega
              </h3>
              {fotosGuia.length > 0 && (
                <button type="button" className="text-xs font-bold text-primary hover:underline">
                  Ver todas
                </button>
              )}
            </div>
            {fotosGuia.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hay fotos registradas para esta guía.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {fotosGuia.map((f) => (
                  <div
                    key={f.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={f.urlPreview}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="material-symbols-outlined text-white">zoom_in</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[10px] italic text-slate-400">
              Fotos subidas por el chofer en los puntos de entrega.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
