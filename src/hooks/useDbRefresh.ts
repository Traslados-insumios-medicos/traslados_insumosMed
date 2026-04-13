import { useEffect, useRef } from 'react'
import { acquireSharedSocket, releaseSharedSocket, getSharedSocketId } from '../shared/socket'

type Entity = 'clientes' | 'choferes' | 'rutas' | 'usuarios'

export { getSharedSocketId }

/**
 * Escucha `db:refresh` y llama al callback inmediatamente.
 * Ignora eventos originados por esta misma sesión.
 */
export function useDbRefresh(entity: Entity, onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = acquireSharedSocket()

    const handler = (data: { entity: Entity; sourceSocketId?: string }) => {
      if (data.entity !== entity) return
      if (data.sourceSocketId && data.sourceSocketId === socket.id) return
      onRefreshRef.current()
    }

    socket.on('db:refresh', handler)

    return () => {
      socket.off('db:refresh', handler)
      releaseSharedSocket()
    }
  }, [entity])
}
