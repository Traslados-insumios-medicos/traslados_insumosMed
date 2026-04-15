import { type FormEvent, useState, useEffect } from 'react'
import { ModalMotion } from '../../../components/ui/ModalMotion'
import { useUserProfileStore } from '../model/userProfile.store'

interface EditProfileModalProps {
  show: boolean
  onClose: () => void
}

export function EditProfileModal({ show, onClose }: EditProfileModalProps) {
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
  const { profile, updateProfile } = useUserProfileStore()
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [nombreRequiredError, setNombreRequiredError] = useState('')

  useEffect(() => {
    if (profile && show) {
      setNombre(profile.nombre)
      setCedula(profile.cedula ?? '')
      setError('')
      setSuccess(false)
      setNombreRequiredError('')
    }
  }, [profile, show])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setNombreRequiredError(REQUIRED_MESSAGE)
      setError('El nombre es requerido')
      return
    }
    setError('')
    setLoading(true)
    try {
      await updateProfile({ nombre: nombre.trim(), cedula: cedula.trim() || undefined })
      setSuccess(true)
      setTimeout(() => { onClose() }, 1200)
    } catch (err: any) {
      setError(err?.message ?? 'Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalMotion show={show} backdropClassName="bg-black/45" panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl">
      <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">edit</span>
          <h3 className="font-display text-base font-bold text-slate-900">Editar perfil</h3>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre completo</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">person</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                const value = e.target.value
                setNombre(value)
                if (value.trim()) setNombreRequiredError('')
              }}
              onBlur={() => setNombreRequiredError(nombre.trim() ? '' : REQUIRED_MESSAGE)}
              required
              placeholder="Tu nombre completo"
              className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 ${
                nombreRequiredError ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-primary focus:ring-primary/15'
              }`}
            />
          </div>
          {nombreRequiredError && <p className="mt-1 text-xs text-red-500">{nombreRequiredError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Cédula</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">badge</span>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Número de cédula"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-600">Email y rol</span> no se pueden modificar desde aquí.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-600">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Perfil actualizado correctamente
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60">
            Cancelar
          </button>
          <button type="submit" disabled={loading || success}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60">
            {loading
              ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
              : <span className="material-symbols-outlined text-base">save</span>}
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </ModalMotion>
  )
}
