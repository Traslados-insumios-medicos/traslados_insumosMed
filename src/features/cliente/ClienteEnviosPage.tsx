import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGsapStaggerChildren } from "../../hooks/useGsapStaggerChildren";
import { api } from "../../services/api";
import { useToastStore } from "../../store/toastStore";
import { FilterSelect } from "../../components/ui/FilterSelect";

const estadoLabel: Record<string, string> = {
  ENTREGADO: "Entregado",
  INCIDENCIA: "Incidencia",
  PENDIENTE: "En camino",
};

const estadoClass: Record<string, string> = {
  ENTREGADO: "bg-emerald-100 text-emerald-800",
  INCIDENCIA: "bg-rose-100 text-rose-800",
  PENDIENTE: "bg-blue-100 text-blue-800",
};

const rutaEstadoLabel: Record<string, string> = {
  EN_CURSO: "En curso",
  PENDIENTE: "Planificada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

type Vista = "activos" | "entregadosHoy" | "incidencias" | "todos";

interface RutaMini {
  id: string;
  fecha: string;
  estado: string;
  nombre?: string | null;
  hojaRuta?: string | null;
}

interface GuiaListItem {
  id: string;
  numeroGuia: string | null;
  descripcion: string;
  estado: string;
  clienteId: string;
  cliente: { id: string; nombre: string };
  ruta: RutaMini;
}

interface MisEnviosResponse {
  data: GuiaListItem[];
  total: number;
  page: number;
  limit: number;
  resumen: {
    activas: number;
    entregadosHoy: number;
    incidencias: number;
    nombreEmpresa: string;
  };
}

export function ClienteEnviosPage() {
  const addToast = useToastStore((s) => s.addToast);
  const rootRef = useRef<HTMLDivElement>(null);

  const [vista, setVista] = useState<Vista>("activos");
  const [busqueda, setBusqueda] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroGuia, setFiltroGuia] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<MisEnviosResponse | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(busqueda.trim()), 350);
    return () => window.clearTimeout(t);
  }, [busqueda]);

  // Activar loading síncronamente al cambiar cualquier filtro o tab,
  // antes de que fetchEnvios se ejecute en el siguiente ciclo
  useEffect(() => {
    setLoading(true);
    setPage(1);
  }, [vista, debouncedSearch, filtroGuia]);

  const fetchEnvios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        vista,
        page: String(page),
        limit: "10",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filtroGuia) params.set("filtroGuia", filtroGuia);
      const res = await api.get<MisEnviosResponse>(
        `/guias/mis-envios?${params}`,
      );
      setPayload(res.data);
    } catch {
      addToast("No se pudieron cargar los envíos", "error");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [vista, page, debouncedSearch, filtroGuia, addToast]);

  useEffect(() => {
    fetchEnvios();
  }, [fetchEnvios]);

  useGsapStaggerChildren(rootRef, "[data-gsap-reveal]", [loading, vista]);

  const resumen = payload?.resumen;
  const guiasFiltradas = payload?.data ?? [];
  const total = payload?.total ?? 0;
  const limit = payload?.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const tabs: {
    id: Vista;
    label: string;
    badge: number | undefined;
    activeClass: string;
  }[] = [
    {
      id: "activos",
      label: "Envíos activos",
      badge: resumen?.activas,
      activeClass: "bg-primary text-white",
    },
    {
      id: "entregadosHoy",
      label: "Entregados hoy",
      badge: resumen?.entregadosHoy,
      activeClass: "bg-emerald-600 text-white",
    },
    {
      id: "incidencias",
      label: "Con incidencia",
      badge: resumen?.incidencias,
      activeClass: "bg-rose-600 text-white",
    },
    {
      id: "todos",
      label: "Todos",
      badge: undefined,
      activeClass: "bg-slate-700 text-white",
    },
  ];

  return (
    <div ref={rootRef} className="space-y-6 sm:space-y-8">
      {/* Encabezado */}
      <div data-gsap-reveal>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {resumen?.nombreEmpresa ?? "…"} · Panel
        </h1>
        <p className="text-sm text-slate-500 sm:text-base">
          Seguimiento de envíos y logística de insumos médicos
        </p>
      </div>

      {/* Tabs de navegación — un tab por vista */}
      <div
        data-gsap-reveal
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setVista(t.id)}
            className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              vista === t.id
                ? t.activeClass
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                  vista === t.id
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla de listado */}
      <div
        data-gsap-reveal
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
          <h3 className="text-lg font-bold text-slate-900">
            Listado
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({loading ? "…" : total} registros)
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              placeholder="Nº de guía"
              value={filtroGuia}
              onChange={setFiltroGuia}
              options={[
                { value: "con-guia", label: "Con guía" },
                { value: "sin-guia", label: "Sin guía" },
              ]}
              className="w-36"
            />
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por guía, descripción o HR…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                progress_activity
              </span>
            </div>
          ) : (
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nº Guía</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Punto de entrega</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Ruta</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guiasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-slate-500"
                    >
                      {debouncedSearch
                        ? "Sin resultados para esa búsqueda."
                        : "No hay envíos en esta vista."}
                    </td>
                  </tr>
                ) : (
                  guiasFiltradas.map((g) => {
                    const ruta = g.ruta;
                    return (
                      <tr
                        key={g.id}
                        className="transition-colors hover:bg-slate-50"
                      >
                        <td className="max-w-[16rem] break-all px-6 py-4 font-semibold text-primary">
                          {g.numeroGuia ?? "Sin guía"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {g.descripcion}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {g.cliente?.nombre ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClass[g.estado] ?? ""}`}
                          >
                            {estadoLabel[g.estado] ?? g.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {ruta ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`size-1.5 shrink-0 rounded-full ${ruta.estado === "EN_CURSO" ? "bg-emerald-500" : "bg-slate-400"}`}
                              />
                              <span>
                                {ruta.hojaRuta ? (
                                  <span className="text-slate-800">
                                    {ruta.hojaRuta}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Sin HR</span>
                                )}
                                <span className="ml-1 text-xs text-slate-400">
                                  ·{" "}
                                  {rutaEstadoLabel[ruta.estado] ?? ruta.estado}
                                </span>
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/cliente/envios/${g.id}`}
                            className="text-slate-400 transition-colors hover:text-primary"
                          >
                            <span className="material-symbols-outlined">
                              visibility
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
              Página {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
