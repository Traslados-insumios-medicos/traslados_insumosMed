import { useEffect, useState } from 'react'
import { useUserProfileStore } from '../model/userProfile.store'
import { ChangePasswordModal } from './ChangePasswordModal'
import { EditProfileModal } from './EditProfileModal'

const ROL_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  CHOFER: 'Chofer',
  CLIENTE: 'Cliente',
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <span className="material-symbols-outlined text-[17px] text-slate-500">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  )
}

export function UserProfileCard() {
  const { profile, loading, error, fetchProfile } = useUserProfileStore()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => { fetchProfile() }, [fetchProfile])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-slate-200" />
        <div className="p-6 animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-36 rounded bg-slate-200" />
              <div className="h-3 w-48 rounded bg-slate-200" />
              <div className="h-5 w-16 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-slate-100" />)}
          </div>
          <div className="flex gap-3">
            <div className="h-10 flex-1 rounded-lg bg-slate-200" />
            <div className="h-10 flex-1 rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      </div>
    )
  }

  if (!profile) return null

  const inicial = profile.nombre.charAt(0).toUpperCase()
  const rolLabel = ROL_LABEL[profile.rol] ?? profile.rol
  const fechaRegistro = new Date(profile.createdAt).toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Acento superior */}
        <div className="h-2 bg-primary" />

        <div className="p-6 space-y-5">
          {/* Avatar + nombre + rol */}
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-2xl font-bold text-primary">
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-slate-900 truncate">{profile.nombre}</p>
              <p className="text-sm text-slate-500 truncate">{profile.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
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

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Datos del perfil */}
          <div className="divide-y divide-slate-100">
            <InfoRow icon="person" label="Nombre completo" value={profile.nombre} />
            <InfoRow icon="mail" label="Correo electrónico" value={profile.email} />
            <InfoRow icon="badge" label="Cédula" value={profile.cedula ?? 'No registrada'} />
            <InfoRow icon="calendar_today" label="Miembro desde" value={fechaRegistro} />
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Editar perfil
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">lock_reset</span>
              Cambiar contraseña
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal show={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <EditProfileModal show={showEditModal} onClose={() => setShowEditModal(false)} />
    </>
  )
}
