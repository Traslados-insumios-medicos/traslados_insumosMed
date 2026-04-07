import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLogisticsStore } from '../store/logisticsStore'
import type { Rol } from '../types/models'

type Modo = 'real' | 'demo'

const roleLabels: Record<Rol, { title: string; desc: string; icon: string }> = {
  ADMIN:   { title: 'Administrador', desc: 'Gestión global de flota, rutas y facturación', icon: 'admin_panel_settings' },
  CHOFER:  { title: 'Chofer',        desc: 'Gestión de entregas, hojas de ruta y estados', icon: 'local_shipping' },
  CLIENTE: { title: 'Cliente',       desc: 'Seguimiento de pedidos y reportes',             icon: 'corporate_fare' },
}

export function LoginPage() {
  const navigate = useNavigate()
  const { loginAsRole, loginWithCredentials } = useAuthStore()
  const { usuarios, clientes, resetDemoData } = useLogisticsStore()

  const [modo, setModo] = useState<Modo>('real')

  // --- Modo real ---
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // --- Modo demo ---
  const [rol, setRol]           = useState<Rol>('ADMIN')
  const [userId, setUserId]     = useState('')
  const [clienteId, setClienteId] = useState('')

  const choferes        = usuarios.filter((u) => u.rol === 'CHOFER')
  const usuariosCliente = usuarios.filter((u) => u.rol === 'CLIENTE')

  // ── Handlers modo real ──────────────────────────────────────
  const handleRealSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { mustChangePassword } = await loginWithCredentials(email, password)
      if (mustChangePassword) {
        navigate('/cambiar-password')
      } else {
        const rol = useAuthStore.getState().currentRole
        if (rol === 'ADMIN')   navigate('/admin/dashboard')
        else if (rol === 'CHOFER')  navigate('/chofer/rutas')
        else navigate('/cliente/envios')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  // ── Handlers modo demo ──────────────────────────────────────
  const handleDemoSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (rol === 'ADMIN') {
      loginAsRole('ADMIN', { id: 'admin-1', nombre: 'Admin Demo', rol: 'ADMIN', activo: true })
      navigate('/admin/dashboard')
      return
    }
    if (rol === 'CHOFER') {
      const selected = choferes.find((u) => u.id === userId) ?? choferes[0]
      if (selected) { loginAsRole('CHOFER', selected); navigate('/chofer/rutas') }
      return
    }
    if (rol === 'CLIENTE') {
      const selected = usuariosCliente.find((u) => u.clienteId === clienteId) ?? usuariosCliente[0]
      if (selected) { loginAsRole('CLIENTE', selected); navigate('/cliente/envios') }
    }
  }

  const handleRolChange = (nuevoRol: Rol) => {
    setRol(nuevoRol)
    if (nuevoRol === 'CHOFER') setUserId(choferes[0]?.id ?? '')
    if (nuevoRol === 'CLIENTE') setClienteId(clientes[0]?.id ?? '')
  }

  const canDemoSubmit =
    rol === 'ADMIN' ||
    (rol === 'CHOFER' && !!userId) ||
    (rol === 'CLIENTE' && usuariosCliente.some((u) => u.clienteId === clienteId))

  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display dark:bg-background-dark">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <span className="material-symbols-outlined text-2xl text-white">local_hospital</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">MedLogix</h1>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            MVP v1.0.4
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-grow items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Acceso al Sistema
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Ingrese sus credenciales para continuar
            </p>
          </div>

          {/* Toggle modo */}
          <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setModo('real')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                modo === 'real'
                  ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Acceso real
            </button>
            <button
              type="button"
              onClick={() => setModo('demo')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                modo === 'demo'
                  ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Demo / Prototipo
            </button>
          </div>

          {/* ── FORMULARIO REAL ── */}
          {modo === 'real' && (
            <form onSubmit={handleRealSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="correo@empresa.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    lock
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Tu contraseña"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 focus:border-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                {loading
                  ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  : <span className="material-symbols-outlined text-sm">login</span>
                }
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          )}

          {/* ── FORMULARIO DEMO ── */}
          {modo === 'demo' && (
            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {(['ADMIN', 'CHOFER', 'CLIENTE'] as Rol[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRolChange(r)}
                    className={`flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
                      rol === r
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-200 bg-white hover:border-primary/50 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${rol === r ? 'text-primary' : 'text-slate-400'}`}>
                      {roleLabels[r].icon}
                    </span>
                    <span className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {roleLabels[r].title}
                    </span>
                  </button>
                ))}
              </div>

              {rol === 'CHOFER' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Seleccionar Chofer
                  </label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    {choferes.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {rol === 'CLIENTE' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Seleccionar Empresa
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 dark:border-primary/20 dark:bg-primary/10">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined shrink-0 text-sm text-primary">info</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modo demostración con datos pre-configurados. No requiere contraseña.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canDemoSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-white hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                Acceder como {roleLabels[rol].title}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-slate-400 md:flex-row md:text-left">
          <span>© 2025 MedLogix Logistics. Todos los derechos reservados.</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => resetDemoData()}
              className="flex items-center gap-1 hover:text-primary"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Reiniciar datos demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
