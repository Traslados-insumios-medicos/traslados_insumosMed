import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToastStore, type Toast } from '../../store/toastStore'

const TOAST_TTL_MS = 3500

const config = {
  success: {
    border: 'border-emerald-200',
    bar: 'bg-emerald-400',
    icon: 'check_circle',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-700',
    title: 'Éxito',
  },
  error: {
    border: 'border-red-200',
    bar: 'bg-red-400',
    icon: 'error',
    iconColor: 'text-red-500',
    titleColor: 'text-red-700',
    title: 'Error',
  },
  info: {
    border: 'border-blue-200',
    bar: 'bg-blue-400',
    icon: 'info',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-700',
    title: 'Info',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const c = config[toast.type]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setLeaving(true)
    setTimeout(onRemove, 300)
  }

  useEffect(() => {
    const t = setTimeout(handleClose, TOAST_TTL_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="alert"
      className={`relative w-full overflow-hidden rounded-xl border bg-white shadow-lg shadow-slate-200/60 transition-all duration-300 ${c.border} ${
        visible && !leaving ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className={`material-symbols-outlined mt-0.5 shrink-0 text-xl ${c.iconColor}`}>
          {c.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-wider ${c.titleColor}`}>{c.title}</p>
          <p className="mt-0.5 text-sm text-slate-700">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
      <div className="h-0.5 w-full bg-slate-100">
        <div
          className={`h-full ${c.bar} origin-left`}
          style={{ animation: `toast-progress ${TOAST_TTL_MS}ms linear forwards` }}
        />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return createPortal(
    <>
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
      <div
        className="fixed bottom-4 left-4 right-4 z-[99999] flex flex-col gap-2 sm:left-auto sm:right-5 sm:w-80"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
        ))}
      </div>
    </>,
    document.body
  )
}
