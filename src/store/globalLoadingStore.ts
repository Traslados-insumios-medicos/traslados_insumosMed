import { create } from 'zustand'

interface GlobalLoadingState {
  isLoading: boolean
  message: string | null
  showSubText: boolean
  show: (message?: string, showSubText?: boolean) => void
  hide: () => void
  setMessage: (message: string | null) => void
  setShowSubText: (val: boolean) => void
}

export const useGlobalLoadingStore = create<GlobalLoadingState>((set) => ({
  isLoading: false,
  message: null,
  showSubText: false,
  show: (message, showSubText) => set({ isLoading: true, message: message || null, showSubText: showSubText || false }),
  hide: () => set({ isLoading: false, message: null, showSubText: false }),
  setMessage: (message) => set({ message }),
  setShowSubText: (val) => set({ showSubText: val }),
}))
