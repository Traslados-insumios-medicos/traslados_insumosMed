import { useState } from 'react'
import type { TipoNovedad } from '../../types/models'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useToastStore } from '../../store/toastStore'

const TIPOS: { value: TipoNovedad; label: string }[] = [
  { value: 'CLIENTE_AUSENTE', label: 'Cliente no estuvo / ausente' },
  { value: 'MERCADERIA_DANADA', label: 'Mercadería dañada' },
  { value: 'DIRECCION_INCORRECTA', label: 'Dirección incorrecta' },
  { value: 'OTRO', label: 'Otra' },
]

interface IncidenceDialogProps {
  guiaId: string
  numeroGuia: string
  onClose: () => void
}

export function IncidenceDialog({ guiaId, numeroGuia, onClose }: IncidenceDialogProps) {
  const [tipo, setTipo] = useState<TipoNovedad>('CLIENTE_AUSENTE')
  const [descripcion, setDescripcion] = useState('')
  const { addNovedadToGuia, updateGuiaEstado } = useLogisticsStore()
  const addToast = useToastStore((s) => s.addToast)

  const isOtra = tipo === 'OTRO'
  const descripcionRequired = isOtra

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (descripcionRequired && !descripcion.trim()) return
    const desc = isOtra ? descripcion.trim() : (tipo === 'CLIENTE_AUSENTE' ? 'Cliente no se encontró en el punto de entrega.' : tipo === 'MERCADERIA_DANADA' ? 'Mercadería dañada reportada.' : tipo === 'DIRECCION_INCORRECTA' ? 'Dirección incorrecta.' : descripcion.trim())
    addNovedadToGuia(guiaId, tipo, desc)
    updateGuiaEstado(guiaId, 'INCIDENCIA')
    addToast('Incidencia registrada', 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="incidence-dialog-title">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-600 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-600 p-4">
          <h3 id="incidence-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Registrar incidencia — {numeroGuia}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoNovedad)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {isOtra && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción (obligatoria)</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                required={descripcionRequired}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="Describe la incidencia..."
              />
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={descripcionRequired && !descripcion.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Registrar incidencia
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
