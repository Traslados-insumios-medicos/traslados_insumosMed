import { useEffect, useState } from 'react'
import { useUserProfileStore } from '../features/user-profile'
import { ChangePasswordModal } from '../features/user-profile'

const ROL_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  CHOFER: 'Chofer',
  CLIENTE: 'Cliente',
}

export function UserProfilePage() {
  const { profile, loading, error, fetchProfile } = useUserProfileStore()
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => { fetchProfile() }, [fetchProfile])

  if (loading) {
    return (
      <div className="animate-pulse space-y-8 max-w-2xl">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="h-4 w-56 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100" />)}
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <span className="material-symbols-outlined text-base">error</span>
        {error ?? 'No se pudo cargar el perfil'}
      </div>
    )
  }

  const inicial = profile.nombre.charAt(0).toUpperCase()
  const rolLabel = ROL_LABEL[profile.rol] ?? profile.rol
  const fechaRegistro = new Date(profile.createdAt).toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <div className="space-y-8 max-w-2xl">
        {/* Encabezado de página */}
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Mi Perfil</h1>
          <p className="mt-1 text-sm text-slate-500">Tu información personal y configuración de seguridad</p>
        </div>

        {/* Hero del usuario */}
        <div className="flex items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-3xl font-bold text-primary">
            {inicial}
          </div>
          <div>
            <p className="font-display text-xl font-bold text-slate-900">{profile.nombre}</p>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-[13px]">badge</span>
                {rolLabel}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile.activo ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                <span className="material-symbols-outlined text-[13px]">{profile.activo ? 'check_circle' : 'warning'}</span>
                {profile.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Grid de datos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { icon: 'person', label: 'Nombre completo', value: profile.nombre },
            { icon: 'mail', label: 'Correo electrónico', value: profile.email },
            { icon: 'badge', label: 'Cédula', value: profile.cedula ?? 'No registrada' },
            { icon: 'calendar_today', label: 'Miembro desde', value: fechaRegistro },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[16px] text-slate-400">{icon}</span>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Sección seguridad */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Seguridad</p>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <span className="material-symbols-outlined text-[18px] text-primary">lock</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Contraseña</p>
                <p className="text-xs text-slate-400">Actualiza tu contraseña de acceso</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">lock_reset</span>
              Cambiar
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal show={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}
