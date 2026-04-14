import { io, Socket } from 'socket.io-client'

let sharedSocket: Socket | null = null
let refCount = 0

export function getSharedSocketId(): string | undefined {
  return sharedSocket?.id
}

export function getSharedSocket(): Socket {
  if (!sharedSocket) {
    const token = localStorage.getItem('token')
    console.log('🔌 Inicializando socket compartido con token:', token ? 'presente' : 'ausente')
    sharedSocket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    })
    
    sharedSocket.on('connect', () => {
      console.log('✅ Socket compartido conectado:', sharedSocket?.id)
    })
    
    sharedSocket.on('disconnect', () => {
      console.log('❌ Socket compartido desconectado')
    })
    
    sharedSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión del socket:', error.message)
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
