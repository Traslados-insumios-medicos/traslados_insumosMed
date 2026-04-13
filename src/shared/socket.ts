import { io, Socket } from 'socket.io-client'

let sharedSocket: Socket | null = null
let refCount = 0

export function getSharedSocketId(): string | undefined {
  return sharedSocket?.id
}

export function getSharedSocket(): Socket {
  if (!sharedSocket) {
    const token = localStorage.getItem('token')
    sharedSocket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    })
  }
  return sharedSocket
}

export function acquireSharedSocket(): Socket {
  refCount++
  return getSharedSocket()
}

export function releaseSharedSocket() {
  refCount--
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect()
    sharedSocket = null
    refCount = 0
  }
}
