import { useEffect, useRef, useState } from 'react'
import { getSharedSocket } from '../shared/socket'

interface UseGpsTrackingOptions {
  rutaId: string | null
  choferId: string | null
  choferNombre: string | null
  enabled: boolean
  intervalMs?: number
}

export function useGpsTracking({ rutaId, choferId, choferNombre, enabled, intervalMs = 10000 }: UseGpsTrackingOptions) {
  const [gpsActivo, setGpsActivo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null)

  const enviarPosicion = (lat: number, lng: number) => {
    if (!rutaId || !choferId) return
    const socket = getSharedSocket()
    socket.emit('posicion_chofer', {
      rutaId,
      choferId,
      choferNombre: choferNombre ?? '',
      lat,
      lng,
      timestamp: Date.now(),
    })
  }

  const activar = () => {
    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta GPS.')
      return
    }
    setError(null)

    // Obtener posición inmediata
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        enviarPosicion(pos.coords.latitude, pos.coords.longitude)
        setGpsActivo(true)
      },
      () => setError('No se pudo obtener la ubicación. Verifica los permisos de GPS.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )

    // Enviar cada intervalMs
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          enviarPosicion(pos.coords.latitude, pos.coords.longitude)
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      )
    }, intervalMs)
  }

  const desactivar = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setGpsActivo(false)
  }

  // Limpiar al desmontar
  useEffect(() => {
    return () => { desactivar() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Si se deshabilita desde afuera, desactivar
  useEffect(() => {
    if (!enabled && gpsActivo) desactivar()
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return { gpsActivo, error, activar, desactivar }
}
