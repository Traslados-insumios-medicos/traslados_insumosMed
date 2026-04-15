import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { SeguimientoChoferStepper } from '../../components/cliente/SeguimientoChoferStepper'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils'

const tipoNovedadLabel: Record<string, string> = {
  DIRECCION_INCORRECTA: 'Dirección incorrecta',
  CLIENTE_AUSENTE: 'Cliente ausente',
  MERCADERIA_DANADA: 'Mercadería dañada',
  OTRO: 'Otro',
}

interface FotoApi {
  id: string
  urlPreview: string
  tipo: string
}

interface NovedadApi {
  id: string
  tipo: string
  descripcion: string
  createdAt: string
}

interface RutaEnGuia {
  id: string
  estado: string
  seguimientoChofer: string
  updatedAt?: string
}

interface GuiaDetalleApi {
  id: string
  numeroGuia: string
  descripcion: string
  estado: string
  createdAt: string
  updatedAt: string
  receptorNombre?: string | null
  horaLlegada?: string | null
  horaSalida?: string | null
  temperatura?: string | null
  observaciones?: string | null
  fotos: FotoApi[]
  novedades: NovedadApi[]
  ruta: RutaEnGuia
}

export function ClienteEnvioDetallePage() {
  const { guiaId } = useParams<{ guiaId: string }>()
  const addToast = useToastStore((s) => s.addToast)
  const [guia, setGuia] = useState<GuiaDetalleApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [seguimientoActualizadoAt, setSeguimientoActualizadoAt] = useState<string | null>(null)

  useEffect(() => {
    if (!guiaId) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await api.get<GuiaDetalleApi>(`/guias/${guiaId}`)
        if (!cancel) {
          setGuia(res.data)
          setSeguimientoActualizadoAt(new Date().toISOString())
        }
      } catch {
        if (!cancel) {
          setGuia(null)
          addToast('No se pudo cargar el envío', 'error')
        }
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [guiaId, addToast])

  useEffect(() => {
    if (!guia?.ruta?.id) return
    const token = localStorage.getItem('token')
    if (!token) return
    const rutaId = guia.ruta.id
    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    })
    socket.emit('join:ruta', rutaId)
    socket.on('seguimiento_ruta', (p: { rutaId: string; seguimientoChofer: string }) => {
      if (p.rutaId !== rutaId) return
      setGuia((prev) =>
        prev?.ruta
          ? { ...prev, ruta: { ...prev.ruta, seguimientoChofer: p.seguimientoChofer } }
          : prev,
      )
      setSeguimientoActualizadoAt(new Date().toISOString())
    })
    return () => {
      socket.disconnect()
    }
  }, [guia?.ruta?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
      </div>
    )
  }

  if (!guia) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-500">Guía no encontrada o sin permiso.</p>
        <Link to="/cliente/envios" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Volver a Envíos
        </Link>
      </div>
    )
  }

  const fotosGuia = guia.fotos.filter((f) => f.tipo === 'GUIA')
  const novedadesGuia = guia.novedades

  const statusSteps = [
    { key: 'created', label: 'Pedido recibido', done: true, active: false },
    { key: 'transit', label: 'En camino', done: guia.estado !== 'PENDIENTE', active: guia.estado === 'PENDIENTE' },
    {
      key: 'delivery',
      label: 'En entrega',
      done: guia.estado === 'ENTREGADO',
      active: guia.estado === 'INCIDENCIA',
    },
    { key: 'delivered', label: 'Entregado', done: guia.estado === 'ENTREGADO', active: false },
  ]

  const estadoRutaTexto =
    guia.ruta.estado === 'EN_CURSO'
      ? 'Ruta en curso'
      : guia.ruta.estado === 'COMPLETADA'
        ? 'Ruta finalizada'
        : guia.ruta.estado === 'CANCELADA'
          ? 'Ruta cancelada'
          : 'Ruta planificada'

  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          'Nº Guía': guia.numeroGuia,
          Descripción: guia.descripcion,
          Estado:
            guia.estado === 'ENTREGADO'
              ? 'Entregado'
              : guia.estado === 'INCIDENCIA'
                ? 'Incidencia'
                : 'En camino',
          'Recibido por': guia.receptorNombre ?? '—',
          'Hora llegada': guia.horaLlegada ?? '—',
          'Hora salida': guia.horaSalida ?? '—',
          Temperatura: guia.temperatura ?? '—',
          Observaciones: guia.observaciones ?? '—',
          Novedades: novedadesGuia.map((n) => n.descripcion).join(' | ') || '—',
          'Fecha creación': new Date(guia.createdAt).toLocaleString('es-ES'),
        },
      ],
      `reporte-guia-${guia.numeroGuia}`,
      'Detalle Envío',
    )
  }

  const handleExportPDF = () => {
    exportToPDF(
      `Reporte de Envío · ${guia.numeroGuia}`,
      ['Campo', 'Valor'],
      [
        ['Nº Guía', guia.numeroGuia],
        ['Descripción', guia.descripcion],
        [
          'Estado',
          guia.estado === 'ENTREGADO'
            ? 'Entregado'
            : guia.estado === 'INCIDENCIA'
              ? 'Incidencia'
              : 'En camino',
        ],
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
          <h1 className="text-2xl font-bold text-slate-900">Detalle de envío · {guia.numeroGuia}</h1>
          <p className="text-sm text-slate-500">{guia.descripcion}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{estadoRutaTexto}</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              guia.estado === 'ENTREGADO'
                ? 'bg-emerald-100 text-emerald-800'
                : guia.estado === 'INCIDENCIA'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-blue-100 text-blue-800'
            }`}
          >
            {guia.estado === 'ENTREGADO'
              ? 'Entregado'
              : guia.estado === 'INCIDENCIA'
                ? 'Incidencia'
                : 'En camino'}
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
        <div className="space-y-6 lg:col-span-2">
          {guia.ruta && (
            <div className="space-y-2">
              <SeguimientoChoferStepper
                rutaEstado={guia.ruta.estado}
                seguimiento={guia.ruta.seguimientoChofer ?? 'NINGUNO'}
                guiaEstado={guia.estado}
              />
              <p className="text-right text-[11px] text-slate-400">
                Última actualización:{' '}
                {seguimientoActualizadoAt ? new Date(seguimientoActualizadoAt).toLocaleString('es-ES') : '—'}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-bold text-slate-900">Progreso de entrega</h3>
            <p className="mb-4 text-xs text-slate-500">
              Esta línea de tiempo se actualiza automáticamente con los cambios reportados por el chofer.
            </p>
            <div className="relative space-y-8 before:absolute before:left-5 before:h-full before:w-0.5 before:bg-slate-200">
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
                      className={`text-sm font-bold ${step.active ? 'text-primary' : step.done ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-xs text-slate-500">
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
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {guia.receptorNombre.length > 50 ? guia.receptorNombre.slice(0, 50) + '...' : guia.receptorNombre}
                    </p>
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

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Novedades</h3>
            {novedadesGuia.length === 0 ? (
              <p className="text-sm text-slate-500">Sin novedades registradas para esta guía.</p>
            ) : (
              <ul className="space-y-3">
                {novedadesGuia.map((n) => (
                  <li key={n.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{tipoNovedadLabel[n.tipo] ?? n.tipo}</p>
                    <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString('es-ES')}</p>
                    <p className="mt-1 text-slate-600">{n.descripcion}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Fotos de entrega</h3>
            {fotosGuia.length === 0 ? (
              <p className="text-sm text-slate-500">No hay fotos registradas para esta guía.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {fotosGuia.map((f, i) => (
                  <div
                    key={f.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={f.urlPreview}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
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
