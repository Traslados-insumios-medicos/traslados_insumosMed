import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Stop } from '../../types/models'

import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

export interface RouteMapProps {
  stops: Stop[]
  /** Posición actual del camión / chofer (GPS). */
  currentPosition?: { lat: number; lng: number } | null
  highlightedStopId?: string | null
  fitBoundsTrigger?: number
  /**
   * Si hay GPS: la línea azul sigue calles desde tu posición hacia las paradas pendientes.
   * Las paradas completadas no entran en la polyline.
   */
  trazarRutaDesdeMiPosicion?: boolean
}

const QUITO_CENTER: [number, number] = [-78.47, -0.18]

async function getRouteCoordinates(points: [number, number][]): Promise<[number, number][]> {
  if (points.length < 2) return []
  const fallback = points
  if (!mapboxgl.accessToken) return fallback

  try {
    const coords = points.map((p) => `${p[0]},${p[1]}`).join(';')
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
    const res = await fetch(url)
    if (!res.ok) return fallback
    const data = (await res.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>
    }
    const routeCoords = data.routes?.[0]?.geometry?.coordinates
    return routeCoords?.length ? routeCoords : fallback
  } catch {
    return fallback
  }
}

function sortStops(stops: Stop[]) {
  return [...stops].sort((a, b) => a.orden - b.orden)
}

