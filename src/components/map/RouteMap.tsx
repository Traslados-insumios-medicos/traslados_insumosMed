import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Stop } from '../../types/models'

import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

export interface RouteMapProps {
  stops: Stop[]
  /** Posición actual del camión (opcional). Si se pasa, se muestra marcador en movimiento. */
  currentPosition?: { lat: number; lng: number } | null
  /** ID del stop a resaltar; el mapa hace flyTo a ese marcador. */
  highlightedStopId?: string | null
  /** Incrementar para forzar fitBounds a todos los stops. */
  fitBoundsTrigger?: number
}

const QUITO_CENTER: [number, number] = [-78.47, -0.18] // [lng, lat] for Mapbox

export function RouteMap({ stops, currentPosition, highlightedStopId, fitBoundsTrigger }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const stopMarkersRef = useRef<mapboxgl.Marker[]>([])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center: [number, number] =
      stops.length > 0
        ? [
            stops.reduce((s, x) => s + x.lng, 0) / stops.length,
            stops.reduce((s, x) => s + x.lat, 0) / stops.length,
          ]
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

      // Draw route line
      if (stops.length > 1) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: stops.map((s) => [s.lng, s.lat]),
            },
          },
        })
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#0284c5', 'line-width': 4, 'line-opacity': 0.8 },
        })
      }

      // Add stop markers
      stops.forEach((stop) => {
        const el = document.createElement('div')
        el.style.cssText = `
          background:#0f172a;color:white;width:28px;height:28px;
          border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:12px;font-weight:bold;
          border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);
          cursor:pointer;
        `
        el.textContent = String(stop.orden)

        const popup = new mapboxgl.Popup({ offset: 16 }).setHTML(
          `<strong>Parada ${stop.orden}</strong><br/>${stop.direccion}`,
        )

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map)

        stopMarkersRef.current.push(marker)
      })

      // Fit bounds to all stops
      if (stops.length > 0) {
        const bounds = stops.reduce(
          (b, s) => b.extend([s.lng, s.lat] as [number, number]),
          new mapboxgl.LngLatBounds([stops[0].lng, stops[0].lat], [stops[0].lng, stops[0].lat]),
        )
        map.fitBounds(bounds, { padding: 48, maxZoom: 14 })
      }
    })

    return () => {
      stopMarkersRef.current.forEach((m) => m.remove())
      stopMarkersRef.current = []
      truckMarkerRef.current?.remove()
      truckMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update truck marker when currentPosition changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (currentPosition) {
      const lngLat: [number, number] = [currentPosition.lng, currentPosition.lat]
      if (truckMarkerRef.current) {
        truckMarkerRef.current.setLngLat(lngLat)
      } else {
        const el = document.createElement('div')
        el.style.cssText = `
          background:#0284c5;color:white;width:32px;height:32px;
          border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:18px;
          border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
        `
        el.textContent = '🚚'
        truckMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .setPopup(new mapboxgl.Popup({ offset: 16 }).setText('Posición actual del camión'))
          .addTo(map)
      }
    } else {
      truckMarkerRef.current?.remove()
      truckMarkerRef.current = null
    }
  }, [currentPosition])

  // Fly to highlighted stop
  useEffect(() => {
    const map = mapRef.current
    if (!map || !highlightedStopId) return
    const stop = stops.find((s) => s.id === highlightedStopId)
    if (stop) {
      map.flyTo({ center: [stop.lng, stop.lat], zoom: 15, duration: 500 })
    }
  }, [highlightedStopId, stops])

  // Fit bounds when fitBoundsTrigger changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || stops.length === 0 || fitBoundsTrigger === undefined) return
    const bounds = stops.reduce(
      (b, s) => b.extend([s.lng, s.lat] as [number, number]),
      new mapboxgl.LngLatBounds([stops[0].lng, stops[0].lat], [stops[0].lng, stops[0].lat]),
    )
    map.fitBounds(bounds, { padding: 48, maxZoom: 14 })
  }, [fitBoundsTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

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
