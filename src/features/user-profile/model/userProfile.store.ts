import { create } from 'zustand'
import { apiClient } from '../../../shared/api/client'

export interface UserProfile {
  id: string
  nombre: string
  cedula: string | null
  email: string
  rol: string
  clienteId: string | null
  activo: boolean
  createdAt: string
}

interface UserProfileState {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
  updateProfile: (data: { nombre: string; cedula?: string }) => Promise<void>
}

export const useUserProfileStore = create<UserProfileState>((set) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null })
    try {
      const profile = await apiClient.get<UserProfile>('/auth/me')
      set({ profile, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  updateProfile: async (data) => {
    const updated = await apiClient.patch<UserProfile>('/auth/me', data)
    set({ profile: updated })
  },
}))
