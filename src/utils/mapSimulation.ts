import { useEffect, useState } from 'react'

interface Coordinate {
  lat: number
  lng: number
}

interface UseSimulatedRouteOptions {
  coordinates: Coordinate[]
  intervalMs?: number
}

export function useSimulatedRoute({
  coordinates,
  intervalMs = 3000,
}: UseSimulatedRouteOptions) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (coordinates.length === 0) return

    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % coordinates.length)
    }, intervalMs)

    return () => {
      window.clearInterval(id)
    }
  }, [coordinates, intervalMs])

  return {
    currentPosition: coordinates[index] ?? null,
    currentIndex: index,
  }
}

