import { useState } from 'react'
import { api } from '../../services/api'
import { useToastStore } from '../../store/toastStore'

type TipoNovedad = 'CLIENTE_AUSENTE' | 'MERCADERIA_DANADA' | 'DIRECCION_INCORRECTA' | 'OTRO'

const TIPOS: { value: TipoNovedad; label: string }[] = [
  { value: 'CLIENTE_AUSENTE', label: 'Cliente no estuvo / ausente' },
  { value: 'MERCADERIA_DANADA', label: 'Mercadería dañada' },
  { value: 'DIRECCION_INCORRECTA', label: 'Dirección incorrecta' },
  { value: 'OTRO', label: 'Otra' },
]

const DESC_DEFAULT: Record<TipoNovedad, string> = {
  CLIENTE_AUSENTE: 'Cliente no se encontró en el punto de entrega.',
  MERCADERIA_DANADA: 'Mercadería dañada reportada.',
  DIRECCION_INCORRECTA: 'Dirección incorrecta.',
  OTRO: '',
}

interface IncidenceDialogProps {
  guiaId: string
  numeroGuia: string
  onClose: () => void
}

export function IncidenceDialog({ guiaId, numeroGuia, onClose }: IncidenceDialogProps) {
  const [tipo, setTipo] = useState<TipoNovedad>('CLIENTE_AUSENTE')
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const isOtra = tipo === 'OTRO'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOtra && !descripcion.trim()) return
    setSubmitting(true)
    try {
      await api.post('/novedades', {
        guiaId,
        tipo,
        descripcion: isOtra ? descripcion.trim() : DESC_DEFAULT[tipo],
      })
      addToast('Incidencia registrada', 'success')
      onClose()
    } catch {
      addToast('Error al registrar incidencia', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="incidence-dialog-title">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 id="incidence-dialog-title" className="text-lg font-bold text-slate-900">
            Registrar incidencia — {numeroGuia}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoNovedad)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {isOtra && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Descripción (obligatoria)</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                placeholder="Describe la incidencia..." />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting || (isOtra && !descripcion.trim())}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
              {submitting && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Registrar incidencia
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
