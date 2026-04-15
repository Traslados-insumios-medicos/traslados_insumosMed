import { useState } from 'react'
import { MapPickerModal } from './MapPickerModal'

interface Coords { lat: number; lng: number }

interface Props {
  value: string
  coords?: Coords | null
  onChange: (value: string, coords?: Coords) => void
  placeholder?: string
  onBlur?: () => void
}

export function MapboxAddressInput({ value, coords, onChange, placeholder = 'Seleccionar ubicacion...', onBlur }: Props) {
  const [open, setOpen] = useState(false)

  const handleConfirm = (address: string, c: Coords) => {
    onChange(address, c)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onBlur={onBlur}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-primary"
      >
        <span className={`material-symbols-outlined text-base ${coords ? 'text-emerald-500' : 'text-slate-400'}`}>
          location_on
        </span>
        <span className={value ? 'flex-1 truncate text-slate-800' : 'flex-1 text-slate-400'}>
          {value || placeholder}
        </span>
        <span className="material-symbols-outlined text-sm text-slate-300">map</span>
      </button>

      {open && (
        <MapPickerModal
          initialCoords={coords ?? null}
          initialAddress={value || undefined}
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
