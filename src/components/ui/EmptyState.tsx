interface Props {
  icon?: string;
  title: string;
  onClear?: () => void;
  clearLabel?: string;
}

export function EmptyState({
  icon = "search_off",
  title,
  onClear,
  clearLabel = "Limpiar filtros",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="material-symbols-outlined text-4xl text-slate-300">
        {icon}
      </span>
      <p className="mt-2 text-sm text-slate-400">{title}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-xs font-semibold text-primary hover:underline"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
