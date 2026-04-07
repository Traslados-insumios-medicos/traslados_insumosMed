import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogisticsStore } from '../../store/logisticsStore'
import { useThemeStore } from '../../store/themeStore'
import { ToastContainer } from '../ui/ToastContainer'

const navItem =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'

const navItemActive =
  'flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary dark:bg-primary/20'

export function MainLayout() {
  const { currentUser, logout } = useAuthStore()
  const { novedades, guias } = useLogisticsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const role = currentUser?.rol
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Cerrar panel al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const tipoLabel: Record<string, string> = {
    DIRECCION_INCORRECTA: 'Dirección incorrecta',
    CLIENTE_AUSENTE: 'Cliente ausente',
    MERCADERIA_DANADA: 'Mercadería dañada',
    OTRO: 'Otro',
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display text-slate-900 antialiased dark:bg-background-dark dark:text-white md:flex-row md:overflow-hidden">
      {/* Overlay móvil cuando el sidebar está abierto */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: oculto en móvil, drawer en móvil al abrir */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-700 dark:bg-slate-900 md:relative md:z-0 md:w-64 md:flex-shrink-0 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700 md:border-0 md:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-1.5 text-white">
              <span className="material-symbols-outlined text-2xl">medical_services</span>
            </div>
            <h1 className="text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-white">MedLogix</h1>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {role === 'ADMIN' && (
            <>
              <NavLink to="/admin/dashboard" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">dashboard</span>
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/admin/clientes" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">groups</span>
                <span>Clientes</span>
              </NavLink>
              <NavLink to="/admin/choferes" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">local_shipping</span>
                <span>Choferes</span>
              </NavLink>
              <NavLink to="/admin/rutas" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">map</span>
                <span>Rutas</span>
              </NavLink>
              <NavLink to="/admin/reportes" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">analytics</span>
                <span>Reportes</span>
              </NavLink>
              <NavLink to="/admin/novedades" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">warning</span>
                <span>Novedades</span>
              </NavLink>
            </>
          )}

          {role === 'CHOFER' && (
            <NavLink to="/chofer/rutas" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
              <span className="material-symbols-outlined">route</span>
              <span>Mi Ruta</span>
            </NavLink>
          )}

          {role === 'CLIENTE' && (
            <>
              <NavLink to="/cliente/envios" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">local_shipping</span>
                <span>Envíos</span>
              </NavLink>
              <NavLink to="/cliente/ruta" className={({ isActive }) => (isActive ? navItemActive : navItem)} onClick={() => setSidebarOpen(false)}>
                <span className="material-symbols-outlined">map</span>
                <span>Ruta en tiempo real</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center gap-3 p-2">
            <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{currentUser?.nombre}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">ID: {currentUser?.id?.slice(-4) ?? '—'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-500 transition-colors hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-400 dark:hover:border-primary dark:hover:text-primary"
          >
            <span className="material-symbols-outlined text-sm">{isDark ? 'light_mode' : 'dark_mode'}</span>
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </aside>

      {/* Contenedor principal */}
      <div className="flex min-h-screen flex-1 flex-col md:min-h-0 md:overflow-hidden">
        {/* Header: móvil primero */}
        <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900 md:h-16 md:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-6">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-white md:text-lg">
              {role === 'ADMIN' && 'Administración'}
              {role === 'CHOFER' && 'Mi Ruta'}
              {role === 'CLIENTE' && 'Portal Cliente'}
            </h2>
            <div className="relative hidden flex-1 max-w-xs md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400 dark:text-slate-500">search</span>
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full rounded-lg border-0 bg-slate-100 py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 md:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Notificaciones"
              >
                <span className="material-symbols-outlined">notifications</span>
                {novedades.length > 0 && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {novedades.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Novedades</p>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                      {novedades.length} activas
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {novedades.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Sin novedades registradas
                      </div>
                    ) : (
                      novedades.slice().reverse().map((n) => {
                        const guia = guias.find((g) => g.id === n.guiaId)
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => { setNotifOpen(false); navigate('/admin/novedades') }}
                            className="w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                          >
                            <div className="flex items-start gap-3">
                              <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-red-500">warning</span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {tipoLabel[n.tipo] ?? n.tipo}
                                </p>
                                {guia && (
                                  <p className="text-xs text-primary">Guía {guia.numeroGuia}</p>
                                )}
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {n.descripcion}
                                </p>
                                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                  {new Date(n.createdAt).toLocaleString('es-ES')}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className="hidden rounded bg-primary px-2 py-1 text-[10px] font-bold text-white sm:inline-block">{currentUser?.rol}</span>
            <button type="button" onClick={handleLogout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" title="Cerrar sesión">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Contenido con padding móvil primero */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
