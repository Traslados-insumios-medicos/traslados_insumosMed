import { type FormEvent, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import logo from '../assets/logo.png'

export function ResetPasswordPage() {
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requiredErrors, setRequiredErrors] = useState({ passwordNueva: '', confirmacion: '' })

  useEffect(() => {
    if (!token) {
      setError('Token inválido o faltante')
    }
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const nextErrors = {
      passwordNueva: passwordNueva.trim() ? '' : REQUIRED_MESSAGE,
      confirmacion: confirmacion.trim() ? '' : REQUIRED_MESSAGE,
    }
    setRequiredErrors(nextErrors)
    if (nextErrors.passwordNueva || nextErrors.confirmacion) return

    if (!token) {
      setError('Token inválido')
      return
    }

    if (passwordNueva !== confirmacion) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (passwordNueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        passwordNueva,
        confirmacion,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al restablecer la contraseña'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center">
            <img src={logo} alt="LOGISTRANS" className="h-12 w-auto mb-4" />
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <span className="material-symbols-outlined text-3xl text-green-600">
                check_circle
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 text-center">
              Contraseña restablecida
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              Tu contraseña ha sido actualizada exitosamente. Redirigiendo al inicio de sesión...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="LOGISTRANS" className="h-12 w-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Restablecer contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-base text-blue-600">info</span>
              <div className="flex-1 text-xs text-blue-700">
                <p className="font-semibold mb-1">Requisitos de seguridad:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Mínimo 6 caracteres</li>
                  <li>Usa una combinación de letras, números y símbolos</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-base">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            {loading ? 'Guardando...' : 'Restablecer contraseña'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 font-display text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver al inicio de sesión
          </button>
        </form>
      </div>
    </div>
  )
}
