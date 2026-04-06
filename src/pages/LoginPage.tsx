import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import type { Rol, Usuario } from '../types/models'

const roleCredentials: Record<Rol, { email: string; password: string; label: string; desc: string; icon: string }> = {
  ADMIN: {
    email: 'admin@medlogix.pe',
    password: 'admin123',
    label: 'Administrador',
    desc: 'Gestión global de flota, rutas y facturación',
    icon: 'admin_panel_settings',
  },
  CHOFER: {
    email: 'chofer1@medlogix.pe',
    password: 'chofer123',
    label: 'Chofer',
    desc: 'Gestión de entregas, hojas de ruta y estados',
    icon: 'local_shipping',
  },
  CLIENTE: {
    email: 'cliente@hospitalcentral.pe',
    password: 'cliente123',
    label: 'Cliente',
    desc: 'Seguimiento de pedidos y reportes',
    icon: 'corporate_fare',
  },
}

const roles: Rol[] = ['ADMIN', 'CHOFER', 'CLIENTE']

export function LoginPage() {
  const navigate = useNavigate()
  const { loginAsRole } = useAuthStore()

  const [rol, setRol] = useState<Rol>('ADMIN')
  const [email, setEmail] = useState(roleCredentials.ADMIN.email)
  const [password, setPassword] = useState(roleCredentials.ADMIN.password)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRolChange = (nuevoRol: Rol) => {
    setRol(nuevoRol)
    setEmail(roleCredentials[nuevoRol].email)
    setPassword(roleCredentials[nuevoRol].password)
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data } = await api.post<{ token: string; usuario: Usuario & { rol: Rol } }>(
        '/auth/login',
        { email, password },
      )

      // Guardar token para el interceptor de Axios
      localStorage.setItem('token', data.token)

      // Guardar usuario en el store
      loginAsRole(data.usuario.rol, data.usuario)

      // Redirigir según rol
      if (data.usuario.rol === 'ADMIN') navigate('/admin/dashboard')
      else if (data.usuario.rol === 'CHOFER') navigate('/chofer/rutas')
      else navigate('/cliente/envios')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display dark:bg-background-dark">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 rounded-lg bg-primary p-1.5">
              <span className="material-symbols-outlined text-2xl text-white">local_hospital</span>
            </div>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              MedLogix
            </h1>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            v1.0.5
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-grow items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-4xl">
          <div className="mb-6 text-center sm:mb-10">
            <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Acceso al Sistema
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-lg">
              Seleccioná tu perfil e ingresá tus credenciales
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selector de rol */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {roles.map((r) => {
                const cfg = roleCredentials[r]
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRolChange(r)}
                    className={`flex flex-col items-center rounded-xl border-2 bg-white p-6 text-left shadow-sm transition-all hover:border-primary hover:shadow-xl dark:bg-slate-800 dark:border-slate-600 dark:hover:border-primary sm:p-8 ${
                      rol === r ? 'border-primary shadow-md dark:border-primary' : 'border-transparent'
                    }`}
                  >
                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors sm:mb-6 sm:h-20 sm:w-20 ${
                      rol === r ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      <span className="material-symbols-outlined text-3xl sm:text-4xl">{cfg.icon}</span>
                    </div>
                    <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                      {cfg.label}
                    </h3>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                      {cfg.desc}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Credenciales */}
            <div className="mx-auto max-w-md space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Ingresando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">login</span>
                    Acceder como {roleCredentials[rol].label}
                  </>
                )}
              </button>

              {/* Hint credenciales */}
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10">
                <p className="text-xs font-semibold text-slate-700 dark:text-white">
                  Credenciales de prueba — {roleCredentials[rol].label}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {roleCredentials[rol].email} / {roleCredentials[rol].password}
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 text-xs text-slate-400">
          © 2026 MedLogix Logistics — Entorno de desarrollo
        </div>
      </footer>
    </div>
  )
}
