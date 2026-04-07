import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { useAuthStore } from './store/authStore'
import './store/themeStore'

function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const sessionLoading = useAuthStore((s) => s.sessionLoading)

  useEffect(() => {
    restoreSession()
  }, [])

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}

export default App
