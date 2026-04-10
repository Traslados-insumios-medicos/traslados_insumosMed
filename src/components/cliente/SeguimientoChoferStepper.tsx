import { Fragment } from 'react'

export type SeguimientoChoferValue = 'NINGUNO' | 'EN_CAMINO' | 'EN_TRAFICO' | 'CERCA_DESTINO'

const LEVEL: Record<SeguimientoChoferValue, number> = {
  NINGUNO: 0,
  EN_CAMINO: 1,
  EN_TRAFICO: 2,
  CERCA_DESTINO: 3,
}

const STEPS: { label: string; icon: string; value: SeguimientoChoferValue | null }[] = [
  { label: 'Ruta en curso', icon: 'route', value: null },
  { label: 'En camino', icon: 'local_shipping', value: 'EN_CAMINO' },
  { label: 'En tráfico', icon: 'traffic', value: 'EN_TRAFICO' },
  { label: 'Cerca de tu entrega', icon: 'location_on', value: 'CERCA_DESTINO' },
]

export interface SeguimientoChoferStepperProps {
  rutaEstado: string
  seguimiento: string
  guiaEstado?: string
  title?: string
  onStepClick?: (value: SeguimientoChoferValue) => void
}

export function SeguimientoChoferStepper({
  rutaEstado,
  seguimiento,
  guiaEstado,
  title = 'Seguimiento del chofer',
  onStepClick,
}: SeguimientoChoferStepperProps) {
  const raw = seguimiento as SeguimientoChoferValue
  const level = Object.prototype.hasOwnProperty.call(LEVEL, raw) ? LEVEL[raw] : 0
  const rutaTerminada = rutaEstado === 'COMPLETADA' || rutaEstado === 'CANCELADA'
  const entregaCerrada = guiaEstado === 'ENTREGADO' || guiaEstado === 'INCIDENCIA'
  const forzarCompleto = rutaTerminada || entregaCerrada

  const doneAt = (i: number) => {
    if (forzarCompleto) return true
    if (i === 0) return rutaEstado === 'EN_CURSO' || rutaEstado === 'COMPLETADA'
    return level >= i
  }

  let activeIndex = -1
  for (let i = 0; i < STEPS.length; i++) {
    if (!doneAt(i)) { activeIndex = i; break }
  }
  if (!forzarCompleto && activeIndex === -1 && rutaEstado === 'EN_CURSO' && level >= STEPS.length - 1) {
    activeIndex = STEPS.length - 1
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-slate-900 leading-tight">{title}</h3>
      <div className="flex w-full min-w-0 items-center">
        {STEPS.map((step, i) => {
          const isActive = i === activeIndex
          const isDone = doneAt(i)
          const isClickable = !!onStepClick && step.value !== null && rutaEstado === 'EN_CURSO'

          const circle = (
            <div className={`flex size-9 items-center justify-center rounded-full sm:size-10 transition-transform ${
              isActive
                ? 'border-2 border-primary bg-primary/15 text-primary ring-4 ring-primary/15'
                : isDone ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
            } ${isClickable ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}`}>
              <span className="material-symbols-outlined text-base sm:text-lg">{step.icon}</span>
            </div>
          )

          const label = (
            <p className={`mt-1.5 w-full text-center text-[8px] font-bold leading-tight sm:text-[9px] ${
              isActive ? 'text-primary' : isDone ? 'text-slate-800' : 'text-slate-400'
            }`}>
              {step.label}
            </p>
          )

          return (
            <Fragment key={step.label}>
              <div className="flex min-w-0 flex-1 flex-col items-center">
                {isClickable ? (
                  <button type="button" onClick={() => onStepClick(step.value!)}
                    className="flex flex-col items-center focus:outline-none"
                    title={`Marcar: ${step.label}`}>
                    {circle}{label}
                  </button>
                ) : (
                  <>{circle}{label}</>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-0.5 mb-5 h-0.5 w-3 shrink-0 rounded-full self-center sm:w-4 ${
                  doneAt(i + 1) ? 'bg-primary' : 'bg-slate-200'
                }`} aria-hidden />
              )}
            </Fragment>
          )
        })}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        {rutaEstado === 'PENDIENTE'
          ? 'La ruta aún no ha iniciado.'
          : rutaTerminada
            ? 'Ruta finalizada.'
            : seguimiento === 'NINGUNO' && rutaEstado === 'EN_CURSO'
              ? 'El chofer puede ir actualizando su avance; aquí verás cada etapa.'
              : '\u00a0'}
      </p>
    </div>
  )
}
