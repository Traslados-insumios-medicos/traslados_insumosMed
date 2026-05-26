import { useEffect, useRef, useState } from "react";
import {
  SelectDropdownPanel,
  SelectOptionsList,
  SelectSearchHeader,
  SelectTrigger,
} from "./selectUi";
import type { SelectOption } from "./selectTypes";

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  /** Permite elegir un valor que no esté en la lista (misma UI que el modo estándar). */
  creatable?: boolean;
  maxLength?: number;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  onBlur,
  placeholder = "Seleccionar...",
  error = false,
  disabled = false,
  creatable = false,
  maxLength,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const hasValue = Boolean(value);
  const displayText =
    selected?.label ?? (creatable && value ? value : null);

  const queryNorm = query.trim().toLowerCase();
  const filtered = queryNorm
    ? options.filter((o) => o.label.toLowerCase().includes(queryNorm))
    : options;

  const queryTrim = query.trim();
  const showCreateOption =
    creatable &&
    queryTrim.length > 0 &&
    !options.some(
      (o) =>
        o.value.toLowerCase() === queryTrim.toLowerCase() ||
        o.label.toLowerCase() === queryTrim.toLowerCase(),
    );

  const closeDropdown = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onBlur]);

  const applyValue = (next: string) => {
    const trimmed = maxLength ? next.slice(0, maxLength) : next;
    onChange(trimmed);
    closeDropdown();
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
  };

  const handleToggle = () => {
    if (disabled) return;
    if (open) {
      closeDropdown();
      return;
    }
    const initialQuery = creatable && value && !selected ? value : "";
    setQuery(initialQuery);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const listEmpty = filtered.length === 0 && !showCreateOption;

  return (
    <div ref={containerRef} className="relative w-full">
      <SelectTrigger
        open={open}
        disabled={disabled}
        error={error}
        displayText={displayText}
        placeholder={placeholder}
        hasValue={hasValue}
        onToggle={handleToggle}
        onClear={handleClear}
      />
      {open && (
        <SelectDropdownPanel
          header={
            <SelectSearchHeader
              inputRef={inputRef}
              query={query}
              onQueryChange={setQuery}
              maxLength={creatable ? maxLength : undefined}
              onEnter={
                creatable && queryTrim ? () => applyValue(queryTrim) : undefined
              }
            />
          }
        >
          {showCreateOption && (
            <li>
              <button
                type="button"
                onMouseDown={() => applyValue(queryTrim)}
                className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-left text-sm text-primary transition-colors hover:bg-primary/5"
              >
                <span className="material-symbols-outlined shrink-0 text-[16px]">
                  add
                </span>
                <span>Usar &quot;{queryTrim}&quot;</span>
              </button>
            </li>
          )}
          {listEmpty ? (
            <li className="px-3 py-3 text-center text-xs text-slate-400">
              Sin resultados
            </li>
          ) : (
            <SelectOptionsList
              options={filtered}
              value={value}
              onSelect={applyValue}
            />
          )}
        </SelectDropdownPanel>
      )}
    </div>
  );
}
