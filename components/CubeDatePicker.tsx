"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface CubeDatePickerProps {
  value: string; // YYYY-MM-DD or "" when empty
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  placement?: "top" | "bottom";
  align?: "left" | "right";
  className?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  }
  return { y, m, d };
}

function toYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CubeDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  allowClear = false,
  placement = "top",
  align = "left",
  className = "",
}: CubeDatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseYmd(value);
  const [viewYear, setViewYear] = useState(parsed.y);
  const [viewMonth, setViewMonth] = useState(parsed.m); // 1-12
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

  const openPicker = () => {
    const p = parseYmd(value);
    setViewYear(p.y);
    setViewMonth(p.m);
    setOpen((o) => !o);
  };

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

  const cells: { y: number; m: number; d: number; inMonth: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const pm = viewMonth === 1 ? 12 : viewMonth - 1;
    const py = viewMonth === 1 ? viewYear - 1 : viewYear;
    cells.push({ y: py, m: pm, d: daysInPrevMonth - i, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: viewYear, m: viewMonth, d, inMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = viewMonth === 12 ? 1 : viewMonth + 1;
    const ny = viewMonth === 12 ? viewYear + 1 : viewYear;
    cells.push({ y: ny, m: nm, d, inMonth: false });
  }

  const now = new Date();
  const todayYmd = toYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const displayLabel = value
    ? `${MONTHS[parsed.m - 1]?.slice(0, 3)} ${String(parsed.d).padStart(
        2,
        "0"
      )}, ${parsed.y}`
    : placeholder;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={openPicker}
          className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
            open || value
              ? "border-[#168bd0]/60 bg-white text-[#14222e] ring-2 ring-[#20c9db]/20"
              : "border-[#e8edf0] bg-[#f8fafb] text-[#72808e] hover:border-[#168bd0]/50 hover:text-[#14222e]"
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
            <span className="truncate">{displayLabel}</span>
          </span>
          {allowClear && value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="rounded p-0.5 text-[#72808e] hover:bg-[#e1f6fb] hover:text-[#0878ba]"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </div>

      {open && (
        <div
          className={`absolute z-50 w-68 overflow-hidden rounded-2xl border border-[#e8edf0] bg-white shadow-2xl ${
            placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          {/* Calendar Ocean Header */}
          <div className="hero-ocean flex items-center justify-between px-3.5 py-2.5 text-white">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-xs font-extrabold tracking-wide">
              {MONTHS[viewMonth - 1]} {viewYear}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days Grid */}
          <div className="p-3">
            <div className="grid grid-cols-7 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="py-1">
                  {wd}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-0.5 text-center">
              {cells.map((cell) => {
                const cellYmd = toYmd(cell.y, cell.m, cell.d);
                const isSelected = Boolean(value) && cellYmd === value;
                const isToday = cellYmd === todayYmd;
                return (
                  <button
                    key={cellYmd}
                    type="button"
                    onClick={() => {
                      onChange(cellYmd);
                      setOpen(false);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? "bg-gradient-to-br from-[#20c9db] to-[#168bd0] font-bold text-white shadow-xs"
                        : isToday
                          ? "border border-[#20c9db] bg-[#e1f6fb] font-bold text-[#0878ba]"
                          : cell.inMonth
                            ? "text-[#14222e] hover:bg-[#e1f6fb]/70 hover:text-[#0878ba]"
                            : "text-[#9ba8b2]/70 hover:bg-[#f5f8fa]"
                    }`}
                  >
                    {cell.d}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-2.5 flex items-center justify-between border-t border-[#e8edf0] pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayYmd);
                    setOpen(false);
                  }}
                  className="text-[11px] font-bold text-[#168bd0] hover:underline"
                >
                  Today
                </button>
                {allowClear && value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="text-[11px] font-semibold text-[#b34a4a] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-[#72808e] hover:text-[#14222e]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
