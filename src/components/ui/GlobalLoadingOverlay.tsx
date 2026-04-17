import { useGlobalLoadingStore } from '../../store/globalLoadingStore'

export function GlobalLoadingOverlay() {
  const isLoading = useGlobalLoadingStore((s) => s.isLoading)
  const message = useGlobalLoadingStore((s) => s.message)

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-primary animate-pulse">hourglass_empty</span>
          </div>
        </div>
        {message && (
          <p className="text-center text-sm font-medium text-slate-700">{message}</p>
        )}
        <p className="text-xs text-slate-500">Por favor espera...</p>
      </div>
    </div>
  )
}
