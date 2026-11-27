"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface CubeTimePickerProps {
  value: string; // HH:MM (24-hour)
  onChange: (value: string) => void;
  align?: "left" | "right";
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function parse24h(val: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [hStr, mStr] = val.split(":");
  const h24 = Math.min(23, Math.max(0, parseInt(hStr || "9", 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(mStr || "0", 10) || 0));
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute, period };
}

function to24h(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h24 = hour12 % 12;
  if (period === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function CubeTimePicker({
  value,
  onChange,
  align = "left",
}: CubeTimePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { hour12, minute, period } = parse24h(value);

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

  const displayLabel = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
          open
            ? "border-[#168bd0] bg-white text-[#14222e] ring-2 ring-[#20c9db]/25"
            : "border-[#e8edf0] bg-[#f8fafb] text-[#14222e] hover:border-[#168bd0]/50"
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <Clock className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
      </button>

      {open && (
        <div
          className={`absolute bottom-full z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-[#e8edf0] bg-white shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Ocean Header */}
          <div className="hero-ocean flex items-center justify-between px-3.5 py-2.5 text-white">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#42d6df]">
              Select Time
            </span>
            <span className="font-mono text-xs font-extrabold">
              {displayLabel}
            </span>
          </div>

          {/* 3-column Hour / Minute / Period Picker */}
          <div className="grid grid-cols-3 gap-1.5 p-2.5">
            {/* Hours */}
            <div>
              <div className="pb-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                Hr
              </div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto pr-0.5">
                {HOURS_12.map((h) => {
                  const selected = h === hour12;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onChange(to24h(h, minute, period))}
                      className={`flex h-7 w-full items-center justify-center rounded-lg text-xs font-bold transition ${
                        selected
                          ? "bg-gradient-to-br from-[#20c9db] to-[#168bd0] text-white shadow-xs"
                          : "text-[#14222e] hover:bg-[#e1f6fb]/70 hover:text-[#0878ba]"
                      }`}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="pb-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                Min
              </div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto pr-0.5">
                {MINUTES.map((m) => {
                  const selected = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onChange(to24h(hour12, m, period))}
                      className={`flex h-7 w-full items-center justify-center rounded-lg text-xs font-bold transition ${
                        selected
                          ? "bg-gradient-to-br from-[#20c9db] to-[#168bd0] text-white shadow-xs"
                          : "text-[#14222e] hover:bg-[#e1f6fb]/70 hover:text-[#0878ba]"
                      }`}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AM / PM */}
            <div>
              <div className="pb-1 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                Period
              </div>
              <div className="space-y-1.5 pt-0.5">
                {(["AM", "PM"] as const).map((p) => {
                  const selected = p === period;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onChange(to24h(hour12, minute, p))}
                      className={`flex h-9 w-full items-center justify-center rounded-lg text-xs font-extrabold transition ${
                        selected
                          ? "bg-gradient-to-br from-[#20c9db] to-[#168bd0] text-white shadow-xs"
                          : "border border-[#e8edf0] bg-[#f8fafb] text-[#14222e] hover:border-[#168bd0]/40 hover:text-[#0878ba]"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-[#e8edf0] px-3 py-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-[#168bd0] hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
