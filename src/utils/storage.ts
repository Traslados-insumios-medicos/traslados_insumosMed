import type { AppPersistedState } from '../types/models'
import { LOCAL_STORAGE_KEY } from './constants'

export function loadState(seed: AppPersistedState): AppPersistedState {
  if (typeof window === 'undefined') return seed

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return seed
    const parsed = JSON.parse(raw) as Partial<AppPersistedState>
    return { ...seed, ...parsed }
  } catch {
    return seed
  }
}

export function saveState(state: AppPersistedState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function resetState(seed: AppPersistedState): AppPersistedState {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch {
      // ignore
    }
    saveState(seed)
  }
  return seed
}

