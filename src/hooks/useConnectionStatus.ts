import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type InternetStatus = 'online' | 'offline'
export type SocketStatus = 'connected' | 'reconnecting' | 'disconnected'

export interface ConnectionStatus {
  internet: InternetStatus
  socket: SocketStatus
  lastSync: number | null
}

export function useConnectionStatus(
  enabled: boolean,
  onLastSync?: (ts: number) => void,
): {
  status: ConnectionStatus
  socketRef: React.MutableRefObject<Socket | null>
} {
  const [internet, setInternet] = useState<InternetStatus>(
    navigator.onLine ? 'online' : 'offline',
  )
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const onOnline = () => setInternet('online')
    const onOffline = () => setInternet('offline')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    })

    socketRef.current = socket

    socket.on('connect', () => setSocketStatus('connected'))
    socket.on('disconnect', () => setSocketStatus('disconnected'))
    socket.on('reconnect_attempt', () => setSocketStatus('reconnecting'))
    socket.on('reconnect', () => setSocketStatus('connected'))
    socket.on('connect_error', () => setSocketStatus('disconnected'))

    return () => {
      socket.disconnect()
      socketRef.current = null
      setSocketStatus('disconnected')
    }
  }, [enabled])

  const recordSync = (ts: number) => {
    setLastSync(ts)
    onLastSync?.(ts)
  }

  return {
    status: { internet, socket: socketStatus, lastSync },
    socketRef,
  }
}
