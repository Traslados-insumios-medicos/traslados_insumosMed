import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: ReactNode
}

/**
 * Requires the user to be authenticated but does NOT enforce mustChangePassword.
 * Used for routes like /cambiar-password that need auth but are accessible
 * even when mustChangePassword is true.
 */
export function AuthGuard({ children }: Props) {
  const { currentUser } = useAuthStore()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
