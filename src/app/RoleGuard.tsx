import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: ReactNode
}

export function RoleGuard({ children }: Props) {
  const { currentUser } = useAuthStore()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}

