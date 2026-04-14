import axios from 'axios'
import { getSharedSocketId } from '../shared/socket'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
})

// Adjunta el JWT y socketId en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const socketId = getSharedSocketId()
  if (socketId) config.headers['x-socket-id'] = socketId
  return config
})

// Si el backend devuelve 401, limpia sesión y redirige — solo si había token activo
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login')
    const hadToken = !!localStorage.getItem('token')
    const backendMessage = String(error?.response?.data?.message ?? '')
    const isInactive = backendMessage.toLowerCase().includes('inactivo')
    if (error.response?.status === 401 && !isLoginEndpoint && hadToken) {
      localStorage.clear()
      window.location.href = '/login'
    }
    if (error.response?.status === 403 && hadToken && isInactive) {
      sessionStorage.setItem('inactive_access_notice', backendMessage || 'Su acceso está inactivo. Contacte al administrador de la empresa.')
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
