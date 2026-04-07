import { create } from 'zustand'

const STORAGE_KEY = 'theme_dark'

function getInitial(): boolean {
  if (typeof window === 'undefined') return false
  // Migración: limpiar clave vieja que tenía dark=true por defecto
  window.localStorage.removeItem('mvp_theme_dark')
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'true') return true
  return false
}

function applyDark(dark: boolean) {
  if (typeof document === 'undefined') return
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, String(dark))
  } catch {
    // ignore
  }
}

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getInitial()
  applyDark(initial)
  return {
    isDark: initial,
    toggleTheme: () =>
      set((state) => {
        const next = !state.isDark
        applyDark(next)
        return { isDark: next }
      }),
  }
})

// Aplicar tema al cargar el módulo (para /login y primera carga)
if (typeof document !== 'undefined') {
  applyDark(getInitial())
}
