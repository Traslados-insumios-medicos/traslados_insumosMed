import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils'

type TabId = 'cliente' | 'fechas' | 'chofer' | 'guia'

interface ResumenCliente {
  clienteId: string; nombre: string; total: number
  entregados: number; pendientes: number; incidencias: number
  tipo: 'PRINCIPAL' | 'SECUNDARIO'
  clientePrincipal?: { nombre: string } | null
  guias: {
    id: string
    numeroGuia: string
    descripcion: string
    estado: string
    receptorNombre?: string | null
    horaLlegada?: string | null
    horaSalida?: string | null
    temperatura?: string | null
    observaciones?: string | null
    createdAt: string
    ruta: { id: string; fecha: string; createdAt: string; estado: string; chofer: { id: string; nombre: string } }
    stop?: { id: string; direccion: string; lat: number | null; lng: number | null } | null
    novedades: { tipo: string; descripcion: string; createdAt: string }[]
    fotos: { id: string; urlPreview: string; tipo: string; createdAt: string }[]
  }[]
}

interface GuiaFecha {
  id: string; numeroGuia: string; descripcion: string; estado: string
  createdAt: string
  receptorNombre?: string | null
  horaLlegada?: string | null
  horaSalida?: string | null
  temperatura?: string | null
  observaciones?: string | null
  cliente: { id: string; nombre: string }
  ruta: { id: string; fecha: string; estado: string; chofer: { id: string; nombre: string } }
  stop?: { id: string; direccion: string; lat: number | null; lng: number | null } | null
  novedades: { tipo: string; descripcion: string; createdAt: string }[]
  fotos: { id: string; urlPreview: string; tipo: string; createdAt: string }[]
}

interface GuiaChofer {
  guiaId: string; stopId: string; numeroGuia: string; descripcion: string; estado: string
  cliente: string; receptorNombre?: string; horaLlegada?: string
  horaSalida?: string; temperatura?: string; observaciones?: string
  createdAt: string
  novedades: { tipo: string; descripcion: string; createdAt: string }[]
  fotos: { id: string; urlPreview: string; tipo: string; createdAt: string }[]
}

interface RutaChofer {
  rutaId: string
  fecha: string
  estado: string
  guias: GuiaChofer[]
  stops?: { id: string; direccion: string; lat: number | null; lng: number | null }[]
}
interface ResumenChofer { choferId: string; nombre: string; cedula?: string; rutas: RutaChofer[] }

interface ChoferOption { id: string; nombre: string }
interface ClienteOption { id: string; nombre: string }

const tabs: { id: TabId; label: string }[] = [
  { id: 'cliente', label: 'Por cliente' },
  { id: 'fechas', label: 'Por rango de fechas' },
  { id: 'chofer', label: 'Por chofer' },
  { id: 'guia', label: 'Por guía' },
]

const LIMIT = 10

const trunc = (str: string | undefined | null, max = 50) => {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 3) + '...' : str
}

const formatNovedades = (novedades: { tipo: string; descripcion: string }[]) =>
  novedades.length ? novedades.map((n) => `${n.tipo}: ${n.descripcion}`).join(' | ') : '—'

