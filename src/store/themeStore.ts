import { create } from 'zustand'

const STORAGE_KEY = 'theme_dark'

function getInitial(): boolean {
  if (typeof window === 'undefined') return false
  // Limpiar claves viejas
  window.localStorage.removeItem('mvp_theme_dark')
  // Reset de versión: si no tiene v2, limpiar preferencia anterior y arrancar en claro
  if (!window.localStorage.getItem('theme_v2')) {
    window.localStorage.removeItem('theme_dark')
    window.localStorage.setItem('theme_v2', '1')
    return false
  }
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
// Limpia la clave vieja que podría tener dark=true de versiones anteriores
if (typeof window !== 'undefined') {
  window.localStorage.removeItem('mvp_theme_dark')
  applyDark(getInitial())
}
