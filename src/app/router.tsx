import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { CambiarPasswordPage } from '../pages/CambiarPasswordPage'
import { UserProfilePage } from '../pages/UserProfilePage'
import { MainLayout } from '../components/layout/MainLayout'
import { RoleGuard } from './RoleGuard'
import { AuthGuard } from './AuthGuard'
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage'
import { AdminClientesPage } from '../features/admin/AdminClientesPage'
import { AdminChoferesPage } from '../features/admin/AdminChoferesPage'
import { AdminReportesPage } from '../features/admin/AdminReportesPage'
import { AdminRutasPage } from '../features/admin/AdminRutasPage'
import { AdminNovedadesPage } from '../features/admin/AdminNovedadesPage'
import { AdminRutaTiempoRealPage } from '../features/admin/AdminRutaTiempoRealPage'
import { AdminSeguimientoPage } from '../features/admin/AdminSeguimientoPage'
import { ChoferRutasPage } from '../features/chofer/ChoferRutasPage'
import { ChoferHistorialPage } from '../features/chofer/ChoferHistorialPage'
import { ChoferRutaDetallePage } from '../features/chofer/ChoferRutaDetallePage'
import { ClienteEnviosPage } from '../features/cliente/ClienteEnviosPage'
import { ClienteEnvioDetallePage } from '../features/cliente/ClienteEnvioDetallePage'
import { ClienteRutaTiempoRealPage } from '../features/cliente/ClienteRutaTiempoRealPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/cambiar-password',
    element: (
      <AuthGuard>
        <CambiarPasswordPage />
      </AuthGuard>
    ),
  },
  {
    element: (
      <RoleGuard>
        <MainLayout />
      </RoleGuard>
    ),
    children: [
      { path: '/perfil', element: <UserProfilePage /> },
      { path: '/admin/dashboard', element: <AdminDashboardPage /> },
      { path: '/admin/clientes', element: <AdminClientesPage /> },
      { path: '/admin/choferes', element: <AdminChoferesPage /> },
      { path: '/admin/reportes', element: <AdminReportesPage /> },
      { path: '/admin/rutas', element: <AdminRutasPage /> },
      { path: '/admin/novedades', element: <AdminNovedadesPage /> },
      { path: '/admin/seguimiento', element: <AdminSeguimientoPage /> },
      { path: '/admin/rutas/:rutaId/tiempo-real', element: <AdminRutaTiempoRealPage /> },
      { path: '/chofer/rutas', element: <ChoferRutasPage /> },
      { path: '/chofer/historial', element: <ChoferHistorialPage /> },
      { path: '/chofer/rutas/:id', element: <ChoferRutaDetallePage /> },
      { path: '/cliente/envios', element: <ClienteEnviosPage /> },
      { path: '/cliente/envios/:guiaId', element: <ClienteEnvioDetallePage /> },
      { path: '/cliente/ruta', element: <ClienteRutaTiempoRealPage /> },
    ],
  },
])

