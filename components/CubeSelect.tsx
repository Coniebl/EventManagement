"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface CubeSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  dotClass?: string;
}

interface CubeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CubeSelectOption[];
  placeholder?: string;
  className?: string;
  menuAlign?: "left" | "right";
  id?: string;
}

export function CubeSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  menuAlign = "left",
  id,
}: CubeSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-xs font-bold transition ${
          open
            ? "border-[#168bd0] bg-white text-[#14222e] ring-2 ring-[#20c9db]/25"
            : "border-[#e8edf0] bg-white text-[#14222e] hover:border-[#168bd0]/50"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.dotClass && (
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${selected.dotClass}`}
            />
          )}
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          {selected?.sublabel && (
            <span className="shrink-0 text-[11px] font-semibold text-[#72808e]">
              {selected.sublabel}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#168bd0] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 max-h-64 w-full min-w-[240px] overflow-y-auto rounded-xl border border-[#e8edf0] bg-white p-1.5 shadow-xl ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#72808e]">
              No options available
            </div>
          ) : (
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                      isSelected
                        ? "bg-gradient-to-r from-[#20c9db]/18 to-[#168bd0]/12 text-[#0878ba]"
                        : "text-[#14222e] hover:bg-[#f5f8fa]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {opt.dotClass && (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${opt.dotClass}`}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="shrink-0 text-[10px] font-semibold text-[#72808e]">
                          {opt.sublabel}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
