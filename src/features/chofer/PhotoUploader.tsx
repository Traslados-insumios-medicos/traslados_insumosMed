import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

type Scope = 'guia' | 'hoja_ruta'

interface FotoApi { id: string; urlPreview: string; createdAt: string }
interface FotoBorrador { file: File; preview: string; isLocal: true }
type FotoDisplay = FotoApi | FotoBorrador

interface PhotoUploaderProps {
  scope: Scope
  guiaId?: string
  rutaId?: string
  label?: string
  max?: number
  /** Callback opcional al subir/eliminar foto (ej: para recargar la ruta) */
  onUploaded?: () => void
  /** Modo borrador: las fotos se guardan localmente hasta que se llame onSave */
  draftMode?: boolean
  /** Callback para obtener los archivos en borrador */
  onDraftChange?: (files: File[]) => void
  /** Fotos iniciales en modo borrador */
  initialDraftFiles?: File[]
  /** Modo solo lectura: no se pueden agregar ni eliminar fotos */
  readOnly?: boolean
}

function isFotoBorrador(foto: FotoDisplay): foto is FotoBorrador {
  return 'isLocal' in foto && foto.isLocal === true
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
  readOnly = false
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.addToast)

  const [fotos, setFotos] = useState<FotoDisplay[]>([])
  const [uploading, setUploading] = useState(false)

  // Cargar fotos existentes del servidor
  useEffect(() => {
    if (draftMode && initialDraftFiles.length === 0) return // En modo borrador sin fotos previas, no cargamos del servidor
    
    const url = scope === 'guia' && guiaId
      ? `/fotos/guia/${guiaId}`
      : scope === 'hoja_ruta' && rutaId
        ? `/fotos/ruta/${rutaId}`
        : null
    if (!url) return
    api.get<FotoApi[]>(url).then((r) => setFotos(r.data)).catch(() => {})
  }, [scope, guiaId, rutaId, draftMode, initialDraftFiles.length])

  // Cargar fotos iniciales en modo borrador
  useEffect(() => {
    if (!draftMode || initialDraftFiles.length === 0) return
    
    const borradores: FotoBorrador[] = initialDraftFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isLocal: true as const
    }))
    
    // Si hay fotos del servidor, agregarlas también
    api.get<FotoApi[]>(
      scope === 'guia' && guiaId
        ? `/fotos/guia/${guiaId}`
        : `/fotos/ruta/${rutaId}`
    ).then((r) => {
      setFotos([...r.data, ...borradores])
    }).catch(() => {
      setFotos(borradores)
    })
  }, [draftMode, initialDraftFiles, scope, guiaId, rutaId])

  // Sin límite si max no está definido
  const hasLimit = max !== undefined
  const remaining = hasLimit ? Math.max(max - fotos.length, 0) : Infinity
  // Permitir subir solo si NO estamos en modo solo lectura Y estamos en modo borrador
  const canUpload = !readOnly && draftMode

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = hasLimit 
      ? Array.from(e.target.files ?? []).slice(0, remaining)
      : Array.from(e.target.files ?? [])
    if (files.length === 0) return

    if (draftMode) {
      // Modo borrador: guardar localmente (sin toast)
      const nuevasFotos: FotoBorrador[] = files.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        isLocal: true as const
      }))
      
      const todasLasFotos = [...fotos, ...nuevasFotos]
      setFotos(todasLasFotos)
      
      // Notificar al padre con todos los archivos
      const todosLosArchivos = todasLasFotos
        .filter(isFotoBorrador)
        .map(f => f.file)
      onDraftChange?.(todosLosArchivos)
      
      e.target.value = ''
      return
    }

    // Modo normal: subir inmediatamente
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

  const handleRemove = async (foto: FotoDisplay, index: number) => {
    if (isFotoBorrador(foto)) {
      // Foto en borrador: solo quitar del estado local
      const nuevasFotos = fotos.filter((_, i) => i !== index)
      setFotos(nuevasFotos)
      
      if (draftMode) {
        // Notificar al padre
        const todosLosArchivos = nuevasFotos
          .filter(isFotoBorrador)
          .map(f => f.file)
        onDraftChange?.(todosLosArchivos)
      }
      
      // Liberar URL del preview
      URL.revokeObjectURL(foto.preview)
      return
    }

    // Foto del servidor: eliminar del servidor
    try {
      await api.delete(`/fotos/${foto.id}`)
      setFotos((prev) => prev.filter((f) => !isFotoBorrador(f) && f.id !== foto.id))
      addToast('Foto eliminada', 'info')
      onUploaded?.()
    } catch {
      addToast('Error al eliminar foto', 'error')
    }
  }

  // Limpiar URLs de preview al desmontar
  useEffect(() => {
    return () => {
      fotos.forEach(foto => {
        if (isFotoBorrador(foto)) {
          URL.revokeObjectURL(foto.preview)
        }
      })
    }
  }, [fotos])

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">
          {label} {hasLimit && `(${fotos.length}/${max})`}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {fotos.map((f, index) => {
          const preview = isFotoBorrador(f) ? f.preview : f.urlPreview
          // Permitir eliminar si:
          // - NO estamos en modo solo lectura
          // - Y estamos en modo borrador (editando)
          const canDelete = !readOnly && draftMode
          return (
            <div key={isFotoBorrador(f) ? f.preview : f.id} className="relative">
              <img src={preview} alt="Preview" className="h-16 w-16 rounded-lg border border-slate-200 object-cover sm:h-20 sm:w-20" />
              {canDelete && (
                <button type="button" onClick={() => handleRemove(f, index)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                  aria-label="Eliminar foto">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          )
        })}
        {canUpload && (
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
              {hasLimit && <span className="text-[10px] font-medium">{uploading ? '...' : `+${remaining}`}</span>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
