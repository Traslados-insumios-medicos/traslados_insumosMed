import { create } from 'zustand'

interface GlobalLoadingState {
  isLoading: boolean
  message: string
  show: (message?: string) => void
  hide: () => void
}

export const useGlobalLoadingStore = create<GlobalLoadingState>((set) => ({
  isLoading: false,
  message: '',
  show: (message = 'Procesando...') => set({ isLoading: true, message }),
  hide: () => set({ isLoading: false, message: '' }),
}))
