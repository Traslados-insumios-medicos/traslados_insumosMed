import { useState } from 'react'
import { useChoferStore } from './model/choferStore'
import { useToastStore } from '../../store/toastStore'

const TIPOS = [
  { value: 'CLIENTE_AUSENTE', label: 'Cliente no estuvo / ausente' },
  { value: 'MERCADERIA_DANADA', label: 'Mercadería dañada' },
  { value: 'DIRECCION_INCORRECTA', label: 'Dirección incorrecta' },
  { value: 'OTRO', label: 'Otra' },
] as const

type TipoNovedad = typeof TIPOS[number]['value']

interface IncidenceDialogProps {
  guiaId: string
  numeroGuia: string
  onClose: () => void
}

export function IncidenceDialog({ guiaId, numeroGuia, onClose }: IncidenceDialogProps) {
  const [tipo, setTipo] = useState<TipoNovedad>('CLIENTE_AUSENTE')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const { registrarIncidencia } = useChoferStore()
  const addToast = useToastStore((s) => s.addToast)

  const isOtra = tipo === 'OTRO'

  const getDescripcionAuto = (t: TipoNovedad) => {
    if (t === 'CLIENTE_AUSENTE') return 'Cliente no se encontró en el punto de entrega.'
    if (t === 'MERCADERIA_DANADA') return 'Mercadería dañada reportada.'
    if (t === 'DIRECCION_INCORRECTA') return 'Dirección incorrecta.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOtra && !descripcion.trim()) return

    const desc = isOtra ? descripcion.trim() : getDescripcionAuto(tipo)
    setLoading(true)
    try {
      await registrarIncidencia(guiaId, tipo, desc)
      addToast('Incidencia registrada', 'success')
      onClose()
    } catch {
      addToast('Error al registrar incidencia', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incidence-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <h3 id="incidence-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Registrar incidencia — {numeroGuia}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoNovedad)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {isOtra && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Descripción (obligatoria)
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                placeholder="Describe la incidencia..."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (isOtra && !descripcion.trim())}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar incidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
