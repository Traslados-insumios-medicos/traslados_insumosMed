/**
 * FEATURE: user-profile
 * LAYER: ui (componentes del slice)
 *
 * Modal para cambiar contraseña desde el perfil de usuario
 */
import { type FormEvent, useState } from 'react'
import { ModalMotion } from '../../../components/ui/ModalMotion'
import { useAuthStore } from '../../../store/authStore'

interface ChangePasswordModalProps {
  show: boolean
  onClose: () => void
}

export function ChangePasswordModal({ show, onClose }: ChangePasswordModalProps) {
  const { changePassword } = useAuthStore()
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (passwordNueva !== confirmacion) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }

    if (passwordNueva.length < 6) {
      setError('La contraseña nueva debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await changePassword(passwordActual, passwordNueva, confirmacion)
      setSuccess(true)
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al cambiar la contraseña'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPasswordActual('')
    setPasswordNueva('')
    setConfirmacion('')
    setError('')
    setSuccess(false)
    setShowCurrentPass(false)
    setShowNewPass(false)
    setShowConfirmPass(false)
    onClose()
  }

  return (
    <ModalMotion
      show={show}
      backdropClassName="bg-black/45"
      panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl"
    >
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Cambiar contraseña</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Contraseña actual
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              lock
            </span>
            <input
              type={showCurrentPass ? 'text' : 'password'}
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              required
              placeholder="Tu contraseña actual"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showCurrentPass ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Nueva contraseña
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              lock_reset
            </span>
            <input
              type={showNewPass ? 'text' : 'password'}
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              required
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            <button
              type="button"
              onClick={() => setShowNewPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showNewPass ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Confirmar nueva contraseña
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              check_circle
            </span>
            <input
              type={showConfirmPass ? 'text' : 'password'}
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              required
              placeholder="Repite la nueva contraseña"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showConfirmPass ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
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
            Contraseña cambiada exitosamente
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-sm text-blue-600">info</span>
            <p className="text-xs text-blue-700">
              La contraseña debe tener al menos 6 caracteres
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || success}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-base">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </ModalMotion>
  )
}
