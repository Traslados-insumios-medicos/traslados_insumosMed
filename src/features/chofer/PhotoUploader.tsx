import { useRef, useState } from 'react'
import { useChoferStore, type FotoAPI } from './model/choferStore'
import { useToastStore } from '../../store/toastStore'
import { MAX_FOTOS_POR_GUIA, MAX_FOTOS_HOJA_RUTA } from '../../utils/constants'

type Scope = 'guia' | 'hoja_ruta'

interface PhotoUploaderProps {
  scope: Scope
  guiaId?: string
  rutaId?: string
  label?: string
  max?: number
}

export function PhotoUploader({
  scope,
  guiaId,
  rutaId,
  label,
  max = scope === 'guia' ? MAX_FOTOS_POR_GUIA : MAX_FOTOS_HOJA_RUTA,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { rutaActual, subirFotoGuia, subirFotoRuta, eliminarFoto } = useChoferStore()
  const addToast = useToastStore((s) => s.addToast)
  const [uploading, setUploading] = useState(false)

  // Obtener fotos del store según scope
  const list: FotoAPI[] = (() => {
    if (!rutaActual) return []
    if (scope === 'guia' && guiaId) {
      const todasGuias = [
        ...(rutaActual.guias ?? []),
        ...(rutaActual.stops ?? []).flatMap((s) => s.guias ?? []),
      ]
      const guia = todasGuias.find((g) => g.id === guiaId)
      return (guia?.fotos ?? []).filter((f) => f.tipo === 'GUIA')
    }
    if (scope === 'hoja_ruta' && rutaId) {
      return (rutaActual.fotos ?? []).filter((f) => f.tipo === 'HOJA_RUTA')
    }
    return []
  })()

  const remaining = Math.max(max - list.length, 0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (remaining <= 0) {
      addToast('Límite de fotos alcanzado', 'info')
      e.target.value = ''
      return
    }

    setUploading(true)
    const toUpload = files.slice(0, remaining)

    try {
      for (const file of toUpload) {
        if (scope === 'guia' && guiaId) {
          await subirFotoGuia(guiaId, file)
        } else if (scope === 'hoja_ruta' && rutaId) {
          await subirFotoRuta(rutaId, file)
        }
      }
      addToast(`${toUpload.length} foto(s) subida(s)`, 'success')
    } catch {
      addToast('Error al subir foto', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemove = async (fotoId: string) => {
    try {
      await eliminarFoto(fotoId)
      addToast('Foto eliminada', 'info')
    } catch {
      addToast('Error al eliminar foto', 'error')
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">
          {label} ({list.length}/{max})
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {list.map((f) => (
          <div key={f.id} className="relative">
            <img
              src={f.urlPreview}
              alt="Foto de entrega"
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-600 sm:h-20 sm:w-20"
            />
            <button
              type="button"
              onClick={() => handleRemove(f.id)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
              aria-label="Eliminar foto"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}

        {uploading && (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 sm:h-20 sm:w-20">
            <span className="text-[10px] font-medium text-primary">Subiendo...</span>
          </div>
        )}

        {remaining > 0 && !uploading && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture={scope === 'guia' ? 'environment' : undefined}
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 sm:h-20 sm:w-20"
            >
              <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
              <span className="text-[10px] font-medium">+{remaining}</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
