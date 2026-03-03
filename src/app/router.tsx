import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { MainLayout } from '../components/layout/MainLayout'
import { RoleGuard } from './RoleGuard'
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage'
import { AdminClientesPage } from '../features/admin/AdminClientesPage'
import { AdminChoferesPage } from '../features/admin/AdminChoferesPage'
import { AdminReportesPage } from '../features/admin/AdminReportesPage'
import { AdminRutasPage } from '../features/admin/AdminRutasPage'
import { AdminSoportesPage } from '../features/admin/AdminSoportesPage'
import { ChoferRutasPage } from '../features/chofer/ChoferRutasPage'
import { ChoferRutaDetallePage } from '../features/chofer/ChoferRutaDetallePage'
import { ClienteEnviosPage } from '../features/cliente/ClienteEnviosPage'
import { ClienteEnvioDetallePage } from '../features/cliente/ClienteEnvioDetallePage'
import { ClienteRutaTiempoRealPage } from '../features/cliente/ClienteRutaTiempoRealPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <RoleGuard>
        <MainLayout />
      </RoleGuard>
    ),
    children: [
      {
        path: '/admin/dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: '/admin/clientes',
        element: <AdminClientesPage />,
      },
      {
        path: '/admin/choferes',
        element: <AdminChoferesPage />,
      },
      {
        path: '/admin/reportes',
        element: <AdminReportesPage />,
      },
      {
        path: '/admin/rutas',
        element: <AdminRutasPage />,
      },
      {
        path: '/admin/soportes',
        element: <AdminSoportesPage />,
      },
      {
        path: '/chofer/rutas',
        element: <ChoferRutasPage />,
      },
      {
        path: '/chofer/rutas/:id',
        element: <ChoferRutaDetallePage />,
      },
      {
        path: '/cliente/envios',
        element: <ClienteEnviosPage />,
      },
      {
        path: '/cliente/envios/:guiaId',
        element: <ClienteEnvioDetallePage />,
      },
      {
        path: '/cliente/ruta',
        element: <ClienteRutaTiempoRealPage />,
      },
    ],
  },
])

