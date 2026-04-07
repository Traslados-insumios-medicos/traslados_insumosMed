import { useEffect, useState } from 'react'
import { useToastStore, type Toast } from '../../store/toastStore'

const TOAST_TTL_MS = 3500

const config = {
  success: {
    bar: 'bg-emerald-400',
    icon: 'check_circle',
    iconColor: 'text-emerald-400',
    title: 'Éxito',
  },
  error: {
    bar: 'bg-red-400',
    icon: 'error',
    iconColor: 'text-red-400',
    title: 'Error',
  },
  info: {
    bar: 'bg-blue-400',
    icon: 'info',
    iconColor: 'text-blue-400',
    title: 'Info',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const c = config[toast.type]

  // Entrada
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Salida animada antes de remover
  const handleClose = () => {
    setLeaving(true)
    setTimeout(onRemove, 300)
  }

  // Auto-close
  useEffect(() => {
    const t = setTimeout(handleClose, TOAST_TTL_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="alert"
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40 transition-all duration-300 ${
        visible && !leaving
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icono */}
        <span className={`material-symbols-outlined mt-0.5 shrink-0 text-xl ${c.iconColor}`}>
          {c.icon}
        </span>

        {/* Contenido */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{c.title}</p>
          <p className="mt-0.5 text-sm font-medium text-white">{toast.message}</p>
        </div>

        {/* Cerrar */}
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="h-0.5 w-full bg-white/5">
        <div
          className={`h-full ${c.bar} origin-left`}
          style={{
            animation: `toast-progress ${TOAST_TTL_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
      <div
        className="fixed bottom-5 right-5 z-[200] flex w-80 flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
        ))}
      </div>
    </>
  )
}
