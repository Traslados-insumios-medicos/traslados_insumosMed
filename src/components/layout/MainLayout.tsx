import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useGsapOutletTransition } from '../../hooks/useGsapOutletTransition'
import { useAuthStore } from '../../store/authStore'
import { ToastContainer } from '../ui/ToastContainer'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'
import logo from '../../assets/logo.png'

const tipoLabel: Record<string, string> = {
  DIRECCION_INCORRECTA: 'Dirección incorrecta',
  CLIENTE_AUSENTE: 'Cliente ausente',
  MERCADERIA_DANADA: 'Mercadería dañada',
  OTRO: 'Otro',
}

interface NavItemProps { to: string; icon: string; label: string; onClick: () => void }
function NavItem({ to, icon, label, onClick }: NavItemProps) {
  return (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-primary text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }>
      {({ isActive }) => (
        <motion.span
          className="flex items-center gap-3"
          whileHover={isActive ? undefined : { x: 4 }}
          transition={{ type: 'tween', duration: 0.18, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <span className="material-symbols-outlined text-[19px]">{icon}</span>
          <span>{label}</span>
        </motion.span>
      )}
    </NavLink>
  )
}

export function MainLayout() {
  const { currentUser, logout } = useAuthStore()
  const location = useLocation()
  const outletRef = useRef<HTMLDivElement>(null)
  useGsapOutletTransition(outletRef, location.pathname)
  const role = currentUser?.rol
  const { notifs, unread, markRead } = useAdminNotifications({ enabled: role === 'ADMIN' })
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }
  const close = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen overflow-hidden bg-bg font-body text-slate-800 antialiased">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button type="button" aria-label="Cerrar"
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] md:hidden"
          onClick={close} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white shadow-[1px_0_0_0_#e2e8f0] transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <img src={logo} alt="LOGISTRANS" className="h-8 w-auto object-contain" />
          <button type="button" onClick={close} className="rounded-md p-1 text-slate-400 hover:text-slate-600 md:hidden">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {role === 'ADMIN' && (<>
            <NavItem to="/admin/dashboard" icon="dashboard" label="Dashboard" onClick={close} />
            <NavItem to="/admin/clientes" icon="groups" label="Clientes" onClick={close} />
            <NavItem to="/admin/choferes" icon="local_shipping" label="Choferes" onClick={close} />
            <NavItem to="/admin/rutas" icon="map" label="Rutas" onClick={close} />
            <NavItem to="/admin/reportes" icon="analytics" label="Reportes" onClick={close} />
            <NavItem to="/admin/novedades" icon="warning" label="Novedades" onClick={close} />
          </>)}
          {role === 'CHOFER' && (<>
            <NavItem to="/chofer/rutas" icon="route" label="Mis Rutas" onClick={close} />
            <NavItem to="/chofer/historial" icon="history" label="Historial" onClick={close} />
          </>)}
          {role === 'CLIENTE' && (<>
            <NavItem to="/cliente/envios" icon="inventory_2" label="Envíos" onClick={close} />
            <NavItem to="/cliente/ruta" icon="location_on" label="Ruta en vivo" onClick={close} />
          </>)}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-white">
              {currentUser?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{currentUser?.nombre}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{currentUser?.rol}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 shadow-nav">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <p className="font-display text-sm font-semibold text-slate-800">
                {role === 'ADMIN' && 'Panel de Administración'}
                {role === 'CHOFER' && 'Panel del Chofer'}
                {role === 'CLIENTE' && 'Portal del Cliente'}
              </p>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bell */}
            {role === 'ADMIN' && (
              <div ref={notifRef} className="relative">
                <button type="button"
                  onClick={() => { setNotifOpen((v) => !v); markRead() }}
                  className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-[22px]">notifications</span>
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }}
                    className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-primary">notifications</span>
                        <p className="font-display text-sm font-bold text-slate-900">Novedades</p>
                      </div>
                      {notifs.length > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                          {notifs.length}
                        </span>
                      )}
                    </div>
                    <div className="h-px bg-slate-100" />

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100">
                            <span className="material-symbols-outlined text-2xl text-slate-400">notifications_off</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-600">Todo tranquilo</p>
                            <p className="mt-0.5 text-xs text-slate-400">No hay novedades pendientes</p>
                          </div>
                        </div>
                      ) : notifs.map((n) => (
                        <button key={n.id} type="button"
                          onClick={() => { setNotifOpen(false); navigate('/admin/novedades') }}
                          className="group w-full px-5 py-3.5 text-left transition-colors hover:bg-slate-50">
                          <div className="flex items-start gap-3.5">
                            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100">
                              <span className="material-symbols-outlined text-sm text-red-500">warning</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-800">{tipoLabel[n.tipo] ?? n.tipo}</p>
                                <p className="shrink-0 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                              <p className="text-[11px] font-medium text-primary">Guía {n.guia.numeroGuia}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.descripcion}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="h-px bg-slate-100" />
                    <div className="px-5 py-3">
                      <button type="button" onClick={() => { setNotifOpen(false); navigate('/admin/novedades') }}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        Ver todas las novedades
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Logout */}
            <button type="button" onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 lg:p-8">
          <div
            ref={outletRef}
            key={location.pathname}
            className="mx-auto w-full max-w-7xl"
          >
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
