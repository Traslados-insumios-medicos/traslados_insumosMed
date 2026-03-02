import type { Stop } from '../../types/models'

interface RouteMapProps {
  stops: Stop[]
}

/**
 * Placeholder visual de mapa.
 * En una iteración posterior se conectará con Google Maps / Leaflet.
 */
export function RouteMap({ stops }: RouteMapProps) {
  return (
    <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-800">
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800/80">
        <span className="material-symbols-outlined text-4xl text-primary drop-shadow-md">
          local_shipping
        </span>
      </div>
      <div className="absolute bottom-8 left-12">
        <span className="material-symbols-outlined text-2xl text-emerald-500">check_circle</span>
      </div>
      <div className="absolute right-20 top-10">
        <span className="material-symbols-outlined text-2xl text-red-500">location_on</span>
      </div>
      <button
        type="button"
        className="absolute bottom-3 right-3 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
          my_location
        </span>
      </button>
    </div>
  )
}

