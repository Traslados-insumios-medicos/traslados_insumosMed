import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ModalMotion } from "../../components/ui/ModalMotion";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { FilterSelect } from "../../components/ui/FilterSelect";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { PaginationBar } from "../../components/ui/PaginationBar";
import { api } from "../../services/api";
import { useToastStore } from "../../store/toastStore";

interface SeguimientoApi {
  id: string;
  nota: string;
  createdAt: string;
}

interface NovedadApi {
  id: string;
  tipo: string;
  descripcion: string;
  createdAt: string;
  guia: {
    id: string;
    numeroGuia: string | null;
    clienteId: string;
    descripcion: string;
    observaciones?: string | null;
    estado: string;
    receptorNombre?: string | null;
    ruta: {
      id: string;
      fecha: string;
      hojaRuta?: string | null;
      chofer: { nombre: string };
    };
    stop: {
      cliente: { nombre: string };
    };
  };
  seguimientos: SeguimientoApi[];
}

interface ClienteOption {
  id: string;
  nombre: string;
}

const tipoLabel: Record<string, string> = {
  CLIENTE_AUSENTE: "Cliente ausente",
  DIRECCION_INCORRECTA: "Dirección incorrecta",
  MERCADERIA_DANADA: "Mercadería dañada",
  OTRO: "Otro",
};

