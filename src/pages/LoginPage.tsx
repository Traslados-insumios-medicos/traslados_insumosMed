import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import logo from '../assets/logo.png'

export function LoginPage() {
  const navigate = useNavigate()
  const { loginWithCredentials } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { mustChangePassword } = await loginWithCredentials(email, password)
      if (mustChangePassword) { navigate('/cambiar-password'); return }
      const rol = useAuthStore.getState().currentRole
      if (rol === 'ADMIN') navigate('/admin/dashboard')
      else if (rol === 'CHOFER') navigate('/chofer/rutas')
      else navigate('/cliente/envios')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen font-body">
      {/* Left panel */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between overflow-hidden bg-primary px-12 py-10">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        {/* Decorative circle */}
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/5" />
        <div className="absolute -top-20 -left-20 size-72 rounded-full bg-white/5" />

        <div className="relative">
          <img src={logo} alt="LOGISTRANS" className="h-10 w-auto brightness-0 invert" />
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight text-white">
              LOGISTRANS<br />S.A.
            </h1>
            <p className="mt-2 text-lg font-light text-blue-200">Servicio de Transporte</p>
          </div>

          <div className="h-px w-16 bg-accent" />

          <div className="space-y-3">
            {[
              { icon: 'local_shipping', text: 'Gestión de rutas y choferes' },
              { icon: 'inventory_2', text: 'Control de envíos en tiempo real' },
              { icon: 'analytics', text: 'Reportes y estadísticas' },
              { icon: 'location_on', text: 'Seguimiento GPS en vivo' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-base text-white">{f.icon}</span>
                </div>
                <span className="text-sm text-blue-100">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-blue-300">© 2025 LOGISTRANS S.A. Todos los derechos reservados.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-bg px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <img src={logo} alt="LOGISTRANS" className="h-12 w-auto mb-2" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Servicio de Transporte</p>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="mt-1 text-sm text-slate-500">Ingrese sus credenciales para acceder al sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">mail</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="correo@empresa.com"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">lock</span>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Tu contraseña"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-[18px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60">
              {loading
                ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                : <span className="material-symbols-outlined text-base">login</span>}
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
