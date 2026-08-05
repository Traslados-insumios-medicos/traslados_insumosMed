import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useToastStore } from "../../store/toastStore";
import { useGlobalLoadingStore } from "../../store/globalLoadingStore";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { FilterSelect } from "../../components/ui/FilterSelect";
import { TIPO_CLIENTE_FILTER_OPTIONS } from "../../constants/selectFilters";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useCiudadesOptions } from "../../hooks/useCiudadesOptions";
import {
  exportToExcel,
  exportToPDF,
  parseMultiField,
  parseMultiFieldSuffix,
} from "../../utils/exportUtils";
import { useImageDownload } from "../../hooks/useImageDownload";
import { listenSseProgress } from "../../utils/sseUtils";
import { ImagenesTab } from "./ImagenesTab";

type TabId = "cliente" | "fechas" | "chofer" | "guia" | "imagenes";

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
  { id: "cliente", label: "Por cliente" },
  { id: "fechas", label: "Por rango de fechas" },
  { id: "chofer", label: "Por chofer" },
  { id: "guia", label: "Por guía" },
  { id: "imagenes", label: "Imágenes" },
];

const LIMIT = 10;

const trunc = (str: string | undefined | null, max = 80) => {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
};

/** Valor para columna «Hoja de ruta» en exportaciones */
function rutaHojaLabel(
  r?: { hojaRuta?: string | null; nombre?: string | null } | null,
) {
  const h = r?.hojaRuta?.trim();
  const n = r?.nombre?.trim();
  return h || n || "—";
}

const formatNovedades = (novedades: { tipo: string; descripcion: string }[]) =>
  novedades.length
    ? novedades.map((n) => `${n.tipo}: ${n.descripcion}`).join(" | ")
    : "—";

