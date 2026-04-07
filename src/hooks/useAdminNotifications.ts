import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { api } from '../services/api'

export interface Notificacion {
  id: string
  tipo: string
  descripcion: string
  createdAt: string
  guiaId: string
  guia: { numeroGuia: string }
}

export function useAdminNotifications() {
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [unread, setUnread] = useState(0)
  const socketRef = useRef<Socket | null>(null)

  // Carga inicial desde la API
  useEffect(() => {
    api.get<Notificacion[]>('/novedades')
      .then((r) => setNotifs(r.data.slice(0, 20)))
      .catch(() => {})
  }, [])

  // WebSocket — solo para ADMIN
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('nueva_novedad', (data: { rutaId: string; guiaId: string; tipo: string; descripcion: string }) => {
      const nueva: Notificacion = {
        id: `ws-${Date.now()}`,
        tipo: data.tipo,
        descripcion: data.descripcion,
        createdAt: new Date().toISOString(),
        guiaId: data.guiaId,
        guia: { numeroGuia: data.guiaId.slice(-6) },
      }
      setNotifs((prev) => [nueva, ...prev].slice(0, 20))
      setUnread((n) => n + 1)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const markRead = () => setUnread(0)

  return { notifs, unread, markRead }
}
