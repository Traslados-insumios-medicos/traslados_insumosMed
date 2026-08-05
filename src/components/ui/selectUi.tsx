import type { ReactNode, RefObject } from "react";
import type { SelectOption } from "./selectTypes";

export type { SelectOption };

function getSelectBorderClass(error: boolean, open: boolean) {
  if (error) return "border-red-400";
  if (open) return "border-primary ring-1 ring-primary/30";
  return "border-slate-200";
}

interface TriggerProps {
  open: boolean;
  disabled?: boolean;
  error?: boolean;
  displayText: string | null;
  placeholder: string;
  hasValue: boolean;
  onToggle: () => void;
  onClear?: () => void;
}

export function SelectTrigger({
  open,
  disabled = false,
  error = false,
  displayText,
  placeholder,
  hasValue,
  onToggle,
  onClear,
}: TriggerProps) {
  const borderClass = getSelectBorderClass(error, open);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2 pr-2.5 text-sm transition-colors
        ${borderClass}
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-slate-300"}
      `}
    >
      <span
        className={
          displayText
            ? "flex-1 truncate text-left text-slate-800"
            : "flex-1 text-left text-slate-400"
        }
      >
        {displayText ?? placeholder}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 pl-2">
        {hasValue && onClear && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onMouseDown={(e) => {
              e.stopPropagation();
              onClear();
            }}
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
  );
}

interface OptionsListProps {
  options: SelectOption[];
  value: string;
  onSelect: (value: string) => void;
  emptyMessage?: string;
}

export function SelectOptionsList({
  options,
  value,
  onSelect,
  emptyMessage = "Sin resultados",
}: OptionsListProps) {
  if (options.length === 0) {
    return (
      <li className="px-3 py-3 text-center text-xs text-slate-400">
        {emptyMessage}
      </li>
    );
  }

  return (
    <>
      {options.map((opt) => (
        <li key={opt.value || "__empty__"}>
          <button
            type="button"
            onMouseDown={() => onSelect(opt.value)}
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
      ))}
    </>
  );
}

export function SelectDropdownPanel({
  children,
  header,
}: {
  children: ReactNode;
  header?: ReactNode;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
      {header}
      <ul className="max-h-52 overflow-y-auto">{children}</ul>
    </div>
  );
}

export function SelectSearchHeader({
  inputRef,
  query,
  onQueryChange,
  onEnter,
  maxLength,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQueryChange: (q: string) => void;
  onEnter?: () => void;
  maxLength?: number;
}) {
  return (
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
          maxLength={maxLength}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder="Buscar..."
          className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-6 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}
