import { create } from 'zustand'

interface GlobalLoadingState {
  isLoading: boolean
  message: string | null
  subMessage: string | null
  step: string | null
  percent: number | null
  showSubText: boolean
  show: (message?: string, showSubText?: boolean) => void
  hide: () => void
  setMessage: (message: string | null) => void
  setShowSubText: (val: boolean) => void
  setProgress: (data: {
    message?: string | null
    subMessage?: string | null
    step?: string | null
    percent?: number | null
  }) => void
}

export const useGlobalLoadingStore = create<GlobalLoadingState>((set) => ({
  isLoading: false,
  message: null,
  subMessage: null,
  step: null,
  percent: null,
  showSubText: false,
  show: (message, showSubText) =>
    set({
      isLoading: true,
      message: message || null,
      subMessage: null,
      step: null,
      percent: null,
      showSubText: showSubText || false,
    }),
  hide: () =>
    set({
      isLoading: false,
      message: null,
      subMessage: null,
      step: null,
      percent: null,
      showSubText: false,
    }),
  setMessage: (message) => set({ message }),
  setShowSubText: (val) => set({ showSubText: val }),
  setProgress: (data) =>
    set((state) => ({
      message: data.message !== undefined ? data.message : state.message,
      subMessage: data.subMessage !== undefined ? data.subMessage : state.subMessage,
      step: data.step !== undefined ? data.step : state.step,
      percent: data.percent !== undefined ? data.percent : state.percent,
    })),
}))
