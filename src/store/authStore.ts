import { create } from 'zustand'
import type { Rol, Usuario } from '../types/models'
import { api } from '../services/api'

interface AuthState {
  currentUser: Usuario | null
  currentRole: Rol | null
  mustChangePassword: boolean
  loading: boolean
  sessionLoading: boolean
  isDemo: boolean
  // Prototipo: login simulado por rol
  loginAsRole: (rol: Rol, user: Usuario) => void
  // Producción: login real con email + password
  loginWithCredentials: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>
  changePassword: (passwordActual: string, passwordNueva: string, confirmacion: string) => Promise<void>
  restoreSession: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  currentRole: null,
  mustChangePassword: false,
  loading: false,
  // Empieza en true si hay token para evitar flash de redirect al login
  sessionLoading: typeof window !== 'undefined' && !!localStorage.getItem('token'),
  isDemo: false,

  // Mantiene el login simulado del prototipo
  loginAsRole: (rol, user) => set({ currentRole: rol, currentUser: user, mustChangePassword: false, isDemo: true }),

  loginWithCredentials: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      const usuario: Usuario = { ...data.usuario, activo: true }
      set({
        currentUser: usuario,
        currentRole: data.usuario.rol,
        mustChangePassword: !!data.mustChangePassword,
        isDemo: false,
        loading: false,
      })
      return { mustChangePassword: !!data.mustChangePassword }
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  changePassword: async (passwordActual, passwordNueva, confirmacion) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/change-password', {
        passwordActual,
        passwordNueva,
        confirmacion,
      })
      localStorage.setItem('token', data.token)
      set({ mustChangePassword: false, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  restoreSession: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    set({ sessionLoading: true })
    try {
      const { data } = await api.get('/auth/me')
      const usuario: Usuario = { ...data, activo: true }
      set({
        currentUser: usuario,
        currentRole: data.rol,
        mustChangePassword: !!data.mustChangePassword,
        sessionLoading: false,
      })
    } catch {
      localStorage.removeItem('token')
      set({ sessionLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ currentUser: null, currentRole: null, mustChangePassword: false })
  },
}))
