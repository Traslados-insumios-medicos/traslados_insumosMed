import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props { children: ReactNode }

export function AuthGuard({ children }: Props) {
  const { currentUser, sessionLoading } = useAuthStore()
  const location = useLocation()

  // Esperar a que termine la restauración de sesión antes de decidir
  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <p className="text-sm text-slate-500">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
