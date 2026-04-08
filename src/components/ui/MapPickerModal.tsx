import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

const QUITO: [number, number] = [-78.47, -0.18]

interface Coords { lat: number; lng: number }
interface Props {
  initialCoords?: Coords | null
  onConfirm: (address: string, coords: Coords) => void
  onClose: () => void
}

async function reverseGeocode(lng: number, lat: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=es&limit=1`
    )
    const data = await res.json()
    return (data.features?.[0]?.place_name as string) ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

export function MapPickerModal({ initialCoords, onConfirm, onClose }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<Coords | null>(initialCoords ?? null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; place_name: string; center: [number, number] }[]>([])
  const [openSug, setOpenSug] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    const center: [number, number] = initialCoords
      ? [initialCoords.lng, initialCoords.lat]
      : QUITO

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: initialCoords ? 15 : 12,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      if (initialCoords) {
        placeMarker(map, initialCoords.lng, initialCoords.lat)
        reverseGeocode(initialCoords.lng, initialCoords.lat).then(setAddress)
      }
    })

    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat
      placeMarker(map, lng, lat)
      setCoords({ lat, lng })
      const addr = await reverseGeocode(lng, lat)
      setAddress(addr)
      setQuery(addr)
    })

    return () => {
      markerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function placeMarker(map: mapboxgl.Map, lng: number, lat: number) {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      const marker = new mapboxgl.Marker({ color: '#0f172a', draggable: true })
        .setLngLat([lng, lat])
        .addTo(map)
      markerRef.current = marker
      marker.on('dragend', async () => {
        const pos = marker.getLngLat()
        setCoords({ lat: pos.lat, lng: pos.lng })
        const addr = await reverseGeocode(pos.lng, pos.lat)
        setAddress(addr)
        setQuery(addr)
      })
    }
  }

  const handleSearch = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 3) { setSuggestions([]); setOpenSug(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(val)}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5&language=es`
        )
        const data = await res.json()
        setSuggestions(data.features ?? [])
        setOpenSug(true)
      } catch { /* ignore */ }
    }, 300)
  }

  const handleSelectSuggestion = (s: { place_name: string; center: [number, number] }) => {
    const c = { lat: s.center[1], lng: s.center[0] }
    setCoords(c)
    setAddress(s.place_name)
    setQuery(s.place_name)
    setSuggestions([])
    setOpenSug(false)
    const map = mapRef.current
    if (map) {
      map.flyTo({ center: [c.lng, c.lat], zoom: 15, duration: 500 })
      placeMarker(map, c.lng, c.lat)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ height: '560px' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Seleccionar ubicacion</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative border-b border-slate-100 px-4 py-3">
          <span className="material-symbols-outlined absolute left-7 top-1/2 -translate-y-1/2 text-base text-slate-400">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar direccion..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {openSug && suggestions.length > 0 && (
            <div className="absolute left-4 right-4 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => handleSelectSuggestion(s)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-slate-400">location_on</span>
                  <span className="text-slate-700">{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div ref={mapContainerRef} className="flex-1" />

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3">
          {address ? (
            <p className="mb-2 flex items-start gap-1.5 text-xs text-slate-600">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-emerald-500">check_circle</span>
              <span className="line-clamp-2">{address}</span>
            </p>
          ) : (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="material-symbols-outlined text-sm">touch_app</span>
              Haz clic en el mapa o busca una direccion
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!coords}
              onClick={() => coords && onConfirm(address, coords)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-40"
            >
              Confirmar ubicacion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
