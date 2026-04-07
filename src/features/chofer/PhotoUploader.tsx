import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

type Scope = 'guia' | 'hoja_ruta'

interface FotoApi { id: string; urlPreview: string; createdAt: string }

interface PhotoUploaderProps {
  scope: Scope
  guiaId?: string
  rutaId?: string
  label?: string
  max?: number
  /** Callback opcional al subir/eliminar foto (ej: para recargar la ruta) */
  onUploaded?: () => void
}

export function PhotoUploader({ scope, guiaId, rutaId, label, max = scope === 'guia' ? 8 : 5, onUploaded }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.addToast)

  const [fotos, setFotos] = useState<FotoApi[]>([])
  const [uploading, setUploading] = useState(false)

  // Cargar fotos existentes
  useEffect(() => {
    const url = scope === 'guia' && guiaId
      ? `/fotos/guia/${guiaId}`
      : scope === 'hoja_ruta' && rutaId
        ? `/fotos/ruta/${rutaId}`
        : null
    if (!url) return
    api.get<FotoApi[]>(url).then((r) => setFotos(r.data)).catch(() => {})
  }, [scope, guiaId, rutaId])

  const remaining = Math.max(max - fotos.length, 0)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, remaining)
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('foto', file)
        const url = scope === 'guia' && guiaId
          ? `/fotos/guia/${guiaId}`
          : `/fotos/ruta/${rutaId}`
        const res = await api.post<FotoApi>(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setFotos((prev) => [...prev, res.data])
      }
      addToast('Foto(s) subida(s)', 'success')
      onUploaded?.()
    } catch {
      addToast('Error al subir foto', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemove = async (fotoId: string) => {
    try {
      await api.delete(`/fotos/${fotoId}`)
      setFotos((prev) => prev.filter((f) => f.id !== fotoId))
      addToast('Foto eliminada', 'info')
      onUploaded?.()
    } catch {
      addToast('Error al eliminar foto', 'error')
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">
          {label} ({fotos.length}/{max})
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {fotos.map((f) => (
          <div key={f.id} className="relative">
            <img src={f.urlPreview} alt="Preview" className="h-16 w-16 rounded-lg border border-slate-200 object-cover sm:h-20 sm:w-20" />
            <button type="button" onClick={() => handleRemove(f.id)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
              aria-label="Eliminar foto">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <>
            <input ref={inputRef} type="file" accept="image/*"
              capture={scope === 'guia' ? 'environment' : undefined}
              multiple className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50 sm:h-20 sm:w-20">
              {uploading
                ? <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                : <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
              }
              <span className="text-[10px] font-medium">{uploading ? '...' : `+${remaining}`}</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
