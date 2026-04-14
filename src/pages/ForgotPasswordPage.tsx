import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import logo from '../assets/logo.png'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al enviar el correo'
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
                mark_email_read
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 text-center">
              Revisa tu correo
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              Si el correo <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 mb-6">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-base text-blue-600">info</span>
              <p className="text-xs text-blue-700">
                El enlace expirará en 1 hora. Si no recibes el correo, revisa tu carpeta de spam.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 font-display text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver al inicio de sesión
          </button>
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
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <span className={`text-[10px] ${email.length > 120 ? 'text-amber-500' : 'text-slate-400'}`}>{email.length}/150</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={150}
                  placeholder="correo@empresa.com"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-base">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-base">send</span>
            )}
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
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
