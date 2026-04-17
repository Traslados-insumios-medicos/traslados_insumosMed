import axios from 'axios'
import { getSharedSocketId } from '../shared/socket'
import { useGlobalLoadingStore } from '../store/globalLoadingStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
})

// Contador de peticiones activas
let activeRequests = 0

// Adjunta el JWT y socketId en cada request + muestra loading
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const socketId = getSharedSocketId()
  if (socketId) config.headers['x-socket-id'] = socketId
  
  // Mostrar loading solo si es la primera petición
  activeRequests++
  if (activeRequests === 1) {
    useGlobalLoadingStore.getState().show()
  }
  
  return config
}, (error) => {
  // Si falla el request, decrementar contador
  activeRequests--
  if (activeRequests === 0) {
    useGlobalLoadingStore.getState().hide()
  }
  return Promise.reject(error)
})

// Si el backend devuelve 401, limpia sesión y redirige — solo si había token activo
api.interceptors.response.use(
  (res) => {
    // Ocultar loading cuando termina la petición
    activeRequests--
    if (activeRequests === 0) {
      useGlobalLoadingStore.getState().hide()
    }
    return res
  },
  (error) => {
    // Ocultar loading también en caso de error
    activeRequests--
    if (activeRequests === 0) {
      useGlobalLoadingStore.getState().hide()
    }
    
    const isLoginEndpoint = error.config?.url?.includes('/auth/login')
    const hadToken = !!localStorage.getItem('token')
    const backendMessage = String(error?.response?.data?.message ?? '')
    const isInactive = backendMessage.toLowerCase().includes('inactivo')
    const isSessionExpired = backendMessage.toLowerCase().includes('sesión ha expirado') || 
                             backendMessage.toLowerCase().includes('otra sesión')
    const status = error.response?.status
    
    console.log('🔴 Interceptor de error:', { status, isLoginEndpoint, hadToken, backendMessage, isInactive, isSessionExpired })
    
    if (status === 401 && !isLoginEndpoint && hadToken) {
      console.log('🚪 401 detectado - limpiando sesión y redirigiendo a login')
      
      // Si es por sesión expirada, mostrar mensaje específico
      if (isSessionExpired) {
        sessionStorage.setItem('session_expired_notice', backendMessage || 'Su sesión ha expirado. Otra sesión ha sido iniciada con esta cuenta.')
      }
      
      localStorage.clear()
      window.location.href = '/login'
    }
    if (status === 403 && hadToken && isInactive) {
      console.log('🚫 403 con usuario inactivo - guardando mensaje y redirigiendo')
      sessionStorage.setItem('inactive_access_notice', backendMessage || 'Su acceso está inactivo. Contacte al administrador de la empresa.')
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
