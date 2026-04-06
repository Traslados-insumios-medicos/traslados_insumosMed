/**
 * FEATURE: user-profile
 * LAYER: ui (componentes del slice)
 *
 * Usa átomos/moléculas de shared/ui. No importa de otros features.
 */
import { useEffect } from 'react'
import { Card, Badge } from '../../../shared/ui'
import { useUserProfileStore } from '../model/userProfile.store'

export function UserProfileCard() {
  const { profile, loading, error, fetchProfile } = useUserProfileStore()

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-red-500">{error}</p>
      </Card>
    )
  }

  if (!profile) return null

  return (
    <Card title="Mi Perfil">
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {profile.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
            {profile.nombre}
          </p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
          <div className="flex items-center gap-2">
            <Badge tone="info">{profile.rol}</Badge>
            {!profile.activo && <Badge tone="warning">Inactivo</Badge>}
          </div>
        </div>
      </div>
    </Card>
  )
}
