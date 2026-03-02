import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Stop } from '../../types/models'

import 'leaflet/dist/leaflet.css'

const truckIcon = L.divIcon({
  className: 'truck-marker',
  html: `<div style="
    background:#0284c5;
    color:white;
    width:32px;
    height:32px;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:18px;
    border:2px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
  ">🚚</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const stopIcon = (orden: number) =>
  L.divIcon({
    className: 'stop-marker',
    html: `<div style="
      background:#0f172a;
      color:white;
      width:28px;
      height:28px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      font-weight:bold;
      border:2px solid white;
      box-shadow:0 2px 4px rgba(0,0,0,0.2);
    ">${orden}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

function FitBounds({
  positions,
  trigger,
}: {
  positions: [number, number][]
  trigger?: number
}) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    const bounds = L.latLngBounds(positions as L.LatLngTuple[])
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
  }, [map, positions, trigger])
  return null
}

function FlyToHighlightedStop({
  stops,
  highlightedStopId,
}: {
  stops: Stop[]
  highlightedStopId?: string | null
}) {
  const map = useMap()
  const position = useMemo(() => {
    if (!highlightedStopId) return null
    const s = stops.find((x) => x.id === highlightedStopId)
    return s ? ([s.lat, s.lng] as [number, number]) : null
  }, [stops, highlightedStopId])
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 0.5 })
  }, [map, position])
  return null
}

export interface RouteMapProps {
  stops: Stop[]
  /** Posición actual simulada del camión (opcional). Si se pasa, se muestra marcador en movimiento. */
  currentPosition?: { lat: number; lng: number } | null
  /** ID del stop a resaltar; el mapa hace flyTo a ese marcador. */
  highlightedStopId?: string | null
  /** Incrementar para forzar fitBounds de toda la ruta (ej. botón "Ver ruta completa"). */
  fitBoundsTrigger?: number
}

const QUITO_CENTER: [number, number] = [-0.18, -78.47]

export function RouteMap({
  stops,
  currentPosition,
  highlightedStopId,
  fitBoundsTrigger = 0,
}: RouteMapProps) {
  const positions = useMemo<[number, number][]>(
    () => stops.map((s) => [s.lat, s.lng] as [number, number]),
    [stops],
  )

  const center = useMemo(() => {
    if (positions.length === 0) return QUITO_CENTER
    const sum = positions.reduce(
      (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
      { lat: 0, lng: 0 },
    )
    return [sum.lat / positions.length, sum.lng / positions.length] as [number, number]
  }, [positions])

  const allPositions = useMemo(() => {
    if (currentPosition && positions.length > 0) {
      return [...positions, [currentPosition.lat, currentPosition.lng] as [number, number]]
    }
    return positions
  }, [positions, currentPosition])

  if (stops.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500">
        <span className="material-symbols-outlined text-4xl">map</span>
        <p className="ml-2 text-sm">Sin paradas para mostrar</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-64 w-full overflow-hidden rounded-xl [&_.leaflet-container]:h-full [&_.leaflet-container]:z-0">
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={allPositions} trigger={fitBoundsTrigger} />

        <Polyline
          positions={positions}
          pathOptions={{ color: '#0284c5', weight: 4, opacity: 0.8 }}
        />

        <FlyToHighlightedStop stops={stops} highlightedStopId={highlightedStopId} />
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stopIcon(stop.orden)}
          >
            <Popup>
              <strong>Parada {stop.orden}</strong>
              <br />
              {stop.direccion}
            </Popup>
          </Marker>
        ))}

        {currentPosition && (
          <Marker
            position={[currentPosition.lat, currentPosition.lng]}
            icon={truckIcon}
          >
            <Popup>Posición actual del camión (simulada)</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
