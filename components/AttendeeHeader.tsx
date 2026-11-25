"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Ticket, ShieldCheck } from "lucide-react";

function AttendeeNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      <Link
        href="/"
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          pathname === "/" || pathname.startsWith("/events")
            ? "bg-[#e1f6fb] text-[#0878ba]"
            : "text-[#72808e] hover:bg-[#f8fafb] hover:text-[#14222e]"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        <span>Events</span>
      </Link>

      <Link
        href="/ticket"
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          pathname.startsWith("/ticket")
            ? "bg-[#e1f6fb] text-[#0878ba]"
            : "text-[#72808e] hover:bg-[#f8fafb] hover:text-[#14222e]"
        }`}
      >
        <Ticket className="h-4 w-4" />
        <span>My Ticket</span>
      </Link>

      <Link
        href="/staff"
        className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-[#e8edf0] bg-[#f8fafb] px-3 py-2 text-xs font-bold text-[#14222e] transition hover:border-[#168bd0]/40 hover:bg-[#e1f6fb]/50 hover:text-[#0878ba]"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-[#168bd0]" />
        <span className="hidden sm:inline">Staff Portal</span>
        <span className="sm:hidden">Staff</span>
      </Link>
    </nav>
  );
}

function AttendeeNavFallback() {
  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#72808e]"
      >
        <CalendarDays className="h-4 w-4" />
        <span>Events</span>
      </Link>
      <Link
        href="/ticket"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#72808e]"
      >
        <Ticket className="h-4 w-4" />
        <span>My Ticket</span>
      </Link>
      <Link
        href="/staff"
        className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-[#e8edf0] bg-[#f8fafb] px-3 py-2 text-xs font-bold text-[#14222e]"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-[#168bd0]" />
        <span className="hidden sm:inline">Staff Portal</span>
        <span className="sm:hidden">Staff</span>
      </Link>
    </nav>
  );
}

export function AttendeeHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e8edf0] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#20c9db] to-[#168bd0] text-white shadow-sm">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight text-[#14222e]">
              EventFlow
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#72808e]">
              Cebu Events
            </div>
          </div>
        </Link>

        <Suspense fallback={<AttendeeNavFallback />}>
          <AttendeeNavLinks />
        </Suspense>
      </div>
    </header>
  );
}
