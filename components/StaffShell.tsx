"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCog,
  Users,
  QrCode,
  ClipboardList,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import type { StaffUser } from "@/lib/types";

interface StaffShellProps {
  staff: StaffUser;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/staff/events", label: "Events", icon: CalendarCog, exact: false },
  { href: "/staff/attendees", label: "Attendees", icon: Users, exact: false },
  { href: "/staff/checkin", label: "QR Check-in", icon: QrCode, exact: false },
  { href: "/staff/audit", label: "Audit Log", icon: ClipboardList, exact: false },
];

export function StaffShell({ staff, children }: StaffShellProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/staff/logout", { method: "POST" });
    window.location.assign("/staff/login");
  };

  const initials = staff.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f8fa] lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r border-[#e8edf0] bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
        <div className="mb-5 flex items-center gap-3 border-b border-[#e8edf0] px-1.5 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cubepass-logo.png"
            alt="Book&Go Logo"
            className="h-9 w-9 shrink-0 object-contain dark:invert"
          />
          <div className="min-w-0 leading-tight">
            <div className="text-lg font-extrabold tracking-tight text-[#14222e]">
              Book&amp;Go
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#72808e]">
              Admin Console
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <ThemeToggle />
          </div>
        </div>

        <div className="px-3.5 pb-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9ba8b2]">
          Operations
        </div>
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-[#20c9db]/18 to-[#168bd0]/8 text-[#0878ba] ring-1 ring-[#20c9db]/35"
                    : "text-[#72808e] hover:bg-[#f8fafb] hover:text-[#14222e]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3.5 pt-6">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 py-2.5 text-xs font-bold text-[#14222e] transition hover:border-[#168bd0]/40 hover:text-[#168bd0]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Attendee Site
          </Link>

          <div className="flex items-center gap-3 border-t border-[#e8edf0] pt-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dff7fa] text-xs font-extrabold text-[#087ea0]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-[#14222e]">
                {staff.name}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#1392b4]">
                {staff.role === "organizer" ? "Organizer" : "Door Staff"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8edf0] text-[#72808e] transition hover:border-[#f5c2c2] hover:bg-[#ffeded] hover:text-[#b34a4a]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-col">
        {/* Mobile Header & Navigation */}
        <header className="sticky top-0 z-30 border-b border-[#e8edf0] bg-white/95 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cubepass-logo.png"
                alt="Book&Go Logo"
                className="h-7 w-7 shrink-0 object-contain dark:invert"
              />
              <div>
                <div className="text-sm font-extrabold text-[#14222e]">
                  Book&amp;Go Admin
                </div>
                <div className="text-[10px] font-semibold text-[#1392b4]">
                  {staff.name} ·{" "}
                  {staff.role === "organizer" ? "Organizer" : "Door Staff"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/"
                className="rounded-lg border border-[#e8edf0] px-2.5 py-1.5 text-[11px] font-bold text-[#72808e]"
              >
                Public
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8edf0] text-[#72808e]"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-t border-[#e8edf0] px-3 py-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                    active
                      ? "bg-[#e1f6fb] text-[#0878ba]"
                      : "text-[#72808e]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
