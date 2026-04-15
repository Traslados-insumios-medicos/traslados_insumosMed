import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import logo from '../assets/logo.png'

export function CambiarPasswordPage() {
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
  const navigate = useNavigate()
  const { changePassword, currentUser, logout } = useAuthStore()
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requiredErrors, setRequiredErrors] = useState({
    passwordActual: '',
    passwordNueva: '',
    confirmacion: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const nextErrors = {
      passwordActual: passwordActual.trim() ? '' : REQUIRED_MESSAGE,
      passwordNueva: passwordNueva.trim() ? '' : REQUIRED_MESSAGE,
      confirmacion: confirmacion.trim() ? '' : REQUIRED_MESSAGE,
    }
    setRequiredErrors(nextErrors)
    if (nextErrors.passwordActual || nextErrors.passwordNueva || nextErrors.confirmacion) return

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
        const rol = useAuthStore.getState().currentRole
        if (rol === 'ADMIN') navigate('/admin/dashboard')
        else if (rol === 'CHOFER') navigate('/chofer/rutas')
        else navigate('/cliente/envios')
      }, 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al cambiar la contraseña'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="LOGISTRANS" className="h-12 w-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-slate-900">Cambiar contraseña</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            {currentUser?.nombre}, por seguridad debes cambiar tu contraseña temporal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) => {
                  const value = e.target.value
                  setPasswordActual(value)
                  if (value.trim()) setRequiredErrors((prev) => ({ ...prev, passwordActual: '' }))
                }}
                onBlur={() => setRequiredErrors((prev) => ({ ...prev, passwordActual: passwordActual.trim() ? '' : REQUIRED_MESSAGE }))}
                required
                placeholder="Tu contraseña actual"
                className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 ${
                  requiredErrors.passwordActual ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-primary focus:ring-primary/15'
                }`}
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
            {requiredErrors.passwordActual && <p className="mt-1 text-xs text-red-500">{requiredErrors.passwordActual}</p>}
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
                onChange={(e) => {
                  const value = e.target.value
                  setPasswordNueva(value)
                  if (value.trim()) setRequiredErrors((prev) => ({ ...prev, passwordNueva: '' }))
                }}
                onBlur={() => setRequiredErrors((prev) => ({ ...prev, passwordNueva: passwordNueva.trim() ? '' : REQUIRED_MESSAGE }))}
                required
                placeholder="Mínimo 6 caracteres"
                className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 ${
                  requiredErrors.passwordNueva ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-primary focus:ring-primary/15'
                }`}
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
            {requiredErrors.passwordNueva && <p className="mt-1 text-xs text-red-500">{requiredErrors.passwordNueva}</p>}
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
                onChange={(e) => {
                  const value = e.target.value
                  setConfirmacion(value)
                  if (value.trim()) setRequiredErrors((prev) => ({ ...prev, confirmacion: '' }))
                }}
                onBlur={() => setRequiredErrors((prev) => ({ ...prev, confirmacion: confirmacion.trim() ? '' : REQUIRED_MESSAGE }))}
                required
                placeholder="Repite la nueva contraseña"
                className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 ${
                  requiredErrors.confirmacion ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-primary focus:ring-primary/15'
                }`}
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
            {requiredErrors.confirmacion && <p className="mt-1 text-xs text-red-500">{requiredErrors.confirmacion}</p>}
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
              Contraseña cambiada exitosamente. Redirigiendo...
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 font-display text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">close</span>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-base">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-base">save</span>
              )}
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-base text-blue-600">info</span>
            <div className="flex-1 text-xs text-blue-700">
              <p className="font-semibold mb-1">Requisitos de seguridad:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Mínimo 6 caracteres</li>
                <li>Usa una combinación de letras, números y símbolos</li>
                <li>No uses contraseñas fáciles de adivinar</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