const formatFotos = (fotos: { urlPreview: string }[]) =>
  fotos.length ? fotos.map((f) => f.urlPreview).join(' | ') : '—'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const buildStaticMapUrl = (lat?: number | null, lng?: number | null, direccion?: string | null) => {
  if (!MAPBOX_TOKEN) return ''
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+0f172a(${lng},${lat})/${lng},${lat},14/520x280@2x?access_token=${MAPBOX_TOKEN}`
  }
  if (direccion && direccion.trim()) {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+0f172a(${encodeURIComponent(direccion)})/auto/520x280@2x?access_token=${MAPBOX_TOKEN}`
  }
  return ''
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
  const [dataGuia, setDataGuia] = useState<GuiaFecha[]>([]) // Reutilizamos el mismo tipo que fechas

  const [loading, setLoading] = useState(false)
  const [choferExpandidoId, setChoferExpandidoId] = useState<string | null>(null)
  
  // Paginación
  const [pageCliente, setPageCliente] = useState(1)
  const [pageFechas, setPageFechas] = useState(1)
  const [pageChofer, setPageChofer] = useState(1)
  const [pageGuia, setPageGuia] = useState(1)

  const totalPagesCliente = Math.max(1, Math.ceil(dataCliente.length / LIMIT))
  const totalPagesFechas = Math.max(1, Math.ceil(dataFechas.length / LIMIT))
  const totalPagesChofer = Math.max(1, Math.ceil(dataChofer.length / LIMIT))
  const totalPagesGuia = Math.max(1, Math.ceil(dataGuia.length / LIMIT))

  const dataClientePaginada = dataCliente.slice((pageCliente - 1) * LIMIT, pageCliente * LIMIT)
  const dataFechasPaginada = dataFechas.slice((pageFechas - 1) * LIMIT, pageFechas * LIMIT)
  const dataChoferPaginada = dataChofer.slice((pageChofer - 1) * LIMIT, pageChofer * LIMIT)
  const dataGuiaPaginada = dataGuia.slice((pageGuia - 1) * LIMIT, pageGuia * LIMIT)

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
        if (choferId) params.set('choferId', choferId)
        const res = await api.get<ResumenCliente[]>(`/reportes/clientes?${params}`)
        setDataCliente(res.data)
      } else if (tab === 'fechas') {
        const params = new URLSearchParams()
        if (fechaDesde) params.set('desde', fechaDesde)
        if (fechaHasta) params.set('hasta', fechaHasta)
        if (clienteId) params.set('clienteId', clienteId)
        if (choferId) params.set('choferId', choferId)
        const res = await api.get<GuiaFecha[]>(`/reportes/fechas?${params}`)
        setDataFechas(res.data)
      } else if (tab === 'chofer') {
        const params = new URLSearchParams()
        if (choferId) params.set('choferId', choferId)
        if (fechaDesde) params.set('desde', fechaDesde)
        if (fechaHasta) params.set('hasta', fechaHasta)
        const res = await api.get<ResumenChofer[]>(`/reportes/choferes?${params}`)
        setDataChofer(res.data)
      } else if (tab === 'guia') {
        const params = new URLSearchParams()
        if (fechaDesde) params.set('desde', fechaDesde)
        if (fechaHasta) params.set('hasta', fechaHasta)
        if (clienteId) params.set('clienteId', clienteId)
        if (choferId) params.set('choferId', choferId)
        if (tipoCliente) params.set('tipo', tipoCliente)
        const res = await api.get<GuiaFecha[]>(`/reportes/guias?${params}`)
        setDataGuia(res.data)
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
    setPageGuia(1)
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
    const detalleRows = dataCliente.flatMap((cliente) =>
      cliente.guias.map((g) => [
        cliente.nombre,
        g.numeroGuia,
        g.estado,
        new Date(g.createdAt).toLocaleString('es-ES'),
        g.ruta.id,
        g.ruta.chofer.nombre,
        g.receptorNombre ?? '—',
        g.horaLlegada ?? '—',
        g.horaSalida ?? '—',
        g.temperatura ?? '—',
        g.observaciones ?? '—',
        formatNovedades(g.novedades),
        formatFotos(g.fotos.filter((f) => f.tipo === 'GUIA')),
        buildStaticMapUrl(g.stop?.lat, g.stop?.lng, g.stop?.direccion),
      ]),
    )
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
      buildFilterInfo(),
      [
        {
          sheetName: 'Detalle Guias',
          headers: [
            'Cliente',
            'Numero de guia',
            'Estado',
            'Fecha registro',
            'Ruta',
            'Chofer',
            'Recibido por',
            'Hora llegada',
            'Hora salida',
            'Temperatura',
            'Observaciones',
            'Incidencias',
            'Fotos (URLs)',
            'Mapa',
          ],
          rows: detalleRows,
        },
      ],
    )
  }
  const handleExportClientePDF = async () => {
    const totalGuias = dataCliente.reduce((acc, r) => acc + r.total, 0)
    const totalEntregados = dataCliente.reduce((acc, r) => acc + r.entregados, 0)
    const totalIncidencias = dataCliente.reduce((acc, r) => acc + r.incidencias, 0)
    const detalleGuiasCards = dataCliente
      .flatMap((cliente) =>
        cliente.guias.map((g) => ({
          routeId: g.ruta.id,
          card: {
            groupTitle: `Ruta #${g.ruta.id.slice(-6).toUpperCase()} · Chofer: ${g.ruta.chofer.nombre} · Fecha ruta: ${new Date(g.ruta.fecha).toLocaleDateString('es-ES')} · Creada: ${new Date(g.ruta.createdAt).toLocaleString('es-ES')}`,
            title: `${cliente.nombre} · Guia ${g.numeroGuia}`,
            subtitle: `Estado de la guia: ${g.estado}`,
            fields: [
              { label: 'Recibido por', value: g.receptorNombre ?? '—' },
              { label: 'Registrada', value: new Date(g.createdAt).toLocaleString('es-ES') },
              { label: 'Hora llegada', value: g.horaLlegada ?? '—' },
              { label: 'Hora salida', value: g.horaSalida ?? '—' },
              { label: 'Temperatura', value: g.temperatura ?? '—' },
              { label: 'Observaciones', value: g.observaciones ?? '—' },
              { label: 'Incidencias', value: formatNovedades(g.novedades) },
            ],
            imageUrls: [
              buildStaticMapUrl(g.stop?.lat, g.stop?.lng, g.stop?.direccion),
              ...g.fotos.filter((f) => f.tipo === 'GUIA').map((f) => f.urlPreview),
            ].filter(Boolean),
          },
        })),
      )
      .sort((a, b) => a.routeId.localeCompare(b.routeId))
      .map((item) => item.card)
    await exportToPDF(
      'Reporte por Cliente', 
      ['Nombre del cliente', 'Tipo de cliente', 'Total de guías', 'Guías entregadas', 'Guías pendientes', 'Guías con incidencia'],
      dataCliente.map((r) => [
        r.nombre, 
        r.tipo === 'PRINCIPAL' ? 'Principal' : `Secundario (${r.clientePrincipal?.nombre || 'Sin asignar'})`,
        r.total, 
        r.entregados, 
        r.pendientes, 
        r.incidencias
      ]), 
      'reporte-por-cliente',
      buildFilterInfo(),
      [
        { label: 'Clientes', value: dataCliente.length },
        { label: 'Guias', value: totalGuias },
        { label: 'Entregados', value: totalEntregados },
        { label: 'Incidencias', value: totalIncidencias },
      ],
      undefined,
      detalleGuiasCards,
      { showMainTable: false },
    )
  }

  const buildChoferRows = () => {
    const rows: Record<string, string | number>[] = []
    dataChofer.forEach((ch) => {
      ;(ch.rutas ?? []).forEach((r) => {
        const routeStops = Array.isArray(r.stops) ? r.stops : []
        ;(r.guias ?? []).forEach((g) => {
          const stop = routeStops.find((s) => s.id === g.stopId)
          rows.push({
            Chofer: ch.nombre, Ruta: r.rutaId, Fecha: r.fecha, Cliente: g.cliente,
            'Nº Guía': g.numeroGuia, Estado: g.estado, 'Recibido por': g.receptorNombre ?? '—',
            'Hora llegada': g.horaLlegada ?? '—', 'Hora salida': g.horaSalida ?? '—',
            Temperatura: g.temperatura ?? '—',
            Observaciones: g.observaciones ?? '—',
            Incidencias: formatNovedades(g.novedades ?? []),
            'Fotos (URLs)': formatFotos(g.fotos ?? []),
            Mapa: buildStaticMapUrl(stop?.lat ?? null, stop?.lng ?? null, stop?.direccion ?? ''),
          })
        })
      })
    })
    return rows
  }
  const handleExportChoferExcel = () => exportToExcel(buildChoferRows(), 'reporte-por-chofer', 'Por Chofer', buildFilterInfo())
  const handleExportChoferPDF = async () => {
    const rows = buildChoferRows()
    const totalRutas = dataChofer.reduce((acc, ch) => acc + ch.rutas.length, 0)
    const totalGuias = dataChofer.reduce((acc, ch) => acc + ch.rutas.reduce((n, r) => n + r.guias.length, 0), 0)
    const totalIncidencias = dataChofer.reduce(
      (acc, ch) => acc + ch.rutas.reduce((n, r) => n + r.guias.filter((g) => g.estado === 'INCIDENCIA').length, 0),
      0,
    )
    const detalleChoferCards = dataChofer
      .flatMap((ch) =>
        (ch.rutas ?? []).flatMap((r) => {
          const routeStops = Array.isArray(r.stops) ? r.stops : []
          return (r.guias ?? []).map((g) => {
            const stop = routeStops.find((s) => s.id === g.stopId)
            return {
              routeId: r.rutaId,
              card: {
                groupTitle: `Ruta #${r.rutaId.slice(-6).toUpperCase()} · Chofer: ${ch.nombre} · Fecha ruta: ${new Date(r.fecha).toLocaleDateString('es-ES')}`,
                title: `${g.cliente} · Guia ${g.numeroGuia}`,
                subtitle: `Estado de la guia: ${g.estado}`,
                fields: [
                  { label: 'Recibido por', value: g.receptorNombre ?? '—' },
                  { label: 'Registrada', value: new Date(g.createdAt).toLocaleString('es-ES') },
                  { label: 'Hora llegada', value: g.horaLlegada ?? '—' },
                  { label: 'Hora salida', value: g.horaSalida ?? '—' },
                  { label: 'Temperatura', value: g.temperatura ?? '—' },
                  { label: 'Observaciones', value: g.observaciones ?? '—' },
                  { label: 'Incidencias', value: formatNovedades(g.novedades ?? []) },
                ],
                imageUrls: [
                  buildStaticMapUrl(stop?.lat ?? null, stop?.lng ?? null, stop?.direccion ?? ''),
                  ...(g.fotos ?? []).filter((f) => f.tipo === 'GUIA').map((f) => f.urlPreview),
                ].filter(Boolean),
              },
            }
          })
        }),
      )
      .sort((a, b) => a.routeId.localeCompare(b.routeId))
      .map((item) => item.card)
    await exportToPDF('Reporte por Chofer',
      ['Nombre del chofer', 'Ruta', 'Fecha de ruta', 'Cliente de la guia', 'Numero de guia', 'Estado', 'Recibido por', 'Hora de llegada', 'Hora de salida', 'Temperatura', 'Observaciones', 'Incidencias reportadas', 'Fotos (enlaces)'],
      rows.map((r) => [r['Chofer'], r['Ruta'], r['Fecha'], r['Cliente'], r['Nº Guía'], r['Estado'], r['Recibido por'], r['Hora llegada'], r['Hora salida'], r['Temperatura'], r['Observaciones'], r['Incidencias'], r['Fotos (URLs)']]),
      'reporte-por-chofer',
      buildFilterInfo(),
      [
        { label: 'Choferes', value: dataChofer.length },
        { label: 'Rutas', value: totalRutas },
        { label: 'Guias', value: totalGuias },
        { label: 'Incidencias', value: totalIncidencias },
      ],
      undefined,
      detalleChoferCards,
      { showMainTable: false },
    )
  }

  const buildFechasRows = () => dataFechas.map((g) => ({
    'Nº Guía': g.numeroGuia,
    Estado: g.estado,
    Fecha: new Date(g.createdAt).toLocaleString('es-ES'),
    Cliente: g.cliente.nombre,
    Chofer: g.ruta.chofer.nombre,
    Ruta: g.ruta.id,
    'Recibido por': g.receptorNombre ?? '—',
    'Hora llegada': g.horaLlegada ?? '—',
    'Hora salida': g.horaSalida ?? '—',
    Temperatura: g.temperatura ?? '—',
    Observaciones: g.observaciones ?? '—',
    Incidencias: formatNovedades(g.novedades),
    'Fotos (URLs)': formatFotos(g.fotos.filter((f) => f.tipo === 'GUIA')),
    Mapa: buildStaticMapUrl(g.stop?.lat, g.stop?.lng, g.stop?.direccion),
  }))

  const handleExportFechasExcel = () =>
    exportToExcel(buildFechasRows(), 'reporte-por-fechas-detallado', 'Por Fechas', buildFilterInfo())

  const handleExportFechasPDF = async () => {
    const rows = buildFechasRows()
    const entregadas = dataFechas.filter((g) => g.estado === 'ENTREGADO').length
    const incidencias = dataFechas.filter((g) => g.estado === 'INCIDENCIA').length
    const detalleFechasCards = dataFechas
      .map((g) => ({
        routeId: g.ruta.id,
        card: {
          groupTitle: `Ruta #${g.ruta.id.slice(-6).toUpperCase()} · Chofer: ${g.ruta.chofer.nombre} · Fecha ruta: ${new Date(g.ruta.fecha).toLocaleDateString('es-ES')}`,
          title: `${g.cliente.nombre} · Guia ${g.numeroGuia}`,
          subtitle: `Estado de la guia: ${g.estado}`,
          fields: [
            { label: 'Recibido por', value: g.receptorNombre ?? '—' },
            { label: 'Registrada', value: new Date(g.createdAt).toLocaleString('es-ES') },
            { label: 'Hora llegada', value: g.horaLlegada ?? '—' },
            { label: 'Hora salida', value: g.horaSalida ?? '—' },
            { label: 'Temperatura', value: g.temperatura ?? '—' },
            { label: 'Observaciones', value: g.observaciones ?? '—' },
            { label: 'Incidencias', value: formatNovedades(g.novedades ?? []) },
          ],
          imageUrls: [
            buildStaticMapUrl(g.stop?.lat, g.stop?.lng, g.stop?.direccion),
            ...(g.fotos ?? []).filter((f) => f.tipo === 'GUIA').map((f) => f.urlPreview),
          ].filter(Boolean),
        },
      }))
      .sort((a, b) => a.routeId.localeCompare(b.routeId))
      .map((item) => item.card)
    await exportToPDF(
      'Reporte detallado por fechas',
      ['Numero de guia', 'Estado', 'Fecha de registro', 'Cliente de la guia', 'Chofer', 'Ruta', 'Recibido por', 'Hora de llegada', 'Hora de salida', 'Temperatura', 'Observaciones', 'Incidencias reportadas', 'Fotos (enlaces)'],
      rows.map((r) => [
        r['Nº Guía'],
        r['Estado'],
        r['Fecha'],
        r['Cliente'],
        r['Chofer'],
        r['Ruta'],
        r['Recibido por'],
        r['Hora llegada'],
        r['Hora salida'],
        r['Temperatura'],
        r['Observaciones'],
        r['Incidencias'],
        r['Fotos (URLs)'],
      ]),
      'reporte-por-fechas-detallado',
      buildFilterInfo(),
      [
        { label: 'Guias', value: dataFechas.length },
        { label: 'Entregadas', value: entregadas },
        { label: 'Incidencias', value: incidencias },
        { label: 'Rango', value: `${fechaDesde || 'Inicio'} - ${fechaHasta || 'Hoy'}` },
      ],
      undefined,
      detalleFechasCards,
      { showMainTable: false },
    )
  }

  const buildGuiaRows = () => dataGuia.map((g) => ({
    'Nº Guía': g.numeroGuia,
    Descripción: g.descripcion,
    Estado: g.estado,
    'Fecha registro': new Date(g.createdAt).toLocaleString('es-ES'),
    Cliente: g.cliente.nombre,
    Chofer: g.ruta.chofer.nombre,
    'Ruta ID': g.ruta.id,
    'Fecha ruta': new Date(g.ruta.fecha).toLocaleDateString('es-ES'),
    'Estado ruta': g.ruta.estado,
    'Recibido por': g.receptorNombre ?? '—',
    'Hora llegada': g.horaLlegada ?? '—',
    'Hora salida': g.horaSalida ?? '—',
    Temperatura: g.temperatura ?? '—',
    Observaciones: g.observaciones ?? '—',
    Incidencias: formatNovedades(g.novedades),
    'Fotos (URLs)': formatFotos(g.fotos.filter((f) => f.tipo === 'GUIA')),
    Mapa: buildStaticMapUrl(g.stop?.lat, g.stop?.lng, g.stop?.direccion),
  }))

  const handleExportGuiaExcel = () =>
    exportToExcel(buildGuiaRows(), 'reporte-por-guia', 'Por Guía', buildFilterInfo())

  const handleExportGuiaPDF = async () => {
    const rows = buildGuiaRows()
    const entregadas = dataGuia.filter((g) => g.estado === 'ENTREGADO').length
    const incidencias = dataGuia.filter((g) => g.estado === 'INCIDENCIA').length
    const pendientes = dataGuia.filter((g) => g.estado === 'PENDIENTE').length
    
    const detalleGuiaCards = dataGuia
      .map((g) => ({
        routeId: g.ruta.id,
        card: {
          groupTitle: `Ruta #${g.ruta.id.slice(-6).toUpperCase()} · Chofer: ${g.ruta.chofer.nombre} · Fecha ruta: ${new Date(g.ruta.fecha).toLocaleDateString('es-ES')}`,
          title: `${g.cliente.nombre} · Guía ${g.numeroGuia}`,
          subtitle: `Estado: ${g.estado} · ${g.descripcion}`,
          fields: [
            { label: 'Recibido por', value: g.receptorNombre ?? '—' },
            { label: 'Registrada', value: new Date(g.createdAt).toLocaleString('es-ES') },
            { label: 'Hora llegada', value: g.horaLlegada ?? '—' },
            { label: 'Hora salida', value: g.horaSalida ?? '—' },
            { label: 'Temperatura', value: g.temperatura ?? '—' },
            { label: 'Observaciones', value: g.observaciones ?? '—' },
            { label: 'Incidencias', value: formatNovedades(g.novedades ?? []) },
          ],
          imageUrls: [
            buildStaticMapUrl(g.stop?.lat, g.stop?.lng, g.stop?.direccion),
            ...(g.fotos ?? []).filter((f) => f.tipo === 'GUIA').map((f) => f.urlPreview),
          ].filter(Boolean),
        },
      }))
      .sort((a, b) => a.routeId.localeCompare(b.routeId))
      .map((item) => item.card)
    
    await exportToPDF(
      'Reporte por Guía',
      ['Número de guía', 'Descripción', 'Estado', 'Fecha registro', 'Cliente', 'Chofer', 'Ruta', 'Fecha ruta', 'Estado ruta', 'Recibido por', 'Hora llegada', 'Hora salida', 'Temperatura', 'Observaciones', 'Incidencias'],
      rows.map((r) => [
        r['Nº Guía'],
        r['Descripción'],
        r['Estado'],
        r['Fecha registro'],
        r['Cliente'],
        r['Chofer'],
        r['Ruta ID'],
        r['Fecha ruta'],
        r['Estado ruta'],
        r['Recibido por'],
        r['Hora llegada'],
        r['Hora salida'],
        r['Temperatura'],
        r['Observaciones'],
        r['Incidencias'],
      ]),
      'reporte-por-guia',
      buildFilterInfo(),
      [
        { label: 'Total guías', value: dataGuia.length },
        { label: 'Entregadas', value: entregadas },
        { label: 'Pendientes', value: pendientes },
        { label: 'Incidencias', value: incidencias },
      ],
      undefined,
      detalleGuiaCards,
      { showMainTable: false },
    )
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
          {tab === 'fechas' && (
            <>
              <button type="button" onClick={handleExportFechasExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                <span className="material-symbols-outlined text-sm">table_view</span>Excel
              </button>
              <button type="button" onClick={handleExportFechasPDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>PDF
              </button>
            </>
          )}
          {tab === 'guia' && (
            <>
              <button type="button" onClick={handleExportGuiaExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                <span className="material-symbols-outlined text-sm">table_view</span>Excel
              </button>
              <button type="button" onClick={handleExportGuiaPDF} className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
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
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                                    RUTA #{ruta.rutaId.slice(-6).toUpperCase()} • {ruta.fecha} • <span className="normal-case font-normal text-slate-500">{ruta.estado}</span>
                                  </p>
                                </div>
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
                                      {g.observaciones && (
                                        <div className="mt-1.5 text-xs text-slate-500 break-words overflow-hidden">
                                          Observaciones: {trunc(g.observaciones, 130)}
                                        </div>
                                      )}
                                      {g.novedades.length > 0 && (
                                        <div className="mt-1.5 text-xs text-amber-600 break-words overflow-hidden">
                                          Incidencias: {g.novedades.map((n) => trunc(`${n.tipo}: ${n.descripcion}`, 100)).join(' · ')}
                                        </div>
                                      )}
                                      {g.fotos.length > 0 && (
                                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                          {g.fotos.slice(0, 3).map((foto) => (
                                            <a key={foto.id} href={foto.urlPreview} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-slate-200">
                                              <img src={foto.urlPreview} alt="Foto de entrega" className="h-20 w-full object-cover" />
                                            </a>
                                          ))}
                                        </div>
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

            {tab === 'guia' && (
              <div className="p-4">
                <p className="mb-4 text-sm text-slate-500">
                  Total de guías: <strong className="text-slate-900">{dataGuia.length}</strong>
                  {(fechaDesde || fechaHasta) && (
                    <span className="ml-2 text-xs">
                      ({fechaDesde && `desde ${fechaDesde}`} {fechaHasta && `hasta ${fechaHasta}`})
                    </span>
                  )}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Nº Guía</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Chofer</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Receptor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataGuiaPaginada.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                            No hay guías para mostrar con los filtros seleccionados
                          </td>
                        </tr>
                      ) : (
                        dataGuiaPaginada.map((g) => (
                          <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5">
                              <span className="font-semibold text-primary">{trunc(g.numeroGuia, 30)}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-slate-600 text-xs">{trunc(g.descripcion, 40)}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                  <span className="material-symbols-outlined text-[14px] text-slate-400">business</span>
                                </div>
                                <span className="text-slate-700 text-sm">{trunc(g.cliente.nombre, 30)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                <span className="material-symbols-outlined text-[14px] text-slate-400">person</span>
                                {trunc(g.ruta.chofer.nombre, 25)}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                g.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-700' :
                                g.estado === 'INCIDENCIA' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>{g.estado}</span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                              {new Date(g.createdAt).toLocaleDateString('es-ES')}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 text-xs">
                              {g.receptorNombre ? trunc(g.receptorNombre, 25) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPagesGuia > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3 text-sm">
                    <p className="text-slate-500">{dataGuia.length} guía{dataGuia.length !== 1 ? 's' : ''}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPageGuia(p => p - 1)} disabled={pageGuia <= 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                        Anterior
                      </button>
                      <span className="text-slate-500">{pageGuia} / {totalPagesGuia}</span>
                      <button type="button" onClick={() => setPageGuia(p => p + 1)} disabled={pageGuia >= totalPagesGuia}
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
