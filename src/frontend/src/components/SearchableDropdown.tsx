import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDropdownOptions } from "../hooks/useDropdownOptions";

interface SearchableDropdownProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  fieldKey: string;
  className?: string;
  id?: string;
  "data-ocid"?: string;
  hasError?: boolean;
}

export function SearchableDropdown({
  value,
  onChange,
  placeholder,
  fieldKey,
  className = "",
  id,
  "data-ocid": dataOcid,
  hasError,
}: SearchableDropdownProps) {
  const [options, addOption] = useDropdownOptions(fieldKey);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync query when value changes externally (e.g. form clear)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase()),
  );

  const showAddNew =
    query.trim() !== "" &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  const handleSelect = (opt: string) => {
    addOption(opt);
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  };

  const handleAddNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    addOption(trimmed);
    onChange(trimmed);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleFocus = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleBlur = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const hasOptions = filtered.length > 0 || showAddNew;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id={id}
          data-ocid={dataOcid}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          className={[
            "input-factory w-full pr-9",
            hasError ? "border-destructive" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          style={hasError ? { borderColor: "oklch(var(--destructive))" } : {}}
        />
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{
            color: "oklch(var(--muted-foreground))",
            transition: "transform 0.15s",
            transform: open
              ? "translateY(-50%) rotate(180deg)"
              : "translateY(-50%) rotate(0deg)",
          }}
        />
      </div>

      {open && hasOptions && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden"
          style={{
            background: "oklch(var(--card))",
            borderColor: "oklch(var(--border))",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              className="w-full text-left px-3 py-2.5 text-sm transition-colors"
              style={{ color: "oklch(var(--foreground))" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "oklch(var(--accent))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              {opt}
            </button>
          ))}
          {showAddNew && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors border-t"
              style={{
                color: "oklch(var(--primary))",
                borderColor: "oklch(var(--border))",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "oklch(var(--accent))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              + Add "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
