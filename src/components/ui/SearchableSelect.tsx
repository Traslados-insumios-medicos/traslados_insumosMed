import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  onBlur,
  placeholder = "Seleccionar...",
  error = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onBlur]);

  // Enfocar el input al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (opt: Option) => {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2 pr-2.5 text-sm transition-colors
          ${error ? "border-red-400" : open ? "border-primary ring-1 ring-primary/30" : "border-slate-200"}
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-slate-300"}
        `}
      >
        <span
          className={
            selected
              ? "flex-1 truncate text-left text-slate-800"
              : "flex-1 text-left text-slate-400"
          }
        >
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 pl-2">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onMouseDown={handleClear}
              className="material-symbols-outlined text-[14px] text-slate-400 hover:text-slate-600"
            >
              close
            </span>
          )}
          <span
            className={`material-symbols-outlined text-[15px] text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <span
                className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                style={{ fontSize: "13px" }}
              >
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-6 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-slate-400">
                Sin resultados
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(opt)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-100
                      ${opt.value === value ? "bg-primary/5 font-semibold text-primary" : "text-slate-700"}
                    `}
                  >
                    {opt.value === value && (
                      <span className="material-symbols-outlined shrink-0 text-[16px] text-primary">
                        check
                      </span>
                    )}
                    <span className={opt.value === value ? "" : "pl-[22px]"}>
                      {opt.label}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