const listVariants = { show: { transition: { staggerChildren: 0.055 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function AdminNovedadesPage() {
  const addToast = useToastStore((s) => s.addToast);

  const [novedades, setNovedades] = useState<NovedadApi[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const [clienteId, setClienteId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [modalNovedadId, setModalNovedadId] = useState<string | null>(null);

  const modalNovedad = novedades.find((n) => n.id === modalNovedadId);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchNovedades = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(LIMIT),
        });
        if (clienteId) params.set("clienteId", clienteId);
        if (filtroTipo) params.set("tipo", filtroTipo);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (fechaDesde) params.set("desde", fechaDesde);
        if (fechaHasta) params.set("hasta", fechaHasta);
        const res = await api.get<{ data: NovedadApi[]; total: number }>(
          `/novedades?${params}`,
        );
        setNovedades(res.data.data);
        setTotal(res.data.total);
        setPage(p);
      } catch {
        addToast("Error al cargar novedades", "error");
      } finally {
        setLoading(false);
      }
    },
    [addToast, clienteId, filtroTipo, debouncedSearch, fechaDesde, fechaHasta],
  );

  useEffect(() => {
    fetchNovedades(1);
  }, [fetchNovedades]);

  useEffect(() => {
    api
      .get<{ data: ClienteOption[] }>("/clientes?limit=100")
      .then((r) => setClientes(r.data.data))
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const novedadesFiltradas = novedades; // filtrado en backend

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Novedades</h2>
        <p className="text-sm text-slate-500">
          Gestión y seguimiento de incidencias reportadas por los choferes.
        </p>
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
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Detalle de Novedad
              </h3>
              <button
                type="button"
                onClick={() => setModalNovedadId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
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
                    {new Date(modalNovedad.createdAt).toLocaleString("es-ES")}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  Descripción:
                </p>
                <p className="text-sm text-slate-700 break-words">
                  {modalNovedad.descripcion}
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-900 mb-2">
                  Observaciones de la guía:
                </p>
                <p className="text-sm text-slate-700 break-words">
                  {modalNovedad.guia.observaciones?.trim() || "—"}
                </p>
              </div>

              {/* Detalles de la guía y ruta */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Guía
                  </p>
                  <p className="text-sm font-medium text-primary break-words">
                    {modalNovedad.guia.numeroGuia ?? "Sin guía"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Chofer
                  </p>
                  <p className="text-sm text-slate-900 break-words overflow-hidden">
                    {modalNovedad.guia.ruta.chofer.nombre}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Cliente
                  </p>
                  <p className="text-sm text-slate-900 break-words overflow-hidden">
                    {modalNovedad.guia.stop.cliente.nombre}
                  </p>
                </div>
                {modalNovedad.guia.receptorNombre && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Receptor
                    </p>
                    <p className="text-sm text-slate-900 break-words overflow-hidden">
                      {modalNovedad.guia.receptorNombre}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Fecha Ruta
                  </p>
                  <p className="text-sm text-slate-900">
                    {modalNovedad.guia.ruta.fecha}
                  </p>
                </div>
                {modalNovedad.guia.ruta.hojaRuta && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Hoja de Ruta
                    </p>
                    <p className="text-sm font-medium text-primary">
                      {modalNovedad.guia.ruta.hojaRuta}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Estado
                  </p>
                  <p className="text-sm text-slate-900">
                    {modalNovedad.guia.estado}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      {/* Buscador */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          search
        </span>
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
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Filtros por tipo de novedad */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect
            label="Tipo de incidencia"
            options={[
              { value: "", label: "Todos" },
              ...Object.entries(tipoLabel).map(([key, label]) => ({
                value: key,
                label,
              })),
            ]}
            value={filtroTipo}
            onChange={setFiltroTipo}
            placeholder="Todos"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Cliente
            </label>
            <SearchableSelect
              value={clienteId}
              onChange={setClienteId}
              placeholder="Todos"
              options={[
                { value: "", label: "Todos" },
                ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm text-slate-500">
            Total: <strong className="text-slate-900">{total}</strong>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <motion.div
            className="divide-y divide-slate-100 p-4 space-y-3"
            variants={listVariants}
            initial="hidden"
            animate="show"
            key={[
              clienteId,
              fechaDesde,
              fechaHasta,
              novedadesFiltradas.map((x) => x.id).join(","),
            ].join("|")}
          >
            {novedadesFiltradas.length === 0 ? (
              <motion.div
                variants={itemVariants}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  {searchTerm || clienteId || fechaDesde || fechaHasta
                    ? "search_off"
                    : "check_circle"}
                </span>
                <p className="mt-2 text-sm text-slate-500">
                  {searchTerm ||
                  clienteId ||
                  fechaDesde ||
                  fechaHasta ||
                  filtroTipo
                    ? "No se encontraron novedades con los filtros aplicados."
                    : "No hay novedades con los filtros aplicados."}
                </p>
                {(searchTerm ||
                  clienteId ||
                  fechaDesde ||
                  fechaHasta ||
                  filtroTipo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setClienteId("");
                      setFechaDesde("");
                      setFechaHasta("");
                      setFiltroTipo("");
                    }}
                    className="mt-3 text-xs font-semibold text-primary hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </motion.div>
            ) : (
              novedadesFiltradas.map((n) => {
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
                          {new Date(n.createdAt).toLocaleString("es-ES")}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Guía:{" "}
                        <span className="font-medium text-primary">
                          {n.guia.numeroGuia ?? "Sin guía"}
                        </span>
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-900 break-words overflow-hidden">
                      {n.descripcion.length > 200
                        ? n.descripcion.slice(0, 197) + "..."
                        : n.descripcion}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 break-words overflow-hidden">
                      <span className="font-semibold">Observaciones:</span>{" "}
                      {n.guia.observaciones?.trim() || "—"}
                    </p>

                    {/* Detalles adicionales */}
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                        <span className="material-symbols-outlined text-[14px] text-slate-400 flex-shrink-0">
                          person
                        </span>
                        <span className="font-medium flex-shrink-0">
                          Chofer:
                        </span>
                        <span className="truncate overflow-hidden">
                          {n.guia.ruta.chofer.nombre.length > 25
                            ? n.guia.ruta.chofer.nombre.slice(0, 22) + "..."
                            : n.guia.ruta.chofer.nombre}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                        <span className="material-symbols-outlined text-[14px] text-slate-400 flex-shrink-0">
                          store
                        </span>
                        <span className="font-medium flex-shrink-0">
                          Cliente:
                        </span>
                        <span className="truncate overflow-hidden">
                          {n.guia.stop.cliente.nombre.length > 25
                            ? n.guia.stop.cliente.nombre.slice(0, 22) + "..."
                            : n.guia.stop.cliente.nombre}
                        </span>
                      </div>

                      {n.guia.receptorNombre && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                          <span className="material-symbols-outlined text-[14px] text-slate-400 flex-shrink-0">
                            badge
                          </span>
                          <span className="font-medium flex-shrink-0">
                            Receptor:
                          </span>
                          <span className="truncate overflow-hidden">
                            {n.guia.receptorNombre.length > 25
                              ? n.guia.receptorNombre.slice(0, 22) + "..."
                              : n.guia.receptorNombre}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">
                          calendar_today
                        </span>
                        <span className="font-medium">Fecha ruta:</span>
                        <span>{n.guia.ruta.fecha}</span>
                        {n.guia.ruta.hojaRuta && (
                          <span className="ml-1 font-medium text-primary">
                            {n.guia.ruta.hojaRuta}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Indicador de seguimientos */}
                    {n.seguimientos.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="material-symbols-outlined text-sm">
                          chat
                        </span>
                        <span>
                          {n.seguimientos.length} seguimiento
                          {n.seguimientos.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </motion.button>
                );
              })
            )}
          </motion.div>
        )}
        {!loading && (
          <div className="border-t border-slate-100 px-4 py-3">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              summary={`${total} novedad${total !== 1 ? "es" : ""}`}
              onPrev={() => fetchNovedades(page - 1)}
              onNext={() => fetchNovedades(page + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
