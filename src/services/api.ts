import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
})

// Adjunta el JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el backend devuelve 401, limpia sesión y redirige — solo si había token activo
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login')
    const hadToken = !!localStorage.getItem('token')
    if (error.response?.status === 401 && !isLoginEndpoint && hadToken) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
