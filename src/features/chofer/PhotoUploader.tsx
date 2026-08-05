import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ImageSourceSheet } from "../../components/ui/ImageSourceSheet";
import { api } from "../../services/api";
import { useToastStore } from "../../store/toastStore";
import { useGlobalLoadingStore } from "../../store/globalLoadingStore";

const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

type Scope = "guia" | "hoja_ruta";

interface FotoApi {
  id: string;
  urlPreview: string;
  createdAt: string;
}
interface FotoBorrador {
  file: File;
  preview: string;
  isLocal: true;
}
type FotoDisplay = FotoApi | FotoBorrador;

interface PhotoUploaderProps {
  scope: Scope;
  guiaId?: string;
  rutaId?: string;
  label?: string;
  max?: number;
  /** Callback opcional al subir/eliminar foto (ej: para recargar la ruta) */
  onUploaded?: () => void;
  /** Modo borrador: las fotos se guardan localmente hasta que se llame onSave */
  draftMode?: boolean;
  /** Callback para obtener los archivos en borrador */
  onDraftChange?: (files: File[]) => void;
  /** Fotos iniciales en modo borrador */
  initialDraftFiles?: File[];
  /** Modo solo lectura: no se pueden agregar ni eliminar fotos */
  readOnly?: boolean;
  /** Callback cuando empieza a procesar fotos */
  onProcessingStart?: () => void;
  /** Callback cuando termina de procesar fotos */
  onProcessingEnd?: () => void;
}

function isFotoBorrador(foto: FotoDisplay): foto is FotoBorrador {
  return "isLocal" in foto && foto.isLocal === true;
}

