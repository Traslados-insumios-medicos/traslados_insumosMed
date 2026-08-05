interface Props {
  page: number;
  totalPages: number;
  /** Texto izquierdo opcional, ej. "12 clientes en total" */
  summary?: string;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function PaginationBar({
  page,
  totalPages,
  summary,
  loading = false,
  onPrev,
  onNext,
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      {summary ? <p className="text-slate-400">{summary}</p> : <span />}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1 || loading}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-slate-400">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages || loading}
          className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
