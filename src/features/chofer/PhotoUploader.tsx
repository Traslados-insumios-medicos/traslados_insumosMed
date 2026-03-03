import { useRef } from 'react'
import type { Foto } from '../../types/models'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useToastStore } from '../../store/toastStore'
import { generateId } from '../../utils/generateId'
import { MAX_FOTOS_POR_GUIA, MAX_FOTOS_HOJA_RUTA } from '../../utils/constants'

type Scope = 'guia' | 'hoja_ruta'

interface PhotoUploaderProps {
  scope: Scope
  guiaId?: string
  rutaId?: string
  label?: string
  /** Máximo de fotos (default: 8 guía, 5 hoja) */
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
  const { fotos, addFotosToGuia, addFotosToRuta, removePhoto } = useLogisticsStore()
  const addToast = useToastStore((s) => s.addToast)

  const list: Foto[] =
    scope === 'guia' && guiaId
      ? fotos.filter((f) => f.guiaId === guiaId && f.tipo === 'GUIA')
      : scope === 'hoja_ruta' && rutaId
        ? fotos.filter((f) => f.rutaId === rutaId && f.tipo === 'HOJA_RUTA')
        : []
  const remaining = Math.max(max - list.length, 0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const toAdd = Math.min(files.length, remaining)
    if (toAdd <= 0) {
      addToast('Límite de fotos alcanzado', 'info')
      e.target.value = ''
      return
    }
    const createdAt = new Date().toISOString()
    let done = 0
    files.slice(0, toAdd).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const urlPreview = reader.result as string
        const foto: Foto = {
          id: generateId('foto'),
          guiaId: scope === 'guia' ? guiaId : undefined,
          rutaId: scope === 'hoja_ruta' ? rutaId : undefined,
          tipo: scope === 'guia' ? 'GUIA' : 'HOJA_RUTA',
          urlPreview,
          createdAt,
        }
        if (scope === 'guia' && guiaId) addFotosToGuia(guiaId, [foto])
        if (scope === 'hoja_ruta' && rutaId)
          addFotosToRuta(rutaId, [{ ...foto, rutaId, tipo: 'HOJA_RUTA' }])
        done++
        if (done === toAdd) {
          if (scope === 'guia') addToast('Foto(s) subida(s)', 'success')
          if (scope === 'hoja_ruta') addToast('Foto(s) de hoja de ruta subida(s)', 'success')
          e.target.value = ''
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemove = (photoId: string) => {
    removePhoto(photoId)
    addToast('Foto eliminada', 'info')
  }

  const accept = 'image/*'
  const capture = scope === 'guia' ? 'environment' : undefined

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
              alt="Preview"
              className="h-16 w-16 rounded-lg border border-slate-200 dark:border-slate-600 object-cover sm:h-20 sm:w-20"
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
        {remaining > 0 && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              capture={capture}
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary sm:h-20 sm:w-20"
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
