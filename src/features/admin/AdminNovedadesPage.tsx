import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ModalMotion } from '../../components/ui/ModalMotion'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

interface SeguimientoApi { id: string; nota: string; createdAt: string }

interface NovedadApi {
  id: string; tipo: string; descripcion: string; createdAt: string
  guia: { 
    id: string; 
    numeroGuia: string; 
    clienteId: string; 
    descripcion: string; 
    estado: string;
    receptorNombre?: string | null;
    ruta: {
      id: string;
      fecha: string;
      chofer: { nombre: string }
    };
    stop: {
      cliente: { nombre: string }
    }
  }
  seguimientos: SeguimientoApi[]
}

interface ClienteOption { id: string; nombre: string }

const tipoLabel: Record<string, string> = {
  CLIENTE_AUSENTE: 'Cliente ausente', DIRECCION_INCORRECTA: 'Dirección incorrecta',
  MERCADERIA_DANADA: 'Mercadería dañada', OTRO: 'Otro',
}

const listVariants = { show: { transition: { staggerChildren: 0.055 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } },
}

export function AdminNovedadesPage() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [novedades, setNovedades] = useState<NovedadApi[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [loading, setLoading] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroFechaRapido, setFiltroFechaRapido] = useState<'hoy' | 'ayer' | 'semana' | 'todas'>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [notaInput, setNotaInput] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [modalNovedadId, setModalNovedadId] = useState<string | null>(null)

  const modalNovedad = novedades.find((n) => n.id === modalNovedadId)

  const fetchNovedades = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<NovedadApi[]>('/novedades')
      setNovedades(res.data)
    } catch {
      addToast('Error al cargar novedades', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchNovedades()
    api.get<{ data: ClienteOption[] }>('/clientes?limit=100')
      .then((r) => setClientes(r.data.data))
      .catch(() => {})
  }, [fetchNovedades])

  const novedadesFiltradas = novedades.filter((n) => {
    // Filtro por cliente
    if (clienteId && n.guia.clienteId !== clienteId) return false
    
    // Filtro por tipo de novedad
    if (filtroTipo && n.tipo !== filtroTipo) return false
    
    // Filtro por búsqueda (coincidencias en descripción, chofer, cliente, receptor, guía)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      const matchDescripcion = n.descripcion.toLowerCase().includes(search)
      const matchChofer = n.guia.ruta.chofer.nombre.toLowerCase().includes(search)
      const matchCliente = n.guia.stop.cliente.nombre.toLowerCase().includes(search)
      const matchReceptor = n.guia.receptorNombre?.toLowerCase().includes(search)
      const matchGuia = n.guia.numeroGuia.toLowerCase().includes(search)
      const matchTipo = tipoLabel[n.tipo]?.toLowerCase().includes(search)
      
      if (!matchDescripcion && !matchChofer && !matchCliente && !matchReceptor && !matchGuia && !matchTipo) {
        return false
      }
    }
    
    // Filtro por fecha rápida
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaNovedad = new Date(n.createdAt)
    fechaNovedad.setHours(0, 0, 0, 0)
    
    if (filtroFechaRapido === 'hoy') {
      if (fechaNovedad.getTime() !== hoy.getTime()) return false
    } else if (filtroFechaRapido === 'ayer') {
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      if (fechaNovedad.getTime() !== ayer.getTime()) return false
    } else if (filtroFechaRapido === 'semana') {
      const semanaAtras = new Date(hoy)
      semanaAtras.setDate(semanaAtras.getDate() - 7)
      if (fechaNovedad < semanaAtras) return false
    }
    
    // Filtros de rango de fecha manual
    if (fechaDesde && new Date(n.createdAt) < new Date(fechaDesde)) return false
    if (fechaHasta && new Date(n.createdAt) > new Date(fechaHasta + 'T23:59:59')) return false
    
    return true
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleAddSeguimiento = async (novedadId: string) => {
    const nota = notaInput[novedadId]?.trim()
    if (!nota) return
    if (nota.length > 250) {
      addToast('El comentario no puede exceder 250 caracteres', 'error')
      return
    }
    setSubmitting(novedadId)
    try {
      await api.post(`/novedades/${novedadId}/seguimiento`, { nota })
      setNotaInput((prev) => ({ ...prev, [novedadId]: '' }))
      await fetchNovedades()
      addToast('Seguimiento agregado', 'success')
    } catch {
      addToast('Error al agregar seguimiento', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Novedades</h2>
        <p className="text-sm text-slate-500">Gestión y seguimiento de incidencias reportadas por los choferes.</p>
      </div>

      {/* Modal de detalle */}
      <ModalMotion
        show={!!modalNovedadId}
        backdropClassName="bg-slate-900/40"
        panelClassName="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-modal"
      >
        {modalNovedad && (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-slate-900">Detalle de Novedad</h3>
              <button type="button" onClick={() => setModalNovedadId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              {/* Información principal */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <span className="rounded bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-800">
                    {tipoLabel[modalNovedad.tipo] ?? modalNovedad.tipo}
                  </span>
                  <span className="text-sm text-slate-500">
                    {new Date(modalNovedad.createdAt).toLocaleString('es-ES')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Descripción:</p>
                <p className="text-sm text-slate-700 break-words">{modalNovedad.descripcion}</p>
              </div>

              {/* Detalles de la guía y ruta */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Guía</p>
                  <p className="text-sm font-medium text-primary break-words">{modalNovedad.guia.numeroGuia}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Chofer</p>
                  <p className="text-sm text-slate-900 break-words overflow-hidden">{modalNovedad.guia.ruta.chofer.nombre}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Cliente</p>
                  <p className="text-sm text-slate-900 break-words overflow-hidden">{modalNovedad.guia.stop.cliente.nombre}</p>
                </div>
                {modalNovedad.guia.receptorNombre && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Receptor</p>
                    <p className="text-sm text-slate-900 break-words overflow-hidden">{modalNovedad.guia.receptorNombre}</p>
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Fecha Ruta</p>
                  <p className="text-sm text-slate-900">{modalNovedad.guia.ruta.fecha}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Estado</p>
                  <p className="text-sm text-slate-900">{modalNovedad.guia.estado}</p>
                </div>
              </div>

              {/* Historial de seguimiento */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Historial de Seguimiento ({modalNovedad.seguimientos.length})
                </h4>
                {modalNovedad.seguimientos.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {modalNovedad.seguimientos.map((s) => (
                      <div key={s.id} className="rounded-lg bg-slate-50 p-3 border-l-4 border-primary">
                        <p className="text-sm text-slate-900 break-words">{s.nota}</p>
                        <p className="mt-1.5 text-xs text-slate-500">
                          {new Date(s.createdAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No hay seguimientos registrados</p>
                )}
              </div>

              {/* Agregar nuevo seguimiento */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Agregar Seguimiento</label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <textarea
                      value={notaInput[modalNovedad.id] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val.length <= 250) {
                          setNotaInput((prev) => ({ ...prev, [modalNovedad.id]: val }))
                        }
                      }}
                      placeholder="Escribe una nota de seguimiento..."
                      rows={3}
                      maxLength={250}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className={`absolute bottom-2 right-2 text-xs ${(notaInput[modalNovedad.id]?.length || 0) > 230 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {notaInput[modalNovedad.id]?.length || 0}/250
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSeguimiento(modalNovedad.id)}
                    disabled={!notaInput[modalNovedad.id]?.trim() || submitting === modalNovedad.id}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting === modalNovedad.id && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                    Agregar Seguimiento
                  </button>
                </div>
              </div>

              {/* Botón para ir a la ruta */}
              <button
                type="button"
                onClick={() => {
                  setModalNovedadId(null)
                  navigate(`/admin/rutas?rutaId=${modalNovedad.guia.ruta.id}`)
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-primary bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
              >
                <span className="material-symbols-outlined text-base">route</span>
                Ver Ruta Completa
              </button>
            </div>
          </>
        )}
      </ModalMotion>

      {/* Buscador */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por tipo, descripción, chofer, cliente, receptor o guía..."
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

      {/* Filtros rápidos de fecha */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500">Fecha:</span>
        {(['hoy', 'ayer', 'semana', 'todas'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFiltroFechaRapido(f)
              setFechaDesde('')
              setFechaHasta('')
            }}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filtroFechaRapido === f && !fechaDesde && !fechaHasta
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'hoy' ? 'Hoy' : f === 'ayer' ? 'Ayer' : f === 'semana' ? 'Última semana' : 'Todas'}
          </button>
        ))}
      </div>

      {/* Filtros por tipo de novedad */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500">Tipo:</span>
        <button
          type="button"
          onClick={() => setFiltroTipo('')}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            filtroTipo === ''
              ? 'bg-primary text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        {Object.entries(tipoLabel).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFiltroTipo(key)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filtroTipo === key
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs min-w-[140px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => {
              setFechaDesde(e.target.value)
              setFiltroFechaRapido('todas')
            }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => {
              setFechaHasta(e.target.value)
              setFiltroFechaRapido('todas')
            }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm text-slate-500">
            Total: <strong className="text-slate-900">{novedadesFiltradas.length}</strong>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
          </div>
        ) : (
          <motion.div
            className="divide-y divide-slate-100 p-4 space-y-3"
            variants={listVariants}
            initial="hidden"
            animate="show"
            key={[clienteId, fechaDesde, fechaHasta, novedadesFiltradas.map((x) => x.id).join(',')].join('|')}
          >
            {novedadesFiltradas.length === 0 ? (
              <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  {searchTerm || clienteId || fechaDesde || fechaHasta ? 'search_off' : 'check_circle'}
                </span>
                <p className="mt-2 text-sm text-slate-500">
                  {searchTerm || clienteId || fechaDesde || fechaHasta || filtroTipo
                    ? 'No se encontraron novedades con los filtros aplicados.'
                    : 'No hay novedades con los filtros aplicados.'}
                </p>
                {(searchTerm || clienteId || fechaDesde || fechaHasta || filtroTipo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      setClienteId('')
                      setFechaDesde('')
                      setFechaHasta('')
                      setFiltroFechaRapido('todas')
                      setFiltroTipo('')
                    }}
                    className="mt-3 text-xs font-semibold text-primary hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </motion.div>
            ) : (
              novedadesFiltradas.map((n) => {
                const nota = notaInput[n.id] ?? ''
                return (
                  <motion.button
                    key={n.id}
                    type="button"
                    layout
                    variants={itemVariants}
                    onClick={() => setModalNovedadId(n.id)}
                    className="w-full rounded-lg border border-slate-200 p-4 text-left hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          {tipoLabel[n.tipo] ?? n.tipo}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          {new Date(n.createdAt).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Guía: <span className="font-medium text-primary">{n.guia.numeroGuia}</span>
                      </span>
                    </div>
                    
                    <p className="mt-2 text-sm text-slate-900 break-words overflow-hidden">
                      {n.descripcion.length > 200 ? n.descripcion.slice(0, 197) + '...' : n.descripcion}
                    </p>

                    {/* Detalles adicionales */}
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                        <span className="material-symbols-outlined text-[14px] text-slate-400 flex-shrink-0">person</span>
                        <span className="font-medium flex-shrink-0">Chofer:</span>
                        <span className="truncate overflow-hidden">{n.guia.ruta.chofer.nombre.length > 25 ? n.guia.ruta.chofer.nombre.slice(0, 22) + '...' : n.guia.ruta.chofer.nombre}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                        <span className="material-symbols-outlined text-[14px] text-slate-400 flex-shrink-0">store</span>
                        <span className="font-medium flex-shrink-0">Cliente:</span>
                        <span className="truncate overflow-hidden">{n.guia.stop.cliente.nombre.length > 25 ? n.guia.stop.cliente.nombre.slice(0, 22) + '...' : n.guia.stop.cliente.nombre}</span>
                      </div>
                      
                      {n.guia.receptorNombre && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                          <span className="material-symbols-outlined text-[14px] text-slate-400 flex-shrink-0">badge</span>
                          <span className="font-medium flex-shrink-0">Receptor:</span>
                          <span className="truncate overflow-hidden">{n.guia.receptorNombre.length > 25 ? n.guia.receptorNombre.slice(0, 22) + '...' : n.guia.receptorNombre}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">calendar_today</span>
                        <span className="font-medium">Fecha ruta:</span>
                        <span>{n.guia.ruta.fecha}</span>
                      </div>
                    </div>

                    {/* Indicador de seguimientos */}
                    {n.seguimientos.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>{n.seguimientos.length} seguimiento{n.seguimientos.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </motion.button>
                )
              })
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
