import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'

const navItem =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'

const navItemActive =
  'flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary'

export function MainLayout() {
  const { currentUser, logout } = useAuthStore()
  const { resetDemoData } = useLogisticsStore()
  const navigate = useNavigate()
  const role = currentUser?.rol

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light font-display text-slate-900 antialiased dark:bg-background-dark dark:text-slate-100">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 p-6">
          <div className="rounded-lg bg-primary p-1.5 text-white">
            <span className="material-symbols-outlined text-2xl">medical_services</span>
          </div>
          <h1 className="text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-white">
            MedLogix
          </h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          {role === 'ADMIN' && (
            <>
              <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">dashboard</span>
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">groups</span>
                <span>Clientes</span>
              </NavLink>
              <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">local_shipping</span>
                <span>Choferes</span>
              </NavLink>
              <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">map</span>
                <span>Rutas</span>
              </NavLink>
              <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">analytics</span>
                <span>Reportes</span>
              </NavLink>
              <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">support_agent</span>
                <span>Soportes</span>
              </NavLink>
            </>
          )}

          {role === 'CHOFER' && (
            <NavLink to="/chofer/rutas" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
              <span className="material-symbols-outlined">route</span>
              <span>Mi Ruta</span>
            </NavLink>
          )}

          {role === 'CLIENTE' && (
            <>
              <NavLink to="/cliente/envios" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">local_shipping</span>
                <span>Envíos</span>
              </NavLink>
              <NavLink to="/cliente/ruta" className={({ isActive }) => (isActive ? navItemActive : navItem)}>
                <span className="material-symbols-outlined">map</span>
                <span>Ruta en tiempo real</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2">
            <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {currentUser?.nombre}
              </span>
              <span className="text-xs text-slate-500">ID: {currentUser?.id?.slice(-4) ?? '—'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => resetDemoData()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-primary dark:border-slate-700 dark:text-slate-400"
          >
            <span className="material-symbols-outlined text-sm">settings_backup_restore</span>
            Reset Demo Data
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 lg:px-8">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {role === 'ADMIN' && 'Panel de Control - Administración'}
              {role === 'CHOFER' && 'Mi Ruta'}
              {role === 'CLIENTE' && 'Portal Cliente'}
            </h2>
            <div className="relative hidden w-64 md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar guías, choferes..."
                className="w-full rounded-lg border-none bg-slate-100 py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-slate-500">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
            <div className="flex items-center gap-3">
              <button type="button" className="relative p-1.5 text-slate-500 transition-colors hover:text-primary">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500" />
              </button>
              <div className="rounded bg-primary px-2 py-1 text-[10px] font-bold text-white">
                {currentUser?.rol}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
