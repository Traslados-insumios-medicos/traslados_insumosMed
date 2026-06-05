import { useGlobalLoadingStore } from '../../store/globalLoadingStore'

export function GlobalLoadingOverlay() {
  const isLoading = useGlobalLoadingStore((s) => s.isLoading)
  const message = useGlobalLoadingStore((s) => s.message)
  const showSubText = useGlobalLoadingStore((s) => s.showSubText)

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/30 gap-5">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-primary"></div>
      {message && (
        <div className="flex flex-col items-center gap-2 text-center px-6 max-w-sm sm:max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <span className="text-white text-base font-bold tracking-wide animate-pulse">
            {message}
          </span>
          {showSubText && (
            <span className="text-slate-100 text-xs leading-relaxed font-semibold">
              Dependiendo del volumen de información, este proceso puede tardar algunos segundos o incluso minutos.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
