"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Ticket, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

function AttendeeNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5 sm:gap-2.5">
      <Link
        href="/"
        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
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
        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
          pathname.startsWith("/ticket")
            ? "bg-[#e1f6fb] text-[#0878ba]"
            : "text-[#72808e] hover:bg-[#f8fafb] hover:text-[#14222e]"
        }`}
      >
        <Ticket className="h-4 w-4" />
        <span>My Ticket</span>
      </Link>

      <ThemeToggle />

      <Link
        href="/staff"
        className="ml-0.5 inline-flex items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 py-2.5 text-xs font-bold text-[#14222e] transition hover:border-[#168bd0]/40 hover:bg-[#e1f6fb]/50 hover:text-[#0878ba]"
      >
        <ShieldCheck className="h-4 w-4 text-[#168bd0]" />
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
      <ThemeToggle />
      <Link
        href="/staff"
        className="ml-0.5 inline-flex items-center gap-1.5 rounded-lg border border-[#e8edf0] bg-[#f8fafb] px-3 py-2 text-xs font-bold text-[#14222e]"
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
    <div className="sticky top-0 z-30 mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <header className="flex h-20 items-center justify-between rounded-2xl border border-[#e8edf0] bg-white/95 px-5 shadow-xs backdrop-blur-md sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cubepass-logo.png"
            alt="Book&Go Logo"
            className="h-10 w-10 shrink-0 object-contain dark:invert"
          />
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight text-[#14222e]">
              Book&amp;Go
            </div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#72808e]">
              Cebu Events
            </div>
          </div>
        </Link>

        <Suspense fallback={<AttendeeNavFallback />}>
          <AttendeeNavLinks />
        </Suspense>
      </header>
    </div>
  );
}
