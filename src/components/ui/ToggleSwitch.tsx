interface Props {
  checked: boolean;
  onChange: () => void;
  /** Evita propagación en filas clicables (tablas). */
  stopPropagation?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  stopPropagation = true,
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${checked ? "bg-emerald-500" : "bg-slate-200"}`}
    >
      <span
        className={`pointer-events-none inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}
