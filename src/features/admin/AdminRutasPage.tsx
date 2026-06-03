import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDbRefresh } from "../../hooks/useDbRefresh";
import { useImageDownload } from "../../hooks/useImageDownload";
import { MapboxAddressInput } from "../../components/ui/MapboxAddressInput";
import { ModalMotion } from "../../components/ui/ModalMotion";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { EstadoRutaBadge } from "../../components/ui/Badge";
import { FilterSelect } from "../../components/ui/FilterSelect";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { PaginationBar } from "../../components/ui/PaginationBar";
import { useCiudadesOptions } from "../../hooks/useCiudadesOptions";
import { ESTADO_RUTA_FILTER_OPTIONS } from "../../constants/selectFilters";
import { api } from "../../services/api";
import { useToastStore } from "../../store/toastStore";

interface GuiaApi {
  id: string;
  numeroGuia: string | null;
  descripcion: string;
  estado: string;
  clienteId: string;
  stopId: string;
  receptorNombre?: string | null;
  horaLlegada?: string | null;
  horaSalida?: string | null;
  temperatura?: string | null;
  observaciones?: string | null;
  fotos: FotoApi[];
}

interface StopApi {
  id: string;
  orden: number;
  direccion: string;
  notas?: string | null;
  cliente: { id: string; nombre: string; ciudad?: string | null };
  guias: GuiaApi[];
}

interface FotoApi {
  id: string;
  urlPreview: string;
  createdAt: string;
  tipo: string;
}

interface RutaApi {
  id: string;
  nombre?: string | null;
  hojaRuta?: string | null;
  lugarOrigen?: string | null;
  lugarDestino?: string | null;
  fecha: string;
  estado: string;
  chofer: { id: string; nombre: string; cedula: string };
  stops: StopApi[];
  guias: GuiaApi[];
  fotos: FotoApi[];
}

interface PaginatedRutas {
  data: RutaApi[];
  total: number;
  page: number;
  limit: number;
}

interface ClienteOption {
  id: string;
  nombre: string;
  tipo: string;
  clientePrincipalId?: string | null;
  clientesSecundarios?: {
    id: string;
    nombre: string;
    direccion?: string;
    lat?: number | null;
    lng?: number | null;
    ruc?: string;
    activo?: boolean;
  }[];
}
interface ChoferOption {
  id: string;
  nombre: string;
}

// Etiqueta visible para un número de guía que puede ser null
const guiaLabel = (numeroGuia: string | null | undefined): string =>
  numeroGuia?.trim() ? numeroGuia.trim() : "Sin guía";

interface GuiaForm {
  descripcion: string;
  numeroGuia: string; // vacío = sin guía (se enviará como null al backend)
}

const generateNumeroGuia = () => {
  const ts = String(Date.now()).slice(-6);
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `G-${ts}-${rand}`;
};

const generateNombreRuta = () => {
  const ts = String(Date.now()).slice(-6);
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `RUTA-${ts}-${rand}`;
};

interface StopForm {
  clienteId: string; // principal seleccionado
  subClienteId: string; // secundario seleccionado (opcional)
  direccion: string;
  lat: number | null;
  lng: number | null;
  notas: string;
  guias: GuiaForm[]; // cada parada tiene múltiples guías
}

const guiaVacia = (): GuiaForm => ({ descripcion: "", numeroGuia: "" });
const stopVacio = (): StopForm => ({
  clienteId: "",
  subClienteId: "",
  direccion: "",
  lat: null,
  lng: null,
  notas: "",
  guias: [guiaVacia()],
});
const LIMIT = 10;

