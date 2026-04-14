import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModalMotion } from './ui/ModalMotion'
import { useAuthStore } from '../store/authStore'
import { getSharedSocket } from '../shared/socket'

export function AccountDeactivatedModal() {
  const [show, setShow] = useState(false)
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('⚠️ No hay token, no se conectará el socket')
      return
    }

    console.log('🔌 Conectando socket para escuchar account:deactivated...')
    const socket = getSharedSocket()
    
    const handleAccountDeactivated = () => {
      console.log('🔴 EVENTO RECIBIDO: account:deactivated - mostrando modal')
      setShow(true)
    }

    socket.on('account:deactivated', handleAccountDeactivated)
    console.log('✅ Listener de account:deactivated registrado en socket:', socket.id)

    return () => {
      console.log('🧹 Limpiando listener de account:deactivated')
      socket.off('account:deactivated', handleAccountDeactivated)
    }
  }, [])

  const handleClose = () => {
    console.log('👋 Usuario cerró el modal, haciendo logout...')
    setShow(false)
    logout()
    navigate('/login')
  }

  if (!show) return null

  return (
    <ModalMotion
      show={show}
      backdropClassName="bg-black/60"
      panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl"
    >
      <div className="p-6 space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
            <span className="material-symbols-outlined text-3xl text-red-600">block</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Cuenta desactivada</h3>
          <p className="text-sm text-slate-600">
            Tu cuenta ha sido desactivada por un administrador. Ya no puedes acceder al sistema.
          </p>
          <p className="text-xs text-slate-500">
            Si crees que esto es un error, contacta con el administrador del sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Entendido
        </button>
      </div>
    </ModalMotion>
  )
}
