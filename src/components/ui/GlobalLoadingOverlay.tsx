import { useGlobalLoadingStore } from '../../store/globalLoadingStore'

export function GlobalLoadingOverlay() {
  const isLoading = useGlobalLoadingStore((s) => s.isLoading)
  const message = useGlobalLoadingStore((s) => s.message)
  const subMessage = useGlobalLoadingStore((s) => s.subMessage)
  const percent = useGlobalLoadingStore((s) => s.percent)
  const showSubText = useGlobalLoadingStore((s) => s.showSubText)

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm gap-5">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-primary shadow-lg"></div>
      
      {(message || percent !== null || subMessage || showSubText) && (
        <div className="flex flex-col items-center gap-3 text-center px-6 max-w-sm sm:max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] w-full">
          {message && (
            <span className="text-white text-base font-bold tracking-wide">
              {message}
            </span>
          )}

          {percent !== null && (
            <div className="w-full flex items-center gap-3 my-1">
              <div className="flex-1 bg-transparent border border-white/60 rounded h-2 overflow-hidden">
                <div
                  className="bg-white/40 h-full rounded transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-300 w-9 text-right tabular-nums">
                {percent}%
              </span>
            </div>
          )}

          {subMessage && (
            <span className="text-slate-300 text-xs font-medium tracking-wide">
              {subMessage}
            </span>
          )}

          {showSubText && (
            <span className="text-slate-300/90 text-xs leading-relaxed font-medium mt-1 max-w-xs">
              Dependiendo del volumen de información, este proceso puede tardar algunos segundos o incluso minutos.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