export function RouteMap({
  stops,
  currentPosition,
  highlightedStopId,
  fitBoundsTrigger,
  trazarRutaDesdeMiPosicion = false,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const stopMarkersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const stopsSignature = useMemo(
    () =>
      sortStops(stops)
        .map((s) => `${s.id}:${s.completada ? '1' : '0'}:${s.lat}:${s.lng}:${s.orden}`)
        .join('|'),
    [stops],
  )

  const posKey =
    currentPosition == null ? '' : `${currentPosition.lat.toFixed(5)},${currentPosition.lng.toFixed(5)}`

  // Crear mapa una vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    try {
      const sorted = sortStops(stops)
      const center: [number, number] =
        sorted.length > 0
          ? [sorted.reduce((s, x) => s + x.lng, 0) / sorted.length, sorted.reduce((s, x) => s + x.lat, 0) / sorted.length]
          : QUITO_CENTER

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 12,
      })
      mapRef.current = map

      map.on('load', () => {
        map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right')
        map.addControl(new mapboxgl.FullscreenControl(), 'top-right')
        setMapLoaded(true)
      })

      map.on('error', (e) => {
        console.error('Mapbox error:', e)
        setMapError('Error al cargar el mapa. WebGL puede no estar disponible en tu navegador.')
      })

      return () => {
        stopMarkersRef.current.forEach((m) => m.remove())
        stopMarkersRef.current = []
        truckMarkerRef.current?.remove()
        truckMarkerRef.current = null
        map.remove()
        mapRef.current = null
        setMapLoaded(false)
      }
    } catch (error) {
      console.error('Error initializing map:', error)
      setMapError('No se pudo inicializar el mapa. WebGL no está disponible en tu navegador.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ruta por calles + marcadores de paradas (se actualiza al completar entregas o mover GPS)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !map.isStyleLoaded()) return

    let cancelled = false

    ;(async () => {
      const sortedAll = sortStops(stops)
      const pendientes = sortedAll.filter((s) => !s.completada)

      let routePoints: [number, number][] = []
      if (pendientes.length === 0) {
        routePoints = []
      } else if (trazarRutaDesdeMiPosicion && currentPosition) {
        routePoints.push([currentPosition.lng, currentPosition.lat])
        pendientes.forEach((s) => routePoints.push([s.lng, s.lat]))
      } else if (pendientes.length >= 2) {
        routePoints = pendientes.map((s) => [s.lng, s.lat])
      }

      const coords = routePoints.length >= 2 ? await getRouteCoordinates(routePoints) : []

      if (cancelled) return

      const routeFeature = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: coords.length >= 2 ? coords : [],
        },
      }

      const srcId = 'route'
      if (coords.length >= 2) {
        if (map.getSource(srcId)) {
          ;(map.getSource(srcId) as mapboxgl.GeoJSONSource).setData(routeFeature)
        } else {
          map.addSource(srcId, { type: 'geojson', data: routeFeature })
          map.addLayer({
            id: 'route',
            type: 'line',
            source: srcId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#0284c7', 'line-width': 4, 'line-opacity': 0.85 },
          })
        }
        if (map.getLayer('route')) {
          map.setLayoutProperty('route', 'visibility', 'visible')
          map.setPaintProperty('route', 'line-opacity', 0.85)
        }
      } else if (map.getLayer('route')) {
        map.setLayoutProperty('route', 'visibility', 'none')
      }

      stopMarkersRef.current.forEach((m) => m.remove())
      stopMarkersRef.current = []

      sortedAll.forEach((stop) => {
        const done = Boolean(stop.completada)
        const el = document.createElement('div')
        el.style.cssText = done
          ? `
          opacity:0.85;
          background:#16a34a;color:white;width:28px;height:28px;
          border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:14px;font-weight:bold;
          border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.15);
          cursor:pointer;
        `
          : `
          background:#0f172a;color:white;width:28px;height:28px;
          border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:12px;font-weight:bold;
          border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);
          cursor:pointer;
        `
        el.textContent = done ? '✓' : String(stop.orden)

        const estadoTxt = done ? 'Completada' : 'Pendiente'
        const popup = new mapboxgl.Popup({ offset: 16 }).setHTML(
          `<strong>Parada ${stop.orden}</strong> (${estadoTxt})<br/>${stop.direccion}`,
        )

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map)

        stopMarkersRef.current.push(marker)
      })
    })()

    return () => {
      cancelled = true
    }
    // stopsSignature condensa cambios en paradas (incl. completada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, stopsSignature, posKey, trazarRutaDesdeMiPosicion])

  // Marcador del vehículo / chofer
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (currentPosition) {
      const lngLat: [number, number] = [currentPosition.lng, currentPosition.lat]
      if (truckMarkerRef.current) {
        truckMarkerRef.current.setLngLat(lngLat)
      } else {
        const el = document.createElement('div')
        el.style.cssText = `
          background:#0284c7;color:white;width:32px;height:32px;
          border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:18px;
          border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
        `
        el.innerHTML =
          '<span class="material-symbols-outlined" style="font-size:20px;line-height:1">local_shipping</span>'
        truckMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .setPopup(new mapboxgl.Popup({ offset: 16 }).setText('Tu ubicación'))
          .addTo(map)
      }
    } else {
      truckMarkerRef.current?.remove()
      truckMarkerRef.current = null
    }
  }, [currentPosition, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !highlightedStopId) return
    const stop = stops.find((s) => s.id === highlightedStopId)
    if (stop) {
      map.flyTo({ center: [stop.lng, stop.lat], zoom: 15, duration: 500 })
    }
  }, [highlightedStopId, stops, mapLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || stops.length === 0 || fitBoundsTrigger === undefined) return
    const sorted = sortStops(stops)
    const bounds = sorted.reduce(
      (b, s) => b.extend([s.lng, s.lat] as [number, number]),
      new mapboxgl.LngLatBounds([sorted[0].lng, sorted[0].lat], [sorted[0].lng, sorted[0].lat]),
    )
    if (currentPosition) bounds.extend([currentPosition.lng, currentPosition.lat])
    map.fitBounds(bounds, { padding: 48, maxZoom: 14 })
  }, [fitBoundsTrigger, mapLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  if (mapError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <span className="material-symbols-outlined text-5xl text-amber-600">warning</span>
        <p className="mt-3 text-sm font-semibold text-amber-900">Mapa no disponible</p>
        <p className="mt-1 text-xs text-amber-700">{mapError}</p>
        <p className="mt-2 text-xs text-amber-600">
          Intenta usar un navegador moderno como Chrome, Firefox o Edge.
        </p>
      </div>
    )
  }

  if (stops.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 text-slate-500">
        <span className="material-symbols-outlined text-4xl">map</span>
        <p className="ml-2 text-sm">Sin paradas para mostrar</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-64 w-full overflow-hidden rounded-xl">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
