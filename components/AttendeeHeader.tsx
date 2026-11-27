"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Ticket, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

function AttendeeDesktopNav() {
  const pathname = usePathname();
  const isEvents = pathname === "/" || pathname.startsWith("/events");
  const isTicket = pathname.startsWith("/ticket");

  return (
    <nav className="hidden items-center gap-2 sm:flex">
      <Link
        href="/"
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
          isEvents
            ? "bg-[#e1f6fb] text-[#0878ba]"
            : "text-[#72808e] hover:bg-[#f8fafb] hover:text-[#14222e]"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        <span>Events</span>
      </Link>

      <Link
        href="/ticket"
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
          isTicket
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
        className="ml-0.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 py-2.5 text-xs font-bold text-[#14222e] transition hover:border-[#168bd0]/40 hover:bg-[#e1f6fb]/50 hover:text-[#0878ba]"
      >
        <ShieldCheck className="h-4 w-4 text-[#168bd0]" />
        <span>Staff Portal</span>
      </Link>
    </nav>
  );
}

function AttendeeMobileTabs() {
  const pathname = usePathname();
  const isEvents = pathname === "/" || pathname.startsWith("/events");
  const isTicket = pathname.startsWith("/ticket");

  return (
    <nav className="grid grid-cols-2 gap-1.5 border-t border-[#e8edf0] px-3 py-2 sm:hidden">
      <Link
        href="/"
        className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
          isEvents
            ? "bg-[#e1f6fb] text-[#0878ba]"
            : "text-[#72808e] hover:bg-[#f8fafb]"
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Events</span>
      </Link>
      <Link
        href="/ticket"
        className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
          isTicket
            ? "bg-[#e1f6fb] text-[#0878ba]"
            : "text-[#72808e] hover:bg-[#f8fafb]"
        }`}
      >
        <Ticket className="h-3.5 w-3.5" />
        <span>My Ticket</span>
      </Link>
    </nav>
  );
}

function DesktopNavFallback() {
  return (
    <nav className="hidden items-center gap-2 sm:flex">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#72808e]"
      >
        <CalendarDays className="h-4 w-4" />
        <span>Events</span>
      </Link>
      <Link
        href="/ticket"
        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#72808e]"
      >
        <Ticket className="h-4 w-4" />
        <span>My Ticket</span>
      </Link>
      <ThemeToggle />
      <Link
        href="/staff"
        className="ml-0.5 inline-flex items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 py-2.5 text-xs font-bold text-[#14222e]"
      >
        <ShieldCheck className="h-4 w-4 text-[#168bd0]" />
        <span>Staff Portal</span>
      </Link>
    </nav>
  );
}

export function AttendeeHeader() {
  return (
    <div className="sticky top-0 z-30 mx-auto w-full max-w-6xl px-3 pt-3 sm:px-6 sm:pt-4">
      <header className="overflow-hidden rounded-2xl border border-[#e8edf0] bg-white/95 shadow-xs backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-2 px-4 sm:h-20 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cubepass-logo.png"
              alt="Book&Go Logo"
              className="h-8 w-8 shrink-0 object-contain dark:invert sm:h-10 sm:w-10"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-lg font-extrabold tracking-tight text-[#14222e] sm:text-xl">
                Book&amp;Go
              </div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#72808e] sm:text-[11px]">
                Cebu Events
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <Suspense fallback={<DesktopNavFallback />}>
            <AttendeeDesktopNav />
          </Suspense>

          {/* Mobile Right Controls (Theme + Staff) */}
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <ThemeToggle />
            <Link
              href="/staff"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#e8edf0] bg-[#f8fafb] px-2.5 py-1.5 text-xs font-bold text-[#14222e]"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#168bd0]" />
              <span>Staff</span>
            </Link>
          </div>
        </div>

        {/* Mobile Bottom Tab Row (Events / My Ticket) */}
        <Suspense fallback={null}>
          <AttendeeMobileTabs />
        </Suspense>
      </header>
    </div>
  );
}
