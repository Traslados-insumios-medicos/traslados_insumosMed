import { useGlobalLoadingStore } from '../../store/globalLoadingStore'

export function GlobalLoadingOverlay() {
  const isLoading = useGlobalLoadingStore((s) => s.isLoading)
  const message = useGlobalLoadingStore((s) => s.message)
  const showSubText = useGlobalLoadingStore((s) => s.showSubText)

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/30 gap-4">
      {message ? (
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/95 shadow-2xl border border-slate-800 max-w-xs sm:max-w-md w-full mx-4 text-center gap-4 transition-all duration-300">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-primary"></div>
          <div className="flex flex-col gap-2">
            <span className="text-white text-sm font-semibold tracking-wide animate-pulse">
              {message}
            </span>
            {showSubText && (
              <span className="text-slate-400 text-[11px] leading-normal font-normal">
                Dependiendo del volumen de información, este proceso puede tardar algunos segundos.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-primary"></div>
      )}
    </div>
  )
}
