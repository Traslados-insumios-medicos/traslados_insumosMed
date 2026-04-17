import { useGlobalLoadingStore } from '../../store/globalLoadingStore'

export function GlobalLoadingOverlay() {
  const isLoading = useGlobalLoadingStore((s) => s.isLoading)

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/30">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-primary"></div>
    </div>
  )
}
