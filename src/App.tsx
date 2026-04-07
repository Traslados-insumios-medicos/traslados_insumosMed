import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { useAuthStore } from './store/authStore'
import './store/themeStore'

function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)

  useEffect(() => {
    restoreSession()
  }, [])

  return <RouterProvider router={router} />
}

export default App
