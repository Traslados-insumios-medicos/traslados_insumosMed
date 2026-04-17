import { create } from 'zustand'

interface GlobalLoadingState {
  isLoading: boolean
  show: () => void
  hide: () => void
}

export const useGlobalLoadingStore = create<GlobalLoadingState>((set) => ({
  isLoading: false,
  show: () => set({ isLoading: true }),
  hide: () => set({ isLoading: false }),
}))
