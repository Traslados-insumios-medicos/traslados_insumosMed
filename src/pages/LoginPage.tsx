import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLogisticsStore } from '../store/logisticsStore'
import type { Rol, Usuario } from '../types/models'

const roles: Rol[] = ['ADMIN', 'CHOFER', 'CLIENTE']

const roleLabels: Record<Rol, { title: string; desc: string; icon: string }> = {
  ADMIN: {
    title: 'Administrador',
    desc: 'Gestión global de flota, rutas y facturación',
    icon: 'admin_panel_settings',
  },
  CHOFER: {
    title: 'Chofer',
    desc: 'Gestión de entregas, hojas de ruta y estados',
    icon: 'local_shipping',
  },
  CLIENTE: {
    title: 'Cliente',
    desc: 'Seguimiento de pedidos y reportes',
    icon: 'corporate_fare',
  },
}

export function LoginPage() {
  const navigate = useNavigate()
  const { loginAsRole } = useAuthStore()
  const { usuarios, clientes, resetDemoData } = useLogisticsStore()

  const [rol, setRol] = useState<Rol>('ADMIN')
  const [userId, setUserId] = useState<string>('')
  const [clienteId, setClienteId] = useState<string>('')

  const choferes = usuarios.filter((u) => u.rol === 'CHOFER')
  const usuariosCliente = usuarios.filter((u) => u.rol === 'CLIENTE')

  const usuariosPorRol: Record<Rol, Usuario[]> = {
    ADMIN: [],
    CHOFER: choferes,
    CLIENTE: usuariosCliente,
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (rol === 'ADMIN') {
      const fakeAdmin: Usuario = {
        id: 'admin-1',
        nombre: 'Admin Demo',
        rol: 'ADMIN',
        activo: true,
      }
      loginAsRole('ADMIN', fakeAdmin)
      navigate('/admin/dashboard')
      return
    }

    if (rol === 'CLIENTE' && clienteId) {
      const selected = usuariosCliente.find((u) => u.clienteId === clienteId) ?? usuariosCliente[0]
      if (selected) {
        loginAsRole('CLIENTE', selected)
        navigate('/cliente/envios')
      }
      return
    }

    if (rol === 'CHOFER') {
      const selected = choferes.find((u) => u.id === userId) ?? choferes[0]
      if (selected) {
        loginAsRole('CHOFER', selected)
        navigate('/chofer/rutas')
      }
      return
    }
  }

  const handleRolChange = (nuevoRol: Rol) => {
    setRol(nuevoRol)
    const lista = usuariosPorRol[nuevoRol]
    setUserId(lista[0]?.id ?? '')
    if (nuevoRol === 'CLIENTE' && clientes[0]) {
      setClienteId(clientes[0].id)
    }
  }

  const handleResetDemo = () => {
    resetDemoData()
  }

  const canSubmit =
    rol === 'ADMIN' ||
    (rol === 'CHOFER' && userId) ||
    (rol === 'CLIENTE' && (clienteId ? usuariosCliente.some((u) => u.clienteId === clienteId) : false))

  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display dark:bg-background-dark">
      {/* Top Navigation - mobile first */}
      <header className="w-full border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-lg bg-primary p-1.5 shrink-0">
              <span className="material-symbols-outlined text-2xl text-white">local_hospital</span>
            </div>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">MedLogix</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              MVP v1.0.4
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - mobile first */}
      <main className="flex flex-grow items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-4xl">
          <div className="mb-6 text-center sm:mb-10">
            <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:mb-3 sm:text-4xl">
              Acceso al Sistema
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-lg">
              Seleccione su perfil de usuario para continuar al panel de control
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection Grid */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6 sm:mb-10 md:grid-cols-3">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRolChange(r)}
                  className={`role-card group flex flex-col items-center rounded-xl border-2 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:border-primary hover:shadow-xl dark:bg-slate-800 dark:border-slate-600 dark:hover:border-primary sm:p-8 ${
                    rol === r ? 'border-primary shadow-md dark:border-primary' : 'border-transparent'
                  }`}
                >
                  <div
                    className={`role-icon-bg mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-300 sm:mb-6 sm:h-20 sm:w-20 ${
                      rol === r ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl sm:text-4xl">{roleLabels[r].icon}</span>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white sm:mb-2 sm:text-xl">
                    {roleLabels[r].title}
                  </h3>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{roleLabels[r].desc}</p>

                  {r === 'CLIENTE' && rol === 'CLIENTE' && (
                    <div className="mt-4 w-full sm:mt-6">
                      <label
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        htmlFor="company"
                      >
                        Seleccionar Empresa
                      </label>
                      <select
                        id="company"
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {r === 'CHOFER' && rol === 'CHOFER' && (
                    <div className="mt-4 w-full sm:mt-6">
                      <label
                        className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400"
                        htmlFor="chofer"
                      >
                        Seleccionar Chofer
                      </label>
                      <select
                        id="chofer"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:border-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        {choferes.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full max-w-md items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:active:scale-100 sm:gap-3 sm:px-8 sm:py-4"
              >
                <span className="material-symbols-outlined">login</span>
                Acceder como {roleLabels[rol].title}
              </button>

              <div className="mt-6 w-full max-w-lg rounded-xl border border-primary/10 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10 sm:mt-8">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary shrink-0">info</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      Simulación de Acceso
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Este portal es un entorno de demostración. Al seleccionar un rol se cargarán
                      datos pre-configurados para el perfil seleccionado.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer - mobile first */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-900 sm:py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-slate-500 dark:text-slate-400 md:flex-row md:text-left">
          <div className="flex items-center gap-6">
            <span>© 2024 MedLogix Logistics. Todos los derechos reservados.</span>
            <span className="hidden md:inline">|</span>
            <span className="font-mono text-xs">Build: 2024.11.05.001</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={handleResetDemo}
              className="flex items-center gap-1 transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Reiniciar Datos Demo
            </button>
            <a className="transition-colors hover:text-primary" href="#">
              Soporte Técnico
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
