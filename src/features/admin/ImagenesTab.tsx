import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";
import { useToastStore } from "../../store/toastStore";
import { useGlobalLoadingStore } from "../../store/globalLoadingStore";
import { listenSseProgress } from "../../utils/sseUtils";
import { ModalMotion } from "../../components/ui/ModalMotion";
import { Button } from "../../components/ui/Button";

export interface RouteWithImages {
    id: string;
    hojaRuta: string | null;
    fecha: string;
    chofer: string;
    cantidadImagenes: number;
    fotoIds: string[];
}

interface LiberacionResult {
    eliminadas: number;
    errores: number;
}

interface SummaryState {
    fotosEncontradas: number;
    eliminadas: number;
    errores: number;
}

export interface ImagenesTabFilters {
    desde?: string;
    hasta?: string;
    clienteId?: string;
    choferId?: string;
    tipo?: string;
    ciudad?: string;
    filtroGuia?: string;
}

interface ImagenesTabProps {
    filters: ImagenesTabFilters;
    /** Called when the parent tells this tab to run the destroy flow */
    triggerFree?: boolean;
    onFreeTriggered?: () => void;
    /** Updated list of rutas/fotoIds reported to parent */
    onRutasLoaded?: (rutas: RouteWithImages[]) => void;
}

export function ImagenesTab({
    filters,
    triggerFree,
    onFreeTriggered,
    onRutasLoaded,
}: ImagenesTabProps) {
    const addToast = useToastStore((s) => s.addToast);
    const { show: showLoading, hide: hideLoading } = useGlobalLoadingStore();
    const [rutas, setRutas] = useState<RouteWithImages[]>([]);
    const [loading, setLoading] = useState(false);

    type ModalStage = "idle" | "confirm" | "summary";
    const [stage, setStage] = useState<ModalStage>("idle");
    const [summary, setSummary] = useState<SummaryState | null>(null);
    const [pendingFotoIds, setPendingFotoIds] = useState<string[]>([]);

    const fetchRutas = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.desde) params.set("desde", filters.desde);
            if (filters.hasta) params.set("hasta", filters.hasta);
            if (filters.clienteId) params.set("clienteId", filters.clienteId);
            if (filters.choferId) params.set("choferId", filters.choferId);
            if (filters.tipo) params.set("tipo", filters.tipo);
            if (filters.ciudad) params.set("ciudad", filters.ciudad);
            if (filters.filtroGuia) params.set("filtroGuia", filters.filtroGuia);

            const res = await api.get<RouteWithImages[]>(
                `/reportes/rutas-con-imagenes?${params}`,
            );
            setRutas(res.data);
            onRutasLoaded?.(res.data);
        } catch {
            addToast("Error al cargar rutas con imágenes", "error");
        } finally {
            setLoading(false);
        }
    }, [filters, addToast]); // onRutasLoaded is setImagenesRutas (stable React dispatch), excluded intentionally


    useEffect(() => {
        fetchRutas();
    }, [fetchRutas]);

    // When the parent sets triggerFree=true (after successful PDF export)
    // We call onFreeTriggered() FIRST so the parent resets the flag immediately,
    // preventing a second trigger if rutas changes while the modal is open.
    useEffect(() => {
        if (triggerFree && stage === "idle") {
            onFreeTriggered?.(); // reset parent flag before any setState
            const fotoIds = rutas.flatMap((r) => r.fotoIds);
            if (fotoIds.length > 0) {
                setPendingFotoIds(fotoIds);
                setStage("confirm");
            } else {
                addToast("No hay imágenes para liberar con los filtros actuales", "info");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerFree]); // intentionally omit rutas/stage: they are read inside, not depended on

    const handleConfirmDelete = async () => {
        setStage("idle");
        const jobId = crypto.randomUUID();
        showLoading("Liberando espacio en Cloudinary...", true);

        const stopSse = listenSseProgress(jobId, {
            onProgress: (event) => {
                useGlobalLoadingStore.getState().setProgress({
                    message: event.message || "Eliminando imágenes...",
                    subMessage: event.subMessage || null,
                    percent: event.percent ?? null,
                    step: event.step || null,
                });
            },
            onCompleted: (event) => {
                useGlobalLoadingStore.getState().setProgress({
                    message: event.message || "¡Liberación completada!",
                    percent: 100,
                    step: "completed",
                });
            },
            onError: (msg) => {
                useGlobalLoadingStore.getState().setProgress({
                    message: "Error durante la liberación de imágenes",
                    subMessage: msg,
                    step: "error",
                });
            },
        });

        try {
            const res = await api.post<LiberacionResult>(
                `/reportes/liberar-imagenes?jobId=${jobId}`,
                { fotoIds: pendingFotoIds },
            );

            setSummary({
                fotosEncontradas: pendingFotoIds.length,
                eliminadas: res.data.eliminadas,
                errores: res.data.errores,
            });
            setStage("summary");
            fetchRutas();
        } catch {
            addToast("Error al eliminar las imágenes", "error");
        } finally {
            stopSse();
            hideLoading();
        }
    };

    const handleClose = () => {
        setStage("idle");
        setSummary(null);
        setPendingFotoIds([]);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Resumen de lo que hay */}
            {!loading && rutas.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500 px-1">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                        photo_library
                    </span>
                    <span>
                        <strong className="text-slate-700">{rutas.length}</strong> ruta(s) con{" "}
                        <strong className="text-slate-700">
                            {rutas.reduce((acc, r) => acc + r.cantidadImagenes, 0)}
                        </strong>{" "}
                        imagen(es) según los filtros actuales.
                    </span>
                </div>
            )}

            {/* Tabla — mismo patrón HTML nativo que el resto de pestañas */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Hoja de Ruta</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Chofer</th>
                            <th className="px-4 py-3 text-center">Imágenes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                                    Cargando rutas...
                                </td>
                            </tr>
                        ) : rutas.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-12 text-center text-sm text-slate-400"
                                >
                                    No hay rutas con imágenes que coincidan con los filtros seleccionados.
                                </td>
                            </tr>
                        ) : (
                            rutas.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3.5 font-medium text-slate-900">
                                        {r.hojaRuta || `Ruta #${r.id.slice(-6).toUpperCase()}`}
                                    </td>
                                    <td className="px-4 py-3.5 text-slate-500">{r.fecha}</td>
                                    <td className="px-4 py-3.5 text-slate-500">{r.chofer}</td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span className="inline-flex items-center justify-center min-w-8 bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold text-xs">
                                            {r.cantidadImagenes}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL — Confirmación destructiva */}
            <ModalMotion
                show={stage === "confirm"}
                panelClassName="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-red-200"
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                            <svg
                                className="w-6 h-6 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">ATENCIÓN</h3>
                    </div>

                    <p className="text-slate-600 text-sm">
                        Esta acción{" "}
                        <span className="text-red-600 font-bold">eliminará permanentemente</span>{" "}
                        todas las imágenes encontradas según los filtros actuales, tanto de Cloudinary
                        como de la base de datos.
                    </p>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm font-semibold">
                            Esta operación no puede deshacerse.
                        </p>
                        <p className="text-red-700 text-xs mt-1">
                            <strong>{pendingFotoIds.length}</strong> imagen(es) de{" "}
                            <strong>{rutas.length}</strong> ruta(s) serán eliminadas.
                        </p>
                    </div>

                    <p className="text-slate-500 text-sm">¿Está completamente seguro?</p>

                    <div className="flex gap-3 mt-2 justify-end">
                        <Button variant="ghost" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            onClick={handleConfirmDelete}
                        >
                            Eliminar permanentemente
                        </button>
                    </div>
                </div>
            </ModalMotion>

            {/* MODAL — Resumen final */}
            <ModalMotion
                show={stage === "summary"}
                panelClassName="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200"
            >
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-slate-900 text-center">
                        Proceso finalizado
                    </h3>

                    <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                        <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 text-sm">PDF generado</span>
                            <span className="text-emerald-600 text-sm font-medium">✓ Correcto</span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 text-sm">Fotos encontradas</span>
                            <span className="text-slate-900 text-sm font-bold">
                                {summary?.fotosEncontradas}
                            </span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 text-sm">Fotos eliminadas</span>
                            <span className="text-emerald-600 text-sm font-bold">
                                {summary?.eliminadas}
                            </span>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 text-sm">Errores</span>
                            <span
                                className={`text-sm font-bold ${(summary?.errores ?? 0) > 0 ? "text-red-600" : "text-slate-400"
                                    }`}
                            >
                                {summary?.errores ?? 0}
                            </span>
                        </div>
                    </div>

                    {(summary?.errores ?? 0) > 0 && (
                        <p className="text-amber-600 text-xs text-center font-medium bg-amber-50 p-2 rounded-lg">
                            Las imágenes con error no fueron eliminadas de Cloudinary ni de la base de
                            datos.
                        </p>
                    )}

                    <Button className="w-full mt-2" onClick={handleClose}>
                        Cerrar
                    </Button>
                </div>
            </ModalMotion>
        </div>
    );
}