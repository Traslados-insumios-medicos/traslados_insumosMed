import { create } from 'zustand'
import type { Rol, Usuario } from '../types/models'

interface AuthState {
  currentUser: Usuario | null
  currentRole: Rol | null
  loginAsRole: (rol: Rol, user: Usuario) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  currentRole: null,
  loginAsRole: (rol, user) =>
    set({
      currentRole: rol,
      currentUser: user,
    }),
  logout: () =>
    set({
      currentRole: null,
      currentUser: null,
    }),
}))

