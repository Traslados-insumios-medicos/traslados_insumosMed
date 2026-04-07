import { Link, useParams } from 'react-router-dom'
import { useLogisticsStore } from '../../store/logisticsStore'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils'

export function ClienteEnvioDetallePage() {
  const { guiaId } = useParams<{ guiaId: string }>()
  const { guias, fotos, novedades } = useLogisticsStore()

  const guia = guias.find((g) => g.id === guiaId)
  const fotosGuia = fotos.filter((f) => f.guiaId === guiaId)
  const novedadesGuia = novedades.filter((n) => n.guiaId === guiaId)

  if (!guia) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-500">Guía no encontrada.</p>
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

  const handleExportExcel = () => {
    exportToExcel([{
      'Nº Guía': guia.numeroGuia,
      'Descripción': guia.descripcion,
      'Estado': guia.estado === 'ENTREGADO' ? 'Entregado' : guia.estado === 'INCIDENCIA' ? 'Incidencia' : 'En tránsito',
      'Recibido por': guia.receptorNombre ?? '—',
      'Hora llegada': guia.horaLlegada ?? '—',
      'Hora salida': guia.horaSalida ?? '—',
      'Temperatura': guia.temperatura ?? '—',
      'Observaciones': guia.observaciones ?? '—',
      'Novedades': novedadesGuia.map((n) => n.descripcion).join(' | ') || '—',
      'Fecha creación': new Date(guia.createdAt).toLocaleString('es-ES'),
    }], `reporte-guia-${guia.numeroGuia}`, 'Detalle Envío')
  }

  const handleExportPDF = () => {
    exportToPDF(
      `Reporte de Envío · ${guia.numeroGuia}`,
      ['Campo', 'Valor'],
      [
        ['Nº Guía', guia.numeroGuia],
        ['Descripción', guia.descripcion],
        ['Estado', guia.estado === 'ENTREGADO' ? 'Entregado' : guia.estado === 'INCIDENCIA' ? 'Incidencia' : 'En tránsito'],
        ['Recibido por', guia.receptorNombre ?? '—'],
        ['Hora llegada', guia.horaLlegada ?? '—'],
        ['Hora salida', guia.horaSalida ?? '—'],
        ['Temperatura', guia.temperatura ?? '—'],
        ['Observaciones', guia.observaciones ?? '—'],
        ['Novedades', novedadesGuia.map((n) => n.descripcion).join(' | ') || '—'],
        ['Fecha creación', new Date(guia.createdAt).toLocaleString('es-ES')],
      ],
      `reporte-guia-${guia.numeroGuia}`,
    )
  }

  const handleDownloadFoto = (url: string, nombre: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Detalle de envío · {guia.numeroGuia}
          </h1>
          <p className="text-sm text-slate-500">{guia.descripcion}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            guia.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-800'
            : guia.estado === 'INCIDENCIA' ? 'bg-rose-100 text-rose-800'
            : 'bg-blue-100 text-blue-800'
          }`}>
            {guia.estado === 'ENTREGADO' ? 'Entregado' : guia.estado === 'INCIDENCIA' ? 'Incidencia' : 'En tránsito'}
          </span>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <span className="material-symbols-outlined text-sm">table_view</span>
            Excel
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-bold text-slate-900">Progreso de entrega</h3>
            <div className="relative space-y-8 before:absolute before:left-5 before:h-full before:w-0.5 before:bg-slate-200">
              {statusSteps.map((step, i) => (
                <div key={step.key} className="relative flex items-center gap-6">
                  <div className={`z-10 flex size-10 items-center justify-center rounded-full ${
                    step.active ? 'border-2 border-primary bg-primary/20 text-primary ring-4 ring-primary/10'
                    : step.done ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {step.key === 'created' ? 'receipt_long'
                        : step.key === 'transit' ? 'inventory_2'
                        : step.key === 'delivery' ? 'delivery_dining'
                        : 'check_circle'}
                    </span>
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${step.active ? 'text-primary' : step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {guia.createdAt && i === 0 ? new Date(guia.createdAt).toLocaleString('es-ES')
                        : step.done && guia.updatedAt && i >= 2 ? new Date(guia.updatedAt).toLocaleString('es-ES')
                        : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Datos de entrega */}
          {guia.estado === 'ENTREGADO' && (guia.receptorNombre || guia.horaLlegada || guia.temperatura) && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <span className="material-symbols-outlined text-emerald-600">verified</span>
                Datos de entrega
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {guia.receptorNombre && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recibido por</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{guia.receptorNombre}</p>
                  </div>
                )}
                {guia.horaLlegada && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hora llegada</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{guia.horaLlegada}</p>
                  </div>
                )}
                {guia.horaSalida && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hora salida</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{guia.horaSalida}</p>
                  </div>
                )}
                {guia.temperatura && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Temperatura</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{guia.temperatura}</p>
                  </div>
                )}
                {guia.observaciones && (
                  <div className="col-span-2 sm:col-span-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Observaciones</p>
                    <p className="mt-1 text-sm text-slate-700">{guia.observaciones}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Novedades */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Novedades</h3>
            {novedadesGuia.length === 0 ? (
              <p className="text-sm text-slate-500">Sin novedades registradas para esta guía.</p>
            ) : (
              <ul className="space-y-3">
                {novedadesGuia.map((n) => (
                  <li key={n.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{n.tipo}</p>
                    <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString('es-ES')}</p>
                    <p className="mt-1 text-slate-600">{n.descripcion}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar: fotos */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Fotos de entrega</h3>
            {fotosGuia.length === 0 ? (
              <p className="text-sm text-slate-500">No hay fotos registradas para esta guía.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {fotosGuia.map((f, i) => (
                  <div key={f.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img src={f.urlPreview} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => handleDownloadFoto(f.urlPreview, `foto-${guia.numeroGuia}-${i + 1}.jpg`)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                      title="Descargar foto"
                    >
                      <span className="material-symbols-outlined text-white">download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[10px] italic text-slate-400">
              Pase el cursor sobre una foto y haga clic para descargarla.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
