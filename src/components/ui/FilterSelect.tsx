import { useEffect, useRef, useState } from "react";
import {
  SelectDropdownPanel,
  SelectOptionsList,
  type SelectOption,
  SelectTrigger,
} from "./selectUi";

interface Props {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function FilterSelect({
  label,
  options,
  value,
  onChange,
  onBlur,
  placeholder = "Todos",
  disabled = false,
  error = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayText = selected?.label ?? null;

  const closeDropdown = () => setOpen(false);

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

  const handleSelect = (next: string) => {
    onChange(next);
    closeDropdown();
  };

  const handleClear = () => onChange("");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      {label && (
        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative w-full">
        <SelectTrigger
          open={open}
          disabled={disabled}
          error={error}
          displayText={displayText}
          placeholder={placeholder}
          hasValue={Boolean(value)}
          onToggle={() => {
            if (!disabled) setOpen((prev) => !prev);
          }}
          onClear={handleClear}
        />
        {open && (
          <SelectDropdownPanel>
            <SelectOptionsList
              options={options}
              value={value}
              onSelect={handleSelect}
            />
          </SelectDropdownPanel>
        )}
      </div>
    </div>
  );
}
