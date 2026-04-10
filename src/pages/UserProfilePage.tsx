import { UserProfileCard } from '../features/user-profile'

export function UserProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Mi Perfil
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gestiona tu información personal y configuración de seguridad
        </p>
      </div>

      <div className="max-w-2xl">
        <UserProfileCard />
      </div>
    </div>
  )
}