const formatFotos = (fotos: { urlPreview: string }[]) =>
  fotos.length ? fotos.map((f) => f.urlPreview).join(" | ") : "—";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const buildStaticMapUrl = (
  lat?: number | null,
  lng?: number | null,
  direccion?: string | null,
) => {
  if (!MAPBOX_TOKEN) return "";
  // El mapa se renderiza en la tarjeta a 80x44 mm, por lo que
  // 400 px de ancho es suficiente para impresión en PDF A4.
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+0f172a(${lng},${lat})/${lng},${lat},14/400x220?access_token=${MAPBOX_TOKEN}`;
  }
  if (direccion && direccion.trim()) {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+0f172a(${encodeURIComponent(direccion)})/auto/400x220?access_token=${MAPBOX_TOKEN}`;
  }
  return "";
};

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

  const [loading, setLoading] = useState(false);
  const [choferExpandidoId, setChoferExpandidoId] = useState<string | null>(
    null,
  );

  // ─── Estado para la pestaña de Imágenes ────────────────────────────────────────────────
  const [imagenesRutas, setImagenesRutas] = useState<import('./ImagenesTab').RouteWithImages[]>([]);
  const [triggerFree, setTriggerFree] = useState(false);
  // Única fuente de verdad: los fotoIds disponibles según los filtros actuales
  const fotoIds = imagenesRutas.flatMap((r) => r.fotoIds);

  // CORRECCIÓN: memoizar el objeto filters para que no cambie de referencia en
  // cada render. Sin esto, useCallback([filters]) en ImagenesTab se recrea en
  // cada render, lo que dispara useEffect([fetchRutas]), que llama setImagenesRutas,
  // que re-renderiza el padre, creando un bucle infinito de GET /rutas-con-imagenes.
  const imagenesFilters = useMemo(
    () => ({
      desde: fechaDesde,
      hasta: fechaHasta,
      clienteId: clienteId,
      choferId: choferId,
      tipo: tipoCliente,
      ciudad: filtroCiudad,
      filtroGuia: filtroGuia,
    }),
    [fechaDesde, fechaHasta, clienteId, choferId, tipoCliente, filtroCiudad, filtroGuia],
  );

  // Estabilizar el callback para evitar que sea una nueva función en cada render
  const handleFreeTriggered = useCallback(() => setTriggerFree(false), []);

  const handleExportImages = useCallback(
    async () => {
      if (fotoIds.length === 0) {
        addToast("No hay imágenes para exportar con los filtros actuales", "warning");
        return;
      }
      const jobId = crypto.randomUUID();
      showLoading("Iniciando exportación de imágenes...", true);

      const stopSse = listenSseProgress(jobId, {
        onProgress: (event) => {
          useGlobalLoadingStore.getState().setProgress({
            message: event.message || "Procesando en servidor...",
            subMessage: event.subMessage || null,
            percent: event.percent ?? null,
            step: event.step || null,
          });
        },
        onCompleted: (event) => {
          useGlobalLoadingStore.getState().setProgress({
            message: event.message || "¡Respaldo generado con éxito!",
            subMessage: "Descargando archivo...",
            percent: 100,
            step: "completed",
          });
        },
        onError: (msg) => {
          useGlobalLoadingStore.getState().setProgress({
            message: "Error durante la generación del respaldo",
            subMessage: msg,
            step: "error",
          });
        },
      });

      try {
        const titulo = "Respaldo de Imágenes";
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/reportes/pdf/export-images?jobId=${jobId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fotoIds, titulo }),
          },
        );
        if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "respaldo-imagenes.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        addToast("Error al exportar imágenes", "error");
      } finally {
        stopSse();
        hideLoading();
      }
    },
    [fotoIds, showLoading, hideLoading, addToast],
  );

  const handleExportAndFree = useCallback(
    async () => {
      if (fotoIds.length === 0) {
        addToast("No hay imágenes para exportar con los filtros actuales", "warning");
        return;
      }
      // Primero exportar el PDF
      await handleExportImages();
      // Si llegó hasta aquí sin error, disparar la confirmación de borrado
      setTriggerFree(true);
    },
    [fotoIds, handleExportImages, addToast],
  );

  // Paginación
  const [pageCliente, setPageCliente] = useState(1);
  const [pageFechas, setPageFechas] = useState(1);
  const [pageChofer, setPageChofer] = useState(1);
  const [pageGuia, setPageGuia] = useState(1);

  const totalPagesCliente = Math.max(1, Math.ceil(dataCliente.length / LIMIT));
  const totalPagesFechas = Math.max(1, Math.ceil(dataFechas.length / LIMIT));
  const totalPagesChofer = Math.max(1, Math.ceil(dataChofer.length / LIMIT));
  const totalPagesGuia = Math.max(1, Math.ceil(dataGuia.length / LIMIT));

  const dataClientePaginada = dataCliente.slice(
    (pageCliente - 1) * LIMIT,
    pageCliente * LIMIT,
  );
  const dataFechasPaginada = dataFechas.slice(
    (pageFechas - 1) * LIMIT,
    pageFechas * LIMIT,
  );
  const dataChoferPaginada = dataChofer.slice(
    (pageChofer - 1) * LIMIT,
    pageChofer * LIMIT,
  );
  const dataGuiaPaginada = dataGuia.slice(
    (pageGuia - 1) * LIMIT,
    pageGuia * LIMIT,
  );

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
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Desde</label>
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Hasta</label>
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Chofer</label>
          <select value={choferId} onChange={(e) => setChoferId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="">Todos</option>
            {choferes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Botones de exportación */}
        <div className="flex gap-2 pb-2 sm:pb-0">
          {tab === "cliente" && (
            <>
              <button
                type="button"
                onClick={handleExportClienteExcel}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <span className="material-symbols-outlined text-sm">
                  table_view
                </span>
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDF("cliente")}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <span className="material-symbols-outlined text-sm">
                  picture_as_pdf
                </span>
                <span className="hidden sm:inline">PDF</span>
              </button>
            </>
          )}
          {tab === "chofer" && (
            <>
              <button
                type="button"
                onClick={handleExportChoferExcel}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <span className="material-symbols-outlined text-sm">
                  table_view
                </span>
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDF("chofer")}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <span className="material-symbols-outlined text-sm">
                  picture_as_pdf
                </span>
                <span className="hidden sm:inline">PDF</span>
              </button>
            </>
          )}
          {tab === "fechas" && (
            <>
              <button
                type="button"
                onClick={handleExportFechasExcel}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <span className="material-symbols-outlined text-sm">
                  table_view
                </span>
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDF("fechas")}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <span className="material-symbols-outlined text-sm">
                  picture_as_pdf
                </span>
                <span className="hidden sm:inline">PDF</span>
              </button>
            </>
          )}
          {tab === "guia" && (
            <>
              <button
                type="button"
                onClick={handleExportGuiaExcel}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <span className="material-symbols-outlined text-sm">
                  table_view
                </span>
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDF("guia")}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <span className="material-symbols-outlined text-sm">
                  picture_as_pdf
                </span>
                <span className="hidden sm:inline">PDF</span>
              </button>
            </>
          )}
          
          {tab === "imagenes" && (
            <>
              <button
                type="button"
                onClick={handleExportImages}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-sm">
                  picture_as_pdf
                </span>
                <span className="hidden sm:inline">Exportar imágenes</span>
              </button>
              <button
                type="button"
                onClick={handleExportAndFree}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <span className="material-symbols-outlined text-sm">
                  delete_sweep
                </span>
                <span className="hidden sm:inline">Exportar y liberar filtradas</span>
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
            {tab === "imagenes" ? (
              <div className="p-4">
                <ImagenesTab
                  filters={imagenesFilters}
                  onRutasLoaded={setImagenesRutas}
                  triggerFree={triggerFree}
                  onFreeTriggered={handleFreeTriggered}
                />
              </div>
            ) : (
              <>
                {tab === "cliente" && (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Ciudad / Sector</th>
                            <th className="px-4 py-3">Tipo / Pertenece a</th>
                            <th className="px-4 py-3 text-center">
                              Total guías
                            </th>
                            <th className="px-4 py-3 text-center">
                              Entregados
                            </th>
                            <th className="px-4 py-3 text-center">
                              Pendientes
                            </th>
                            <th className="px-4 py-3 text-center">
                              Incidencias
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dataClientePaginada.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-12 text-center text-sm text-slate-400"
                              >
                                No hay datos para mostrar con los filtros
                                seleccionados
                              </td>
                            </tr>
                          ) : (
                            dataClientePaginada.map((r) => (
                              <tr
                                key={r.clienteId}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                        r.tipo === "PRINCIPAL"
                                          ? "bg-primary/10"
                                          : "bg-slate-100"
                                      }`}
                                    >
                                      <span
                                        className={`material-symbols-outlined text-[16px] ${
                                          r.tipo === "PRINCIPAL"
                                            ? "text-primary"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {r.tipo === "PRINCIPAL"
                                          ? "corporate_fare"
                                          : "location_on"}
                                      </span>
                                    </div>
                                    <span className="font-medium text-slate-900">
                                      {trunc(r.nombre, 40)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-xs text-slate-600">
                                  {r.ciudad ?? "—"}
                                </td>
                                <td className="px-4 py-3.5">
                                  {r.tipo === "PRINCIPAL" ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                      <span className="material-symbols-outlined text-[14px]">
                                        verified
                                      </span>
                                      Principal
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                      <span className="material-symbols-outlined text-[14px] text-slate-400">
                                        arrow_forward
                                      </span>
                                      <span>
                                        {r.clientePrincipal?.nombre ||
                                          "Sin asignar"}
                                      </span>
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
                        <p className="text-slate-500">
                          {dataCliente.length} cliente
                          {dataCliente.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPageCliente((p) => p - 1)}
                            disabled={pageCliente <= 1}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Anterior
                          </button>
                          <span className="text-slate-500">
                            {pageCliente} / {totalPagesCliente}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPageCliente((p) => p + 1)}
                            disabled={pageCliente >= totalPagesCliente}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "fechas" && (
                  <div className="p-4">
                    <p className="mb-4 text-sm text-slate-500">
                      Guías en el rango:{" "}
                      <strong className="text-slate-900">
                        {dataFechas.length}
                      </strong>
                      {(fechaDesde || fechaHasta) && (
                        <span className="ml-2 text-xs">
                          ({fechaDesde && `desde ${fechaDesde}`}{" "}
                          {fechaHasta && `hasta ${fechaHasta}`})
                        </span>
                      )}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Guía</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Chofer</th>
                            <th className="px-4 py-3">Hoja ruta</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dataFechasPaginada.map((g) => (
                            <tr key={g.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-primary max-w-[120px] break-words overflow-hidden">
                                {trunc(g.numeroGuia)}
                              </td>
                              <td className="px-4 py-3 text-slate-600 max-w-[150px] break-words overflow-hidden">
                                {trunc(g.cliente.nombre)}
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-[150px] break-words overflow-hidden">
                                {trunc(g.ruta.chofer.nombre)}
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-[140px] text-xs break-words overflow-hidden">
                                {rutaHojaLabel(g.ruta) !== "—"
                                  ? trunc(rutaHojaLabel(g.ruta), 40)
                                  : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${
                                    g.estado === "ENTREGADO"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : g.estado === "INCIDENCIA"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {g.estado}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                {new Date(g.createdAt).toLocaleDateString(
                                  "es-ES",
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPagesFechas > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3 text-sm">
                        <p className="text-slate-500">
                          {dataFechas.length} guía
                          {dataFechas.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPageFechas((p) => p - 1)}
                            disabled={pageFechas <= 1}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Anterior
                          </button>
                          <span className="text-slate-500">
                            {pageFechas} / {totalPagesFechas}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPageFechas((p) => p + 1)}
                            disabled={pageFechas >= totalPagesFechas}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "chofer" && (
                  <div>
                    <div className="divide-y divide-slate-100">
                      {dataChoferPaginada.map((ch) => {
                        const expandido = choferExpandidoId === ch.choferId;
                        const totalGuias = ch.rutas.reduce(
                          (a, r) => a + r.guias.length,
                          0,
                        );
                        const entregadas = ch.rutas.reduce(
                          (a, r) =>
                            a +
                            r.guias.filter((g) => g.estado === "ENTREGADO")
                              .length,
                          0,
                        );
                        return (
                          <div key={ch.choferId}>
                            <button
                              type="button"
                              onClick={() =>
                                setChoferExpandidoId(
                                  expandido ? null : ch.choferId,
                                )
                              }
                              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`material-symbols-outlined text-slate-400 transition-transform ${expandido ? "rotate-90" : ""}`}
                                >
                                  chevron_right
                                </span>
                                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                                  <span className="material-symbols-outlined text-sm">
                                    person
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-900 break-words overflow-hidden">
                                    {trunc(ch.nombre)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {ch.rutas.length} rutas · {entregadas}/
                                    {totalGuias} guías entregadas
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-emerald-600">
                                Completado:{" "}
                                {totalGuias > 0
                                  ? Math.round((entregadas / totalGuias) * 100)
                                  : 0}
                                %
                              </span>
                            </button>

                            {expandido && (
                              <div className="border-t border-slate-100 bg-slate-50">
                                {ch.rutas.map((ruta) => (
                                  <div
                                    key={ruta.rutaId}
                                    className="border-b border-slate-100 px-12 py-3 last:border-0"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                                        {rutaHojaLabel({
                                          hojaRuta: ruta.hojaRuta,
                                          nombre: ruta.nombre,
                                        }) !== "—"
                                          ? `${rutaHojaLabel({ hojaRuta: ruta.hojaRuta, nombre: ruta.nombre })} • `
                                          : ""}
                                        #{ruta.rutaId.slice(-6).toUpperCase()} •{" "}
                                        {ruta.fecha} •{" "}
                                        <span className="normal-case font-normal text-slate-500">
                                          {ruta.estado}
                                        </span>
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      {ruta.guias.map((g) => (
                                        <div
                                          key={g.guiaId}
                                          className="rounded-lg border border-slate-200 bg-white p-3"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-semibold text-slate-900 break-words overflow-hidden">
                                                {trunc(g.cliente)} ·{" "}
                                                <span className="text-primary">
                                                  {trunc(g.numeroGuia)}
                                                </span>
                                              </p>
                                              <p className="text-xs text-slate-400 break-words overflow-hidden">
                                                <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">
                                                  location_on
                                                </span>
                                                {g.ciudadCliente ??
                                                  "Sin asignar"}
                                              </p>
                                              <p className="text-xs text-slate-500 break-words overflow-hidden">
                                                {trunc(g.descripcion)}
                                              </p>
                                            </div>
                                            <span
                                              className={`whitespace-nowrap flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                g.estado === "ENTREGADO"
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : g.estado === "INCIDENCIA"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-slate-100 text-slate-600"
                                              }`}
                                            >
                                              {g.estado}
                                            </span>
                                          </div>
                                          {(g.receptorNombre ||
                                            g.horaLlegada ||
                                            g.temperatura) && (
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                              {g.receptorNombre && (
                                                <span className="break-words overflow-hidden">
                                                  Receptor:{" "}
                                                  {parseMultiField(
                                                    g.receptorNombre,
                                                  )}
                                                </span>
                                              )}
                                              {g.horaLlegada && (
                                                <span className="whitespace-nowrap">
                                                  Llegada: {g.horaLlegada}
                                                </span>
                                              )}
                                              {g.horaSalida && (
                                                <span className="whitespace-nowrap">
                                                  Salida: {g.horaSalida}
                                                </span>
                                              )}
                                              {g.temperatura && (
                                                <span className="whitespace-nowrap">
                                                  Temperatura:{" "}
                                                  {parseMultiFieldSuffix(
                                                    g.temperatura,
                                                    "°C",
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {g.observaciones && (
                                            <div className="mt-1.5 text-xs text-slate-500 break-words overflow-hidden">
                                              Observaciones:{" "}
                                              {trunc(g.observaciones, 130)}
                                            </div>
                                          )}
                                          {g.novedades.length > 0 && (
                                            <div className="mt-1.5 text-xs text-amber-600 break-words overflow-hidden">
                                              Incidencias:{" "}
                                              {g.novedades
                                                .map((n) =>
                                                  trunc(
                                                    `${n.tipo}: ${n.descripcion}`,
                                                    100,
                                                  ),
                                                )
                                                .join(" · ")}
                                            </div>
                                          )}
                                          {g.fotos.length > 0 && (
                                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                              {g.fotos
                                                .slice(0, 3)
                                                .map((foto, idx) => (
                                                  <div
                                                    key={foto.id}
                                                    className="group relative block overflow-hidden rounded-md border border-slate-200 cursor-pointer"
                                                  >
                                                    <img
                                                      src={foto.urlPreview}
                                                      alt="Foto de entrega"
                                                      className="h-20 w-full object-cover transition-transform group-hover:scale-105"
                                                      onClick={() =>
                                                        window.open(
                                                          foto.urlPreview,
                                                          "_blank",
                                                        )
                                                      }
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        downloadImage(
                                                          foto.urlPreview,
                                                          `entrega-${g.guiaId}-${idx + 1}.jpg`,
                                                        );
                                                      }}
                                                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                                                      title="Descargar imagen"
                                                    >
                                                      <span className="material-symbols-outlined text-xl text-white">
                                                        download
                                                      </span>
                                                    </button>
                                                  </div>
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
                        );
                      })}
                    </div>
                    {totalPagesChofer > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                        <p className="text-slate-500">
                          {dataChofer.length} chofer
                          {dataChofer.length !== 1 ? "es" : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPageChofer((p) => p - 1)}
                            disabled={pageChofer <= 1}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Anterior
                          </button>
                          <span className="text-slate-500">
                            {pageChofer} / {totalPagesChofer}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPageChofer((p) => p + 1)}
                            disabled={pageChofer >= totalPagesChofer}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "guia" && (
                  <div className="p-4">
                    <p className="mb-4 text-sm text-slate-500">
                      Total de guías:{" "}
                      <strong className="text-slate-900">
                        {dataGuia.length}
                      </strong>
                      {(fechaDesde || fechaHasta) && (
                        <span className="ml-2 text-xs">
                          ({fechaDesde && `desde ${fechaDesde}`}{" "}
                          {fechaHasta && `hasta ${fechaHasta}`})
                        </span>
                      )}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Nº Guía</th>
                            <th className="px-4 py-3">Descripción</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Chofer</th>
                            <th className="px-4 py-3">Hoja ruta</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Receptor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dataGuiaPaginada.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-4 py-12 text-center text-sm text-slate-400"
                              >
                                No hay guías para mostrar con los filtros
                                seleccionados
                              </td>
                            </tr>
                          ) : (
                            dataGuiaPaginada.map((g) => (
                              <tr
                                key={g.id}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-4 py-3.5">
                                  <span className="font-semibold text-primary">
                                    {trunc(g.numeroGuia, 30)}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="text-slate-600 text-xs">
                                    {trunc(g.descripcion, 40)}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                      <span className="material-symbols-outlined text-[14px] text-slate-400">
                                        business
                                      </span>
                                    </div>
                                    <span className="text-slate-700 text-sm">
                                      {trunc(g.cliente.nombre, 30)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                    <span className="material-symbols-outlined text-[14px] text-slate-400">
                                      person
                                    </span>
                                    {trunc(g.ruta.chofer.nombre, 25)}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[140px] break-words">
                                  {rutaHojaLabel(g.ruta) !== "—"
                                    ? trunc(rutaHojaLabel(g.ruta), 36)
                                    : "—"}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      g.estado === "ENTREGADO"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : g.estado === "INCIDENCIA"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {g.estado}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                                  {new Date(g.createdAt).toLocaleDateString(
                                    "es-ES",
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 text-xs">
                                  {g.receptorNombre
                                    ? trunc(g.receptorNombre, 25)
                                    : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalPagesGuia > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3 text-sm">
                        <p className="text-slate-500">
                          {dataGuia.length} guía
                          {dataGuia.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPageGuia((p) => p - 1)}
                            disabled={pageGuia <= 1}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Anterior
                          </button>
                          <span className="text-slate-500">
                            {pageGuia} / {totalPagesGuia}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPageGuia((p) => p + 1)}
                            disabled={pageGuia >= totalPagesGuia}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
