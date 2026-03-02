import type { ReactNode } from 'react'

interface MapProviderProps {
  children: ReactNode
}

/**
 * En una versión posterior este provider decidirá entre Google Maps,
 * Leaflet o un placeholder según configuración de entorno.
 * Por ahora solo actúa como contenedor neutro.
 */
export function MapProvider({ children }: MapProviderProps) {
  return <>{children}</>
}

