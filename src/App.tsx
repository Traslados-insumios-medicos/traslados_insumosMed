import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import './store/themeStore'

function App() {
  return <RouterProvider router={router} />
}

export default App
