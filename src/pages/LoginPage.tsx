import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ModalMotion } from '../components/ui/ModalMotion'
import logo from '../assets/logo.png'

export function LoginPage() {
  const REQUIRED_MESSAGE = 'Este campo es obligatorio'
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const rm = Boolean(context.conditions?.reduceMotion)
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        if (leftPanelRef.current) {
          const leftEls = leftPanelRef.current.querySelectorAll<HTMLElement>('.login-reveal')
          tl.from(
            leftEls,
            {
              autoAlpha: rm ? 1 : 0,
              y: rm ? 0 : 32,
              duration: rm ? 0 : 0.55,
              stagger: rm ? 0 : 0.1,
            },
            0,
          )
        }
        if (rightPanelRef.current) {
          tl.from(
            rightPanelRef.current,
            { autoAlpha: rm ? 1 : 0, y: rm ? 0 : 28, duration: rm ? 0 : 0.58 },
            rm ? 0 : 0.14,
          )
        }
        return () => {
          tl.kill()
        }
      },
    )
    return () => mm.revert()
  }, [])
  const navigate = useNavigate()
  const { loginWithCredentials } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [requiredErrors, setRequiredErrors] = useState({ email: '', password: '' })
  const [showInactiveModal, setShowInactiveModal] = useState(false)
  const [inactiveMsg, setInactiveMsg] = useState('Su acceso está inactivo. Contacte al administrador de la empresa.')
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false)
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('Su sesión ha expirado. Otra sesión ha sido iniciada con esta cuenta.')

  useEffect(() => {
    const inactiveNotice = sessionStorage.getItem('inactive_access_notice')
    if (inactiveNotice) {
      setInactiveMsg(inactiveNotice)
      setShowInactiveModal(true)
      sessionStorage.removeItem('inactive_access_notice')
    }
    
    const sessionExpiredNotice = sessionStorage.getItem('session_expired_notice')
    if (sessionExpiredNotice) {
      setSessionExpiredMsg(sessionExpiredNotice)
      setShowSessionExpiredModal(true)
      sessionStorage.removeItem('session_expired_notice')
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const nextErrors = {
      email: email.trim() ? '' : REQUIRED_MESSAGE,
      password: password.trim() ? '' : REQUIRED_MESSAGE,
    }
    setRequiredErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return
    setLoading(true)
    try {
      const { mustChangePassword } = await loginWithCredentials(email, password)
      if (mustChangePassword) { navigate('/cambiar-password'); return }
      const rol = useAuthStore.getState().currentRole
      if (rol === 'ADMIN') navigate('/admin/dashboard')
      else if (rol === 'CHOFER') navigate('/chofer/rutas')
      else navigate('/cliente/envios')
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message ?? 'Credenciales incorrectas'
      if (status === 403 && String(msg).toLowerCase().includes('inactivo')) {
        setInactiveMsg(msg)
        setShowInactiveModal(true)
        setError('')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen font-body">
      {/* Left panel */}
      <div
        ref={leftPanelRef}
        className="relative hidden lg:flex lg:w-[45%] flex-col justify-center overflow-hidden bg-primary px-12 py-10"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        {/* Decorative circle */}
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/5" />
        <div className="absolute -top-20 -left-20 size-72 rounded-full bg-white/5" />
        
        {/* Watermark logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img src={logo} alt="" className="w-[420px] h-auto brightness-0 invert opacity-[0.15]" />
        </div>

        <div className="login-reveal relative z-10 space-y-6">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight text-white">
              LOGISTRANS<br />S.A.
            </h1>
            <p className="mt-2 text-lg font-light text-blue-200">Servicio de Transporte</p>
          </div>

          <div className="h-px w-16 bg-accent" />

          <div className="space-y-3">
            {[
              { icon: 'local_shipping', text: 'Gestión de rutas y choferes' },
              { icon: 'inventory_2', text: 'Control de envíos en tiempo real' },
              { icon: 'analytics', text: 'Reportes y estadísticas' },
              { icon: 'location_on', text: 'Seguimiento GPS en vivo' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <span className="material-symbols-outlined text-base text-white">{f.icon}</span>
                </div>
                <span className="text-sm text-blue-100">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="login-reveal absolute bottom-10 left-12 z-10 text-xs text-blue-300">© 2025 LOGISTRANS S.A. Todos los derechos reservados.</p>
      </div>

      {/* Right panel */}
      <div
        ref={rightPanelRef}
        className="flex flex-1 flex-col items-center justify-center bg-bg px-6 py-12"
      >
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <img src={logo} alt="LOGISTRANS" className="h-12 w-auto mb-2" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Servicio de Transporte</p>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-900">Bienvenido</h2>
            <p className="mt-1 text-sm text-slate-500">Ingrese sus credenciales para acceder al sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email o Celular</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">mail</span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    const value = e.target.value
                    // Permitir números, letras, @, ., _, -
                    if (value === '' || /^[a-zA-Z0-9@._-]*$/.test(value)) {
                      setEmail(value)
                      if (value.trim()) {
                        setRequiredErrors((prev) => ({ ...prev, email: '' }))
                      }
                    }
                  }}
                  onBlur={() => {
                    setRequiredErrors((prev) => ({ ...prev, email: email.trim() ? '' : REQUIRED_MESSAGE }))
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    const pastedText = e.clipboardData.getData('text')
                    const cleanText = pastedText.replace(/[^a-zA-Z0-9@._-]/g, '')
                    setEmail(email + cleanText)
                  }}
                  maxLength={150}
                  required
                  placeholder="Ingresa tu email o número de celular"
                  className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 ${
                    requiredErrors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-primary focus:ring-primary/15'
                  }`}
                />
              </div>
              {requiredErrors.email && <p className="mt-1 text-xs text-red-500">{requiredErrors.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 flex items-center">lock</span>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => {
                  const value = e.target.value
                  setPassword(value)
                  if (value.trim()) {
                    setRequiredErrors((prev) => ({ ...prev, password: '' }))
                  }
                }} onBlur={() => {
                  setRequiredErrors((prev) => ({ ...prev, password: password.trim() ? '' : REQUIRED_MESSAGE }))
                }} required
                  placeholder="Ingresa tu contraseña"
                  className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:outline-none focus:ring-2 ${
                    requiredErrors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-primary focus:ring-primary/15'
                  }`} />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center">
                  <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {requiredErrors.password && <p className="mt-1 text-xs text-red-500">{requiredErrors.password}</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60">
              {loading
                ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                : <span className="material-symbols-outlined text-base">login</span>}
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>
      </div>

      <ModalMotion
        show={showInactiveModal}
        backdropClassName="bg-black/45"
        panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Acceso inactivo</h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-600">
            {inactiveMsg}
          </p>
          <p className="text-xs text-slate-400">
            Cuando el administrador reactive su usuario, podrá volver a ingresar normalmente.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowInactiveModal(false)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Entendido
            </button>
          </div>
        </div>
      </ModalMotion>

      <ModalMotion
        show={showSessionExpiredModal}
        backdropClassName="bg-black/45"
        panelClassName="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">warning</span>
            <h3 className="text-base font-bold text-slate-900">Sesión cerrada</h3>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-600">
            {sessionExpiredMsg}
          </p>
          <p className="text-xs text-slate-400">
            Solo puede haber una sesión activa por cuenta. Si necesita acceder desde múltiples dispositivos, contacte al administrador.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowSessionExpiredModal(false)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Entendido
            </button>
          </div>
        </div>
      </ModalMotion>
    </div>
  )
}