export function PhotoUploader({
  scope,
  guiaId,
  rutaId,
  label,
  max,
  onUploaded,
  draftMode = false,
  onDraftChange,
  initialDraftFiles = [],
  readOnly = false,
  onProcessingStart,
  onProcessingEnd,
}: PhotoUploaderProps) {
  const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const showLoading = useGlobalLoadingStore((s) => s.show);
  const hideLoading = useGlobalLoadingStore((s) => s.hide);

  const [fotos, setFotos] = useState<FotoDisplay[]>([]);
  const [uploading, setUploading] = useState(false);

  const initialFilesLength = initialDraftFiles?.length ?? 0;

  // Cargar fotos existentes del servidor
  useEffect(() => {
    const url =
      scope === "guia" && guiaId
        ? `/fotos/guia/${guiaId}`
        : scope === "hoja_ruta" && rutaId
          ? `/fotos/ruta/${rutaId}`
          : null;
    if (!url) return;

    // Siempre cargar fotos del servidor
    api
      .get<FotoApi[]>(url)
      .then((r) => {
        // Si hay fotos en borrador, combinarlas con las del servidor
        if (draftMode && initialDraftFiles && initialDraftFiles.length > 0) {
          const borradores: FotoBorrador[] = initialDraftFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            isLocal: true as const,
          }));
          setFotos([...r.data, ...borradores]);
        } else {
          setFotos(r.data);
        }
      })
      .catch(() => {
        // Si falla la carga del servidor pero hay borradores, mostrar solo borradores
        if (draftMode && initialDraftFiles && initialDraftFiles.length > 0) {
          const borradores: FotoBorrador[] = initialDraftFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            isLocal: true as const,
          }));
          setFotos(borradores);
        }
      });
  }, [scope, guiaId, rutaId, draftMode, initialFilesLength]);

  // Eliminamos setPendingImageLoads para no causar side-effects durante el render

  // Sin límite si max no está definido
  const hasLimit = max !== undefined;
  const remaining = hasLimit ? Math.max(max - fotos.length, 0) : Infinity;
  // Permitir subir si NO estamos en modo solo lectura
  const canUpload = !readOnly;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = hasLimit
      ? Array.from(e.target.files ?? []).slice(0, remaining)
      : Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(
      (file) => !ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()),
    );
    if (invalidFiles.length > 0) {
      addToast(
        "Formato no permitido. Solo se aceptan JPG, PNG o WEBP (GIF bloqueado).",
        "error",
      );
      e.target.value = "";
      return;
    }

    showLoading();
    onProcessingStart?.();
    setUploading(true);

    try {
      const compressedFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          addToast(`Comprimiendo imagen ${i + 1} de ${files.length}...`, "info");
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);
          compressedFiles.push(compressedFile);
          
          console.log(`[DEBUG] Foto ${i+1}: Original ${(file.size / 1024 / 1024).toFixed(2)} MB -> Comprimida ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB. Ahorro: ${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`);
        } catch (error) {
          console.error("Error al comprimir foto", error);
          if (file.size < 10 * 1024 * 1024) {
            compressedFiles.push(file);
          } else {
            addToast(`No se pudo comprimir la foto y es demasiado grande (${(file.size/1024/1024).toFixed(2)} MB).`, "error");
          }
        }
      }

      if (compressedFiles.length === 0) return;

      if (draftMode) {
        const nuevasFotos: FotoBorrador[] = compressedFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file), // createObjectURL solo en el archivo final comprimido
          isLocal: true as const,
        }));

        const todasLasFotos = [...fotos, ...nuevasFotos];
        setFotos(todasLasFotos);

        const todosLosArchivos = todasLasFotos
          .filter(isFotoBorrador)
          .map((f) => f.file);
        onDraftChange?.(todosLosArchivos);
        return;
      }

      // Modo normal: subir inmediatamente
      for (const file of compressedFiles) {
        const formData = new FormData();
        formData.append("foto", file);
        const url =
          scope === "guia" && guiaId
            ? `/fotos/guia/${guiaId}`
            : `/fotos/ruta/${rutaId}`;
        const res = await api.post<FotoApi>(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFotos((prev) => [...prev, res.data]);
      }
      addToast("Foto(s) subida(s)", "success");
      onUploaded?.();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      addToast(message || "Error al subir foto", "error");
    } finally {
      setUploading(false);
      hideLoading();
      onProcessingEnd?.();
      if (e.target) e.target.value = "";
    }
  };

  const handleRemove = async (foto: FotoDisplay, index: number) => {
    if (readOnly) return; // No permitir eliminar en modo solo lectura

    if (isFotoBorrador(foto)) {
      // Foto en borrador: solo quitar del estado local
      const nuevasFotos = fotos.filter((_, i) => i !== index);
      setFotos(nuevasFotos);

      if (draftMode) {
        // Notificar al padre
        const todosLosArchivos = nuevasFotos
          .filter(isFotoBorrador)
          .map((f) => f.file);
        onDraftChange?.(todosLosArchivos);
      }

      // Liberar URL del preview
      URL.revokeObjectURL(foto.preview);
      return;
    }

    // Foto del servidor: eliminar del servidor
    showLoading();
    onProcessingStart?.();
    setUploading(true); // Bloquear mientras se elimina
    try {
      await api.delete(`/fotos/${foto.id}`);
      setFotos((prev) =>
        prev.filter((f) => !isFotoBorrador(f) && f.id !== foto.id),
      );
      addToast("Foto eliminada", "info");
      onUploaded?.();
    } catch {
      addToast("Error al eliminar foto", "error");
    } finally {
      setUploading(false);
      hideLoading();
      onProcessingEnd?.();
    }
  };

  // Limpiar URLs de preview al desmontar
  useEffect(() => {
    return () => {
      fotos.forEach((foto) => {
        if (isFotoBorrador(foto)) {
          URL.revokeObjectURL(foto.preview);
        }
      });
    };
  }, [fotos]);

  // Eliminado handleImageLoad

  const triggerInput = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.value = "";
    input.click();
  };

  const openCamera = () => {
    setSourceSheetOpen(false);
    requestAnimationFrame(() => triggerInput(cameraInputRef.current));
  };

  const openGallery = () => {
    setSourceSheetOpen(false);
    requestAnimationFrame(() => triggerInput(galleryInputRef.current));
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">
          {label} {hasLimit && `(${fotos.length}/${max})`}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {fotos.map((f, index) => {
          const preview = isFotoBorrador(f) ? f.preview : f.urlPreview;
          // Permitir eliminar si NO estamos en modo solo lectura
          const canDelete = !readOnly;
          return (
            <div
              key={isFotoBorrador(f) ? f.preview : f.id}
              className="relative"
            >
              <img
                src={preview}
                alt="Preview"
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover sm:h-20 sm:w-20"
              />
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleRemove(f, index)}
                  disabled={uploading}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Eliminar foto"
                >
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
              )}
            </div>
          );
        })}
        {canUpload && (
          <>
            <input
              ref={cameraInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <ImageSourceSheet
              open={sourceSheetOpen}
              onClose={() => setSourceSheetOpen(false)}
              onCamera={openCamera}
              onGallery={openGallery}
            />
            <button
              type="button"
              onClick={() => setSourceSheetOpen(true)}
              disabled={uploading}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50 sm:h-20 sm:w-20"
            >
              {uploading ? (
                <span className="material-symbols-outlined animate-spin text-xl">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-2xl">
                  add_photo_alternate
                </span>
              )}
              {hasLimit && (
                <span className="text-[10px] font-medium">
                  {uploading ? "..." : `+${remaining}`}
                </span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
