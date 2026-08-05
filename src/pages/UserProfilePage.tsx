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
      <div className="w-full animate-pulse space-y-8">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-4 w-48 rounded bg-slate-200" />
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
            {[1,2,3,4].map(i => <div key={i} className="w-[160px] h-20 rounded-xl bg-slate-100" />)}
          </div>
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
      <div className="w-full space-y-8">
        {/* Encabezado de página */}
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Mi Perfil</h1>
          <p className="mt-1 text-sm text-slate-500">Tu información personal y configuración de seguridad</p>
        </div>

        {/* Hero del usuario */}
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-2xl font-bold text-primary">
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-slate-900 truncate">{profile.nombre}</p>
            <p className="text-sm text-slate-500 truncate">{profile.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-[12px]">badge</span>
                {rolLabel}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile.activo ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                <span className="material-symbols-outlined text-[12px]">{profile.activo ? 'check_circle' : 'warning'}</span>
                {profile.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Grid de datos - scroll horizontal en móvil */}
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <div className="flex gap-3 min-w-max">
            {[
              { icon: 'person', label: 'Nombre completo', value: profile.nombre },
              { icon: 'mail', label: 'Correo electrónico', value: profile.email },
              { icon: 'badge', label: 'Cédula', value: profile.cedula ?? 'No registrada' },
              { icon: 'calendar_today', label: 'Miembro desde', value: fechaRegistro },
            ].map(({ icon, label, value }) => (
              <div key={label} className="w-[160px] shrink-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[15px] text-slate-400">{icon}</span>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sección seguridad */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Seguridad</p>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <span className="material-symbols-outlined text-[20px] text-primary">lock</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">Contraseña</p>
                <p className="text-xs text-slate-500">Actualiza tu contraseña de acceso</p>
              </div>
            </div>
            <div className="p-3">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-4 py-3 font-display text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-hover hover:shadow-lg active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                <span>Cambiar contraseña</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal show={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </>
  )
}
