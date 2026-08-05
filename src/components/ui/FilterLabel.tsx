import type { ReactNode } from "react";

/** Etiqueta estándar de filtros admin (uppercase, slate-400). */
export function FilterLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </label>
  );
}