function ciudadesDeRuta(stops: StopApi[]): string {
  const unicas = [
    ...new Set(
      stops
        .map((s) => s.cliente.ciudad?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  return unicas.join(", ");
}

export function AdminRutasPage() {
  const ciudadesOptions = useCiudadesOptions();
  const addToast = useToastStore((s) => s.addToast);
  const { downloadImage } = useImageDownload();

  const [rutas, setRutas] = useState<RutaApi[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [choferes, setChoferes] = useState<ChoferOption[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  const [rutaExpandidaId, setRutaExpandidaId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedStop, setSelectedStop] = useState<StopApi | null>(null);
  const [deleteConfirmRuta, setDeleteConfirmRuta] = useState<RutaApi | null>(
    null,
  );
  const [deleteRutaSubmitting, setDeleteRutaSubmitting] = useState(false);

  // Cambiar chofer
  const [cambiarChoferRuta, setCambiarChoferRuta] = useState<RutaApi | null>(
    null,
  );
  const [nuevoChoferId, setNuevoChoferId] = useState("");
  const [cambiarChoferSubmitting, setCambiarChoferSubmitting] = useState(false);

  // Filtros de fecha
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroCiudad, setFiltroCiudad] = useState("");
  const [debouncedFiltroCiudad, setDebouncedFiltroCiudad] = useState("");

  // Debounce para el buscador
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedFiltroCiudad(filtroCiudad.trim()),
      400,
    );
    return () => clearTimeout(timer);
  }, [filtroCiudad]);

  // form
  const [nombreRuta, setNombreRuta] = useState("");
  const [hojaRutaField, setHojaRutaField] = useState("");
  const [lugarOrigen, setLugarOrigen] = useState("");
  const [lugarDestino, setLugarDestino] = useState("");
  const [choferId, setChoferId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [stopsForm, setStopsForm] = useState<StopForm[]>([stopVacio()]);
  const REQUIRED_MESSAGE = "Este campo es obligatorio";
  const [choferError, setChoferError] = useState("");
  const [stopsErrors, setStopsErrors] = useState<{
    [key: number]: {
      clienteId?: string;
      direccion?: string;
      guias?: { [guiaIdx: number]: string };
    };
  }>({});

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchRutas = useCallback(
    async (p: number, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: p.toString(),
          limit: LIMIT.toString(),
        });
        if (fechaDesde) params.append("desde", fechaDesde);
        if (fechaHasta) params.append("hasta", fechaHasta);
        if (filtroEstado) params.append("estado", filtroEstado);
        if (debouncedSearch.trim())
          params.append("search", debouncedSearch.trim());
        if (debouncedFiltroCiudad)
          params.append("ciudad", debouncedFiltroCiudad);

        const res = await api.get<PaginatedRutas>(
          `/rutas?${params.toString()}`,
        );
        setRutas(res.data.data);
        setTotal(res.data.total);
        setPage(p);
      } catch {
        addToast("Error al cargar rutas", "error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      addToast,
      fechaDesde,
      fechaHasta,
      filtroEstado,
      debouncedSearch,
      debouncedFiltroCiudad,
    ],
  );

  useEffect(() => {
    fetchRutas(1);
  }, [fetchRutas]);

  useEffect(() => {
    // Recargar cuando cambien los filtros
    fetchRutas(1);
  }, [
    fechaDesde,
    fechaHasta,
    filtroEstado,
    debouncedSearch,
    debouncedFiltroCiudad,
    fetchRutas,
  ]);

  useEffect(() => {
    // Load choferes and clientes for the form
    api
      .get<{ data: ChoferOption[] }>(
        "/usuarios?rol=CHOFER&limit=100&activo=true",
      )
      .then((r) => setChoferes(r.data.data))
      .catch(() => {});
    api
      .get<{ data: ClienteOption[] }>(
        "/clientes?limit=100&tipo=PRINCIPAL&includeSecundarios=true&activo=true",
      )
      .then((r) => setClientes(r.data.data))
      .catch(() => {});
  }, []);

  useDbRefresh("rutas", () => fetchRutas(page, true));

  const resetForm = () => {
    setNombreRuta("");
    setHojaRutaField("");
    setLugarOrigen("");
    setLugarDestino("");
    setChoferId("");
    setChoferError("");
    setFecha(new Date().toISOString().slice(0, 10));
    setStopsForm([stopVacio()]);
    setStopsErrors({});
    setShowModal(false);
  };

  const handleAddStop = () => setStopsForm((p) => [...p, stopVacio()]);
  const handleRemoveStop = (i: number) =>
    setStopsForm((p) => p.filter((_, idx) => idx !== i));
  const handleStopChange = (
    i: number,
    field: keyof Omit<StopForm, "guias">,
    value: string,
  ) =>
    setStopsForm((p) =>
      p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );

  const handleAddGuia = (stopIdx: number) => {
    setStopsForm((p) =>
      p.map((s, idx) =>
        idx === stopIdx ? { ...s, guias: [...s.guias, guiaVacia()] } : s,
      ),
    );
  };

  const handleRemoveGuia = (stopIdx: number, guiaIdx: number) => {
    setStopsForm((p) =>
      p.map((s, idx) => {
        if (idx !== stopIdx) return s;
        // Mantener al menos 1 guía
        if (s.guias.length <= 1) return s;
        return { ...s, guias: s.guias.filter((_, gIdx) => gIdx !== guiaIdx) };
      }),
    );
  };

  const handleGuiaChange = (
    stopIdx: number,
    guiaIdx: number,
    value: string,
  ) => {
    setStopsForm((p) =>
      p.map((s, idx) => {
        if (idx !== stopIdx) return s;
        return {
          ...s,
          guias: s.guias.map((g, gIdx) =>
            gIdx === guiaIdx ? { ...g, descripcion: value } : g,
          ),
        };
      }),
    );
  };

  const handleGuiaNumeroChange = (
    stopIdx: number,
    guiaIdx: number,
    value: string,
  ) => {
    setStopsForm((p) =>
      p.map((s, idx) => {
        if (idx !== stopIdx) return s;
        return {
          ...s,
          guias: s.guias.map((g, gIdx) =>
            gIdx === guiaIdx ? { ...g, numeroGuia: value } : g,
          ),
        };
      }),
    );
  };

  const handleGenerarNumeroGuia = (stopIdx: number, guiaIdx: number) => {
    handleGuiaNumeroChange(stopIdx, guiaIdx, generateNumeroGuia());
  };
  const handleClienteChange = (i: number, clienteId: string) => {
    setStopsForm((p) =>
      p.map((s, idx) =>
        idx === i
          ? {
              ...s,
              clienteId,
              subClienteId: "",
              direccion: "",
              lat: null,
              lng: null,
            }
          : s,
      ),
    );
    if (clienteId) {
      setStopsErrors((prev) => {
        const next = { ...prev };
        if (!next[i]) return prev;
        delete next[i].clienteId;
        if (Object.keys(next[i]).length === 0) delete next[i];
        return next;
      });
    }
  };

  const handleSubClienteChange = async (i: number, subClienteId: string) => {
    const stop = stopsForm[i];
    const principal = clientes.find((c) => c.id === stop.clienteId);
    const sub = principal?.clientesSecundarios?.find(
      (s) => s.id === subClienteId,
    );

    const direccion = sub?.direccion ?? "";
    let lat = sub?.lat ?? null;
    let lng = sub?.lng ?? null;

    // Si el cliente secundario tiene dirección pero no coordenadas, geocodificar automáticamente
    if (direccion && (lat === null || lng === null)) {
      try {
        const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(direccion)}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const [lng_result, lat_result] = data.features[0].center;
          lat = lat_result;
          lng = lng_result;
        }
      } catch {
        /* geocodificación opcional */
      }
    }

    setStopsForm((p) =>
      p.map((s, idx) =>
        idx === i ? { ...s, subClienteId, direccion, lat, lng } : s,
      ),
    );
  };

  const handleDireccionChange = (
    i: number,
    direccion: string,
    coords?: { lat: number; lng: number },
  ) => {
    setStopsForm((p) =>
      p.map((s, idx) =>
        idx === i
          ? {
              ...s,
              direccion,
              lat: coords?.lat ?? null,
              lng: coords?.lng ?? null,
            }
          : s,
      ),
    );
    if (direccion.trim() && coords) {
      setStopsErrors((prev) => {
        const next = { ...prev };
        if (!next[i]) return prev;
        delete next[i].direccion;
        if (Object.keys(next[i]).length === 0) delete next[i];
        return next;
      });
    }
  };

  const canSubmit =
    choferId &&
    stopsForm.every((s) => {
      const hasClienteId = !!s.clienteId;
      const hasDireccion = !!s.direccion && s.lat !== null;
      // numeroGuia ahora es opcional — solo descripción es requerida
      const allGuiasValid = s.guias.every(
        (g) => g.descripcion.trim().length > 0,
      );
      return hasClienteId && hasDireccion && allGuiasValid;
    });

  const handleSubmit = async () => {
    const nextStopsErrors: {
      [key: number]: {
        clienteId?: string;
        direccion?: string;
        guias?: { [guiaIdx: number]: string };
      };
    } = {};
    stopsForm.forEach((s, i) => {
      if (!s.clienteId)
        nextStopsErrors[i] = {
          ...(nextStopsErrors[i] ?? {}),
          clienteId: REQUIRED_MESSAGE,
        };
      if (!s.direccion || s.lat === null)
        nextStopsErrors[i] = {
          ...(nextStopsErrors[i] ?? {}),
          direccion: REQUIRED_MESSAGE,
        };

      const guiasErrors: { [guiaIdx: number]: string } = {};
      s.guias.forEach((g, gIdx) => {
        if (!g.descripcion.trim()) guiasErrors[gIdx] = REQUIRED_MESSAGE;
        // numeroGuia es opcional — no se valida como requerido
      });
      if (Object.keys(guiasErrors).length > 0) {
        nextStopsErrors[i] = {
          ...(nextStopsErrors[i] ?? {}),
          guias: guiasErrors,
        };
      }
    });

    setStopsErrors(nextStopsErrors);
    setChoferError(choferId ? "" : REQUIRED_MESSAGE);

    if (!canSubmit || !choferId || Object.keys(nextStopsErrors).length > 0)
      return;

    setSubmitting(true);
    try {
      const stopsPayload = stopsForm.map((s, i) => ({
        orden: i + 1,
        direccion: s.direccion,
        lat: s.lat ?? undefined,
        lng: s.lng ?? undefined,
        clienteId: s.subClienteId || s.clienteId,
        notas: s.notas || undefined,
        guias: s.guias.map((g) => ({
          descripcion: g.descripcion.trim() || "Insumos médicos",
          // Enviar null cuando no hay número — el backend lo acepta y lo guarda como null
          numeroGuia: g.numeroGuia.trim() || undefined,
        })),
      }));

      await api.post("/rutas", {
        nombre: nombreRuta.trim() || undefined,
        hojaRuta: hojaRutaField.trim() || undefined,
        lugarOrigen: lugarOrigen.trim() || undefined,
        lugarDestino: lugarDestino.trim() || undefined,
        fecha,
        choferId,
        stops: stopsPayload,
      });
      addToast("Ruta creada", "success");
      resetForm();
      fetchRutas(1);
    } catch {
      addToast("Error al crear ruta", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteRutaModal = (r: RutaApi) => setDeleteConfirmRuta(r);

  const executeDeleteRuta = async () => {
    const r = deleteConfirmRuta;
    if (!r) return;
    setDeleteRutaSubmitting(true);
    try {
      await api.delete(`/rutas/${r.id}`);
      addToast("Ruta eliminada", "success");
      setDeleteConfirmRuta(null);
      if (rutaExpandidaId === r.id) setRutaExpandidaId(null);
      setSelectedStop((prev) =>
        prev && r.stops.some((s) => s.id === prev.id) ? null : prev,
      );
      await fetchRutas(page);
    } catch {
      addToast("No se pudo eliminar la ruta", "error");
    } finally {
      setDeleteRutaSubmitting(false);
    }
  };

  const executeCambiarChofer = async () => {
    if (!cambiarChoferRuta || !nuevoChoferId) return;
    setCambiarChoferSubmitting(true);
    try {
      await api.patch(`/rutas/${cambiarChoferRuta.id}/asignar-chofer`, {
        choferId: nuevoChoferId,
      });
      addToast("Chofer actualizado correctamente", "success");
      setCambiarChoferRuta(null);
      setNuevoChoferId("");
      await fetchRutas(page);
    } catch {
      addToast("No se pudo cambiar el chofer", "error");
    } finally {
      setCambiarChoferSubmitting(false);
    }
  };

  const trunc = (str: string, max = 50) =>
    str.length > max ? str.slice(0, max) + "..." : str;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Rutas
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Detalle de rutas de los conductores asignados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span className="hidden sm:inline">Nueva Ruta</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Panel de filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        {/* Buscador */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, receptor o chofer..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Ciudad
            </label>
            <SearchableSelect
              options={ciudadesOptions}
              value={filtroCiudad}
              onChange={(v) => {
                setFiltroCiudad(v);
                setPage(1);
              }}
              placeholder="Todas..."
            />
          </div>
          <FilterSelect
            label="Estado"
            options={ESTADO_RUTA_FILTER_OPTIONS}
            value={filtroEstado}
            onChange={(v) => {
              setFiltroEstado(v);
              setPage(1);
            }}
            placeholder="Todos"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>
      </div>

      <ModalMotion
        show={!!deleteConfirmRuta}
        backdropClassName="bg-black/50"
        panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        {deleteConfirmRuta && (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">
                Eliminar ruta
              </h3>
              <button
                type="button"
                onClick={() =>
                  !deleteRutaSubmitting && setDeleteConfirmRuta(null)
                }
                className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-slate-600">
                ¿Eliminar la ruta{" "}
                <span className="font-semibold text-slate-900">
                  #{deleteConfirmRuta.id.slice(-6)}
                </span>{" "}
                de{" "}
                <span className="font-semibold">
                  {deleteConfirmRuta.chofer.nombre}
                </span>
                ? Se borran en la base todas las paradas, guías, fotos y el
                seguimiento asociado. El chofer no se elimina.
              </p>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={deleteRutaSubmitting}
                  onClick={() => setDeleteConfirmRuta(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteRutaSubmitting}
                  onClick={() => void executeDeleteRuta()}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleteRutaSubmitting && (
                    <span className="material-symbols-outlined animate-spin text-base">
                      progress_activity
                    </span>
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      {/* Modal cambiar chofer */}
      <ModalMotion
        show={!!cambiarChoferRuta}
        backdropClassName="bg-black/50"
        panelClassName="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
      >
        {cambiarChoferRuta && (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="text-base font-bold text-slate-900">
                Cambiar chofer
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCambiarChoferRuta(null);
                  setNuevoChoferId("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-xs text-slate-500">
                Ruta{" "}
                <span className="font-semibold text-slate-700">
                  #{cambiarChoferRuta.id.slice(-6).toUpperCase()}
                </span>
                {cambiarChoferRuta.hojaRuta && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-semibold text-primary">
                      {cambiarChoferRuta.hojaRuta}
                    </span>
                  </>
                )}
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nuevo chofer
                </label>
                <SearchableSelect
                  value={nuevoChoferId}
                  onChange={setNuevoChoferId}
                  placeholder="Seleccionar chofer..."
                  options={choferes.map((c) => ({
                    value: c.id,
                    label: c.nombre,
                  }))}
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCambiarChoferRuta(null);
                    setNuevoChoferId("");
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!nuevoChoferId || cambiarChoferSubmitting}
                  onClick={() => void executeCambiarChofer()}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {cambiarChoferSubmitting && (
                    <span className="material-symbols-outlined animate-spin text-base">
                      progress_activity
                    </span>
                  )}
                  Guardar
                </button>
              </div>
            </div>
          </>
        )}
      </ModalMotion>

      {/* Modal nueva ruta */}
      <ModalMotion
        show={showModal}
        backdropClassName="bg-black/50"
        panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h3 className="text-lg font-bold text-slate-900">Nueva Ruta</h3>
          <button
            type="button"
            onClick={resetForm}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Nombre de ruta{" "}
                <span className="text-xs font-normal text-slate-400">
                  (opcional)
                </span>
              </label>
              <span
                className={`text-[10px] ${nombreRuta.length > 50 ? "text-amber-500" : "text-slate-400"}`}
              >
                {nombreRuta.length}/60
              </span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Ej: RUTA-NORTE-01"
                value={nombreRuta}
                onChange={(e) => setNombreRuta(e.target.value.toUpperCase())}
                maxLength={60}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setNombreRuta(generateNombreRuta())}
                title="Generar nombre aleatorio"
                className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 hover:bg-primary/10 hover:border-primary/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">
                  casino
                </span>
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Hoja de ruta
              </label>
              <span
                className={`text-[10px] ${hojaRutaField.length > 100 ? "text-amber-500" : "text-slate-400"}`}
              >
                {hojaRutaField.length}/120
              </span>
            </div>
            <input
              type="text"
              placeholder="Ej: HR-2026-0142"
              value={hojaRutaField}
              onChange={(e) => setHojaRutaField(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Referencia visible en reportes Excel.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Lugar de origen
                </label>
                <span className="text-[10px] text-slate-400">
                  {lugarOrigen.length}/200
                </span>
              </div>
              <input
                type="text"
                placeholder="Ej: Bodega Quito Norte"
                value={lugarOrigen}
                onChange={(e) => setLugarOrigen(e.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Lugar de destino
                </label>
                <span className="text-[10px] text-slate-400">
                  {lugarDestino.length}/200
                </span>
              </div>
              <input
                type="text"
                placeholder="Ej: Ruta final sur"
                value={lugarDestino}
                onChange={(e) => setLugarDestino(e.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Chofer
            </label>
            <SearchableSelect
              options={choferes.map((c) => ({ value: c.id, label: c.nombre }))}
              value={choferId}
              onChange={(value) => {
                setChoferId(value);
                if (value) setChoferError("");
              }}
              onBlur={() => setChoferError(choferId ? "" : REQUIRED_MESSAGE)}
              placeholder="Seleccionar chofer..."
              error={!!choferError}
            />
            {choferError && (
              <p className="mt-1 text-xs text-red-500">{choferError}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Paradas
              </label>
              <button
                type="button"
                onClick={handleAddStop}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-sm">
                  add_circle
                </span>
                Agregar parada
              </button>
            </div>
            <div className="space-y-4">
              {stopsForm.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <span className="material-symbols-outlined text-primary">
                        location_on
                      </span>
                      Parada #{i + 1}
                    </span>
                    {stopsForm.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          delete
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {/* Cliente principal */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Cliente *
                      </label>
                      <SearchableSelect
                        options={clientes.map((c) => ({
                          value: c.id,
                          label: c.nombre,
                        }))}
                        value={s.clienteId}
                        onChange={(value) => handleClienteChange(i, value)}
                        onBlur={() => {
                          if (!s.clienteId) {
                            setStopsErrors((prev) => ({
                              ...prev,
                              [i]: { ...prev[i], clienteId: REQUIRED_MESSAGE },
                            }));
                          }
                        }}
                        placeholder="Seleccionar cliente..."
                        error={!!stopsErrors[i]?.clienteId}
                      />
                      {stopsErrors[i]?.clienteId && (
                        <p className="mt-1 text-xs text-red-500">
                          {stopsErrors[i].clienteId}
                        </p>
                      )}
                    </div>

                    {/* Cliente secundario — solo si el principal tiene secundarios */}
                    {s.clienteId &&
                      (() => {
                        const principal = clientes.find(
                          (c) => c.id === s.clienteId,
                        );
                        const subs = principal?.clientesSecundarios ?? [];
                        if (!subs.length) return null;
                        return (
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Punto de entrega (opcional)
                            </label>
                            <SearchableSelect
                              options={subs.map((sub) => ({
                                value: sub.id,
                                label: sub.nombre,
                              }))}
                              value={s.subClienteId}
                              onChange={(value) =>
                                handleSubClienteChange(i, value)
                              }
                              placeholder="Seleccionar punto..."
                            />
                          </div>
                        );
                      })()}

                    {/* Dirección con autocomplete Mapbox */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Dirección *
                      </label>
                      <MapboxAddressInput
                        key={`stop-${i}-${s.lat}-${s.lng}`}
                        value={s.direccion}
                        coords={
                          s.lat !== null && s.lng !== null
                            ? { lat: s.lat, lng: s.lng }
                            : null
                        }
                        onChange={(dir, coords) =>
                          handleDireccionChange(i, dir, coords)
                        }
                      />
                      {stopsErrors[i]?.direccion && (
                        <p className="mt-1 text-xs text-red-500">
                          {stopsErrors[i].direccion}
                        </p>
                      )}
                      {s.lat !== null && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                          <span className="material-symbols-outlined text-sm">
                            check_circle
                          </span>
                          Coordenadas guardadas
                        </p>
                      )}
                    </div>

                    {/* Notas */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-600">
                          Notas (opcional)
                        </label>
                        <span
                          className={`text-[10px] ${s.notas.length > 230 ? "text-amber-500" : "text-slate-400"}`}
                        >
                          {s.notas.length}/250
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Notas adicionales..."
                        value={s.notas}
                        onChange={(e) =>
                          handleStopChange(i, "notas", e.target.value)
                        }
                        maxLength={250}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      />
                    </div>

                    {/* Sección de Guías */}
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            inventory_2
                          </span>
                          Guías de esta parada
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddGuia(i)}
                          className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            add
                          </span>
                          Agregar guía
                        </button>
                      </div>

                      <div className="space-y-2">
                        {s.guias.map((guia, gIdx) => (
                          <div
                            key={gIdx}
                            className="rounded-lg border border-slate-200 bg-white p-2.5"
                          >
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-500">
                                Guía #{gIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveGuia(i, gIdx)}
                                disabled={s.guias.length <= 1}
                                className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={
                                  s.guias.length <= 1
                                    ? "Debe haber al menos 1 guía"
                                    : "Eliminar guía"
                                }
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  close
                                </span>
                              </button>
                            </div>
                            <div>
                              {/* Número de guía */}
                              <div className="mb-2">
                                <div className="mb-1 flex items-center justify-between">
                                  <label className="text-[10px] font-medium text-slate-600">
                                    Nº de guía
                                    <span className="ml-1 text-slate-400">
                                      (opcional)
                                    </span>
                                  </label>
                                  <span
                                    className={`text-[9px] ${guia.numeroGuia.length > 40 ? "text-amber-500" : "text-slate-400"}`}
                                  >
                                    {guia.numeroGuia.length}/50
                                  </span>
                                </div>
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Vacío = Sin guía"
                                    value={guia.numeroGuia}
                                    onChange={(e) =>
                                      handleGuiaNumeroChange(
                                        i,
                                        gIdx,
                                        e.target.value.toUpperCase(),
                                      )
                                    }
                                    maxLength={50}
                                    className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-xs font-mono ${
                                      stopsErrors[i]?.guias?.[gIdx]
                                        ? "border-red-400"
                                        : "border-slate-200"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleGenerarNumeroGuia(i, gIdx)
                                    }
                                    title="Generar número aleatorio"
                                    className="flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px] text-slate-500">
                                      casino
                                    </span>
                                  </button>
                                </div>
                              </div>
                              <div className="mb-1 flex items-center justify-between">
                                <label className="text-[10px] font-medium text-slate-600">
                                  Descripción *
                                </label>
                                <span
                                  className={`text-[9px] ${guia.descripcion.length > 130 ? "text-amber-500" : "text-slate-400"}`}
                                >
                                  {guia.descripcion.length}/150
                                </span>
                              </div>
                              <input
                                type="text"
                                placeholder="Ej: Insumos médicos"
                                value={guia.descripcion}
                                onChange={(e) => {
                                  handleGuiaChange(i, gIdx, e.target.value);
                                  if (e.target.value.trim()) {
                                    setStopsErrors((prev) => {
                                      const newErrors = { ...prev };
                                      if (newErrors[i]?.guias?.[gIdx]) {
                                        const guiasErrors = {
                                          ...newErrors[i].guias,
                                        };
                                        delete guiasErrors[gIdx];
                                        if (
                                          Object.keys(guiasErrors).length === 0
                                        ) {
                                          delete newErrors[i].guias;
                                        } else {
                                          newErrors[i] = {
                                            ...newErrors[i],
                                            guias: guiasErrors,
                                          };
                                        }
                                        if (
                                          Object.keys(newErrors[i]).length === 0
                                        )
                                          delete newErrors[i];
                                      }
                                      return newErrors;
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  if (!guia.descripcion.trim()) {
                                    setStopsErrors((prev) => ({
                                      ...prev,
                                      [i]: {
                                        ...prev[i],
                                        guias: {
                                          ...(prev[i]?.guias ?? {}),
                                          [gIdx]: REQUIRED_MESSAGE,
                                        },
                                      },
                                    }));
                                  }
                                }}
                                maxLength={150}
                                className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-xs ${
                                  stopsErrors[i]?.guias?.[gIdx]
                                    ? "border-red-400"
                                    : "border-slate-200"
                                }`}
                              />
                              {stopsErrors[i]?.guias?.[gIdx] && (
                                <p className="mt-1 text-[10px] text-red-500">
                                  {stopsErrors[i].guias![gIdx]}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && (
              <span className="material-symbols-outlined animate-spin text-base">
                progress_activity
              </span>
            )}
            Crear Ruta
          </button>
        </div>
      </ModalMotion>

      {/* Lista */}
      {loading ? (
        <LoadingSpinner />
      ) : rutas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title={
              debouncedSearch ||
              debouncedFiltroCiudad ||
              filtroEstado ||
              fechaDesde ||
              fechaHasta
                ? "No se encontraron rutas con los filtros aplicados."
                : "No hay rutas registradas."
            }
            onClear={
              debouncedSearch ||
              debouncedFiltroCiudad ||
              filtroEstado ||
              fechaDesde ||
              fechaHasta
                ? () => {
                    setSearchTerm("");
                    setFiltroCiudad("");
                    setFiltroEstado("");
                    setFechaDesde("");
                    setFechaHasta("");
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {rutas.map((ruta) => {
            const expandida = rutaExpandidaId === ruta.id;
            const ciudadesLabel = ciudadesDeRuta(ruta.stops);
            return (
              <div
                key={ruta.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-4">
                  {/* Fila principal */}
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <span className="material-symbols-outlined text-[20px] text-primary">
                        route
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-bold text-slate-900">
                          {ruta.nombre
                            ? ruta.nombre
                            : `RUTA #${ruta.id.slice(-6).toUpperCase()}`}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {ruta.estado === "EN_CURSO" && (
                            <Link
                              to={`/admin/rutas/${ruta.id}/tiempo-real`}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              title="Ver en tiempo real"
                            >
                              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                              En vivo
                            </Link>
                          )}
                          {ruta.estado === "PENDIENTE" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCambiarChoferRuta(ruta);
                                setNuevoChoferId(ruta.chofer.id);
                              }}
                              className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              aria-label="Cambiar chofer"
                              title="Cambiar chofer"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                swap_horiz
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteRutaModal(ruta);
                            }}
                            className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label="Eliminar ruta"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRutaExpandidaId(expandida ? null : ruta.id)
                            }
                            className="rounded-lg p-1 text-slate-400 hover:text-primary transition-colors"
                          >
                            <span
                              className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${expandida ? "rotate-180" : ""}`}
                            >
                              expand_more
                            </span>
                          </button>
                        </div>
                      </div>
                      {/* Fecha + badge + stats en una sola línea */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs text-slate-400">
                          {new Date(
                            ruta.fecha + "T00:00:00",
                          ).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <EstadoRutaBadge estado={ruta.estado} />
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">
                            person
                          </span>
                          {trunc(ruta.chofer.nombre)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">
                            location_on
                          </span>
                          {ruta.stops.length} paradas
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="material-symbols-outlined text-[13px] text-slate-400">
                            inventory_2
                          </span>
                          {ruta.stops.reduce(
                            (acc, s) => acc + s.guias.length,
                            0,
                          )}{" "}
                          guías
                        </span>
                        {ciudadesLabel && (
                          <span
                            className="flex items-center gap-1 text-xs text-slate-500"
                            title="Ciudades de los clientes en paradas"
                          >
                            <span className="material-symbols-outlined text-[13px] text-slate-400">
                              location_city
                            </span>
                            {trunc(ciudadesLabel, 60)}
                          </span>
                        )}
                      </div>
                      {(ruta.hojaRuta ||
                        ruta.lugarOrigen ||
                        ruta.lugarDestino) && (
                        <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                          {ruta.hojaRuta ? (
                            <p>
                              <span className="font-semibold text-slate-600">
                                Hoja de ruta:
                              </span>{" "}
                              {trunc(ruta.hojaRuta, 80)}
                            </p>
                          ) : null}
                          {ruta.lugarOrigen ? (
                            <p>
                              <span className="font-semibold text-slate-600">
                                Origen:
                              </span>{" "}
                              {trunc(ruta.lugarOrigen, 80)}
                            </p>
                          ) : null}
                          {ruta.lugarDestino ? (
                            <p>
                              <span className="font-semibold text-slate-600">
                                Destino:
                              </span>{" "}
                              {trunc(ruta.lugarDestino, 80)}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {expandida && (
                  <div className="border-t border-slate-200 p-4">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                          <span className="material-symbols-outlined text-primary">
                            format_list_numbered
                          </span>
                          Paradas y guías
                        </h4>
                        <ul className="space-y-3">
                          {ruta.stops.map((stop) => (
                            <li key={stop.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedStop(stop)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:border-primary hover:bg-primary/5"
                              >
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                                  Parada #{stop.orden}
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                  {trunc(stop.direccion)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {trunc(stop.cliente.nombre)}
                                  {stop.cliente.ciudad
                                    ? ` · ${stop.cliente.ciudad}`
                                    : ""}
                                </p>
                                {stop.notas && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {trunc(stop.notas)}
                                  </p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {stop.guias.map((g) => (
                                    <span
                                      key={g.id}
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                        g.estado === "ENTREGADO"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : g.estado === "INCIDENCIA"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {guiaLabel(g.numeroGuia)}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                          <span className="material-symbols-outlined text-primary">
                            receipt_long
                          </span>
                          Hoja de ruta finalizada
                        </h4>
                        {ruta.fotos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-8">
                            <span className="material-symbols-outlined text-4xl text-slate-400">
                              image_not_supported
                            </span>
                            <p className="mt-2 text-sm text-slate-500">
                              Sin fotos de hoja de ruta
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {ruta.fotos.map((f, idx) => (
                              <div
                                key={f.id}
                                className="group relative overflow-hidden rounded-lg border border-slate-200 transition-all hover:border-primary hover:shadow-md cursor-pointer"
                              >
                                <img
                                  src={f.urlPreview}
                                  alt="Hoja de ruta"
                                  className="h-40 w-auto max-w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  onClick={() =>
                                    window.open(f.urlPreview, "_blank")
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadImage(
                                      f.urlPreview,
                                      `hoja-ruta-${ruta.id.slice(-6)}-${idx + 1}.jpg`,
                                    );
                                  }}
                                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                                  title="Descargar imagen"
                                >
                                  <span className="material-symbols-outlined text-3xl text-white">
                                    download
                                  </span>
                                </button>
                                <p className="border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[11px] text-slate-400">
                                    image
                                  </span>
                                  {new Date(f.createdAt).toLocaleString(
                                    "es-ES",
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        summary={`${total} ruta${total !== 1 ? "s" : ""} en total`}
        loading={loading}
        onPrev={() => fetchRutas(page - 1)}
        onNext={() => fetchRutas(page + 1)}
      />

      {/* Modal detalle de parada */}
      <ModalMotion
        show={!!selectedStop}
        backdropClassName="bg-black/60"
        panelClassName="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {selectedStop && (
          <>
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Parada #{selectedStop.orden}
                </p>
                <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                  {trunc(selectedStop.direccion, 80)}
                </h3>
                <p className="text-sm text-slate-500">
                  {trunc(selectedStop.cliente.nombre)}
                </p>
                {selectedStop.notas && (
                  <p className="mt-1 text-xs text-slate-400">
                    {trunc(selectedStop.notas, 100)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedStop(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-5 p-5">
              {selectedStop.guias.map((g) => {
                const fotos = g.fotos ?? [];
                return (
                  <div
                    key={g.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    {/* Header guía */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Guía #{guiaLabel(g.numeroGuia)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {g.descripcion}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
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

                    {/* Detalles de entrega */}
                    {(g.receptorNombre ||
                      g.horaLlegada ||
                      g.horaSalida ||
                      g.temperatura ||
                      g.observaciones) && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {g.receptorNombre && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Recibido por
                              </p>
                              {g.receptorNombre.split("|").map((n, i) => (
                                <p key={i} className="text-xs text-slate-700">
                                  {n.trim()}
                                </p>
                              ))}
                            </div>
                          )}
                          {g.temperatura && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Temperatura
                              </p>
                              {g.temperatura.split("|").map((t, i) => (
                                <p key={i} className="text-xs text-slate-700">
                                  {t.trim()} °C
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {g.horaLlegada && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Llegada
                              </p>
                              <p className="text-xs text-slate-700 break-all">
                                {g.horaLlegada}
                              </p>
                            </div>
                          )}
                          {g.horaSalida && (
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Salida
                              </p>
                              <p className="text-xs text-slate-700 break-all">
                                {g.horaSalida}
                              </p>
                            </div>
                          )}
                        </div>
                        {g.observaciones && (
                          <div className="overflow-hidden">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Observaciones
                            </p>
                            <p className="text-xs text-slate-700 break-all overflow-wrap-anywhere">
                              {g.observaciones}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fotos de entrega */}
                    {fotos.length > 0 && (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Fotos de entrega ({fotos.length})
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {fotos.map((f, idx) => (
                            <div
                              key={f.id}
                              className="group relative overflow-hidden rounded-lg border border-slate-200 transition-all hover:border-primary hover:shadow-md cursor-pointer"
                            >
                              <img
                                src={f.urlPreview}
                                alt="Foto entrega"
                                className="h-32 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                onClick={() =>
                                  window.open(f.urlPreview, "_blank")
                                }
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(
                                    f.urlPreview,
                                    `entrega-${g.id}-${idx + 1}.jpg`,
                                  );
                                }}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                                title="Descargar imagen"
                              >
                                <span className="material-symbols-outlined text-2xl text-white">
                                  download
                                </span>
                              </button>
                              <p className="border-t border-slate-100 bg-white px-2 py-1 text-[10px] text-slate-400">
                                {new Date(f.createdAt).toLocaleString("es-ES", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fotos.length === 0 && g.estado === "ENTREGADO" && (
                      <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-400">
                        Sin fotos de entrega.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </ModalMotion>
    </div>
  );
}
