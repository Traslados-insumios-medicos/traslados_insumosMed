/**
 * FEATURE: user-profile
 * LAYER: model (state management del slice)
 *
 * Feature-Sliced Design: cada feature tiene su propio store local.
 * No mezcla estado de otros slices.
 */
import { create } from 'zustand'
import { apiClient } from '../../../shared/api/client'

export interface UserProfile {
  id: string
  nombre: string
  email: string
  rol: string
  clienteId: string | null
  activo: boolean
}

interface UserProfileState {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  fetchProfile: () => Promise<void>
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
}))
