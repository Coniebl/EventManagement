"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Download,
  QrCode,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
} from "lucide-react";
import { formatCebuDate, formatCebuTimeRange } from "@/lib/time";
import type { DashboardEvent, EventStatus, StaffUser } from "@/lib/types";

const STATUS_ORDER: Record<EventStatus, number> = {
  published: 0,
  draft: 1,
  closed: 2,
};

const STATUS_OPTIONS: {
  value: "all" | EventStatus;
  label: string;
  dotClass: string;
}[] = [
  { value: "all", label: "All Statuses", dotClass: "bg-[#168bd0]" },
  { value: "published", label: "Published", dotClass: "bg-[#14a395]" },
  { value: "draft", label: "Draft", dotClass: "bg-yellow-400" },
  { value: "closed", label: "Closed", dotClass: "bg-[#9ba8b2]" },
];

const PAGE_SIZE = 10;

export function StaffDashboardClient({ staff }: { staff: StaffUser }) {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/events", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setEvents(data.events ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/staff/events", { cache: "no-store" });
        const data = await res.json();
        if (active && res.ok) setEvents(data.events ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [filterOpen]);

  const totalEvents = events.length;
  const totalConfirmed = events.reduce((s, e) => s + e.confirmed_count, 0);
  const totalCheckedIn = events.reduce((s, e) => s + e.checked_in_count, 0);
  const totalWaitlisted = events.reduce((s, e) => s + e.waitlisted_count, 0);

  // Filter by status and sort: Published -> Draft -> Closed (then by start date)
  const filteredSorted = useMemo(() => {
    const base =
      statusFilter === "all"
        ? events
        : events.filter((e) => e.status === statusFilter);
    return [...base].sort((a, b) => {
      const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  }, [events, statusFilter]);

  const totalFiltered = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedEvents = filteredSorted.slice(startIdx, startIdx + PAGE_SIZE);
  const shownCount = paginatedEvents.length;
  const rangeStart = totalFiltered === 0 ? 0 : startIdx + 1;
  const rangeEnd = startIdx + shownCount;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1392b4]">
            Admin Overview
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#14222e]">
            Staff Dashboard
          </h1>
          <p className="mt-1 text-xs text-[#72808e]">
            Signed in as <strong>{staff.name}</strong> (
            {staff.role === "organizer" ? "Organizer" : "Door Staff"}). All
            times in Cebu local time (Asia/Manila).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-white px-3.5 text-xs font-bold text-[#14222e] transition hover:bg-[#f8fafb]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <Link
            href="/staff/checkin"
            className="btn-primary inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-bold"
          >
            <QrCode className="h-4 w-4" />
            Open QR Scanner
          </Link>
        </div>
      </div>

      {/* Top KPI Cards with responsive hover zoom */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card-panel cursor-default p-5 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-[#20c9db]/60 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ddf8fb] text-[#0795a6]">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="rounded-full bg-[#e6f8f5] px-2 py-0.5 text-[10px] font-bold text-[#168c84]">
              Total
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#14222e]">
            {totalEvents}
          </div>
          <div className="mt-0.5 text-xs text-[#72808e]">Managed Events</div>
        </div>

        <div className="card-panel cursor-default p-5 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-[#168bd0]/60 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e1f1fb] text-[#168bd0]">
              <Users className="h-4 w-4" />
            </div>
            <span className="rounded-full bg-[#e1f1fb] px-2 py-0.5 text-[10px] font-bold text-[#168bd0]">
              Active
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#14222e]">
            {totalConfirmed}
          </div>
          <div className="mt-0.5 text-xs text-[#72808e]">Confirmed</div>
        </div>

        <div className="card-panel cursor-default p-5 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-[#42c8c2]/60 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dff7f4] text-[#168c84]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="rounded-full bg-[#e6f8f5] px-2 py-0.5 text-[10px] font-bold text-[#168c84]">
              Door
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#14222e]">
            {totalCheckedIn}
          </div>
          <div className="mt-0.5 text-xs text-[#72808e]">Checked In</div>
        </div>

        <div className="card-panel cursor-default p-5 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-amber-400/60 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff2df] text-[#be6906]">
              <Clock className="h-4 w-4" />
            </div>
            <span className="rounded-full bg-[#fff2df] px-2 py-0.5 text-[10px] font-bold text-[#be6906]">
              Queue
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#14222e]">
            {totalWaitlisted}
          </div>
          <div className="mt-0.5 text-xs text-[#72808e]">Waitlisted</div>
        </div>
      </div>

      {/* Events Breakdown Table (Level 2 #10) */}
      <div className="card-panel overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf0] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[#14222e]">
              Event Attendance Summary
            </h2>
            <p className="text-xs text-[#72808e]">
              Capacity, confirmed, waitlisted, cancelled, checked in, and
              no-shows (shown after event starts)
            </p>
          </div>

          {staff.role === "organizer" && (
            <Link
              href="/staff/events"
              className="text-xs font-bold text-[#168bd0] hover:underline"
            >
              Manage Events →
            </Link>
          )}
        </div>

        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#f8fafb] text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                <th className="px-5 py-3 text-left">Event</th>
                <th className="px-3 py-3 text-center">
                  <div
                    ref={filterMenuRef}
                    className="relative inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Status</span>
                    <button
                      type="button"
                      onClick={() => setFilterOpen((o) => !o)}
                      aria-label="Filter by status"
                      aria-expanded={filterOpen}
                      title={
                        statusFilter === "all"
                          ? "Filter by status"
                          : `Filtered: ${statusFilter}`
                      }
                      className={`relative inline-flex h-5 w-5 items-center justify-center rounded-md border transition ${
                        statusFilter !== "all" || filterOpen
                          ? "border-[#168bd0]/50 bg-[#e1f6fb] text-[#0878ba]"
                          : "border-transparent text-[#72808e] hover:border-[#e8edf0] hover:bg-white hover:text-[#14222e]"
                      }`}
                    >
                      <Filter className="h-3 w-3" />
                      {statusFilter !== "all" && (
                        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#168bd0]" />
                      )}
                    </button>

                    {filterOpen && (
                      <div className="absolute left-0 top-full z-40 mt-2 w-44 rounded-xl border border-[#e8edf0] bg-white p-1.5 normal-case tracking-normal shadow-xl">
                        <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                          Filter Status
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {STATUS_OPTIONS.map((opt) => {
                            const selected = statusFilter === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setStatusFilter(opt.value);
                                  setPage(1);
                                  setFilterOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                                  selected
                                    ? "bg-[#e1f6fb] text-[#0878ba]"
                                    : "text-[#14222e] hover:bg-[#f8fafb]"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={`h-2 w-2 rounded-full ${opt.dotClass}`}
                                  />
                                  {opt.label}
                                </span>
                                {selected && (
                                  <Check className="h-3.5 w-3.5 text-[#0878ba]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-center">Capacity</th>
                <th className="px-3 py-3 text-center">Confirmed</th>
                <th className="px-3 py-3 text-center">Checked In</th>
                <th className="px-3 py-3 text-center">Waitlisted</th>
                <th className="px-3 py-3 text-center">Cancelled</th>
                <th className="px-3 py-3 text-center">No-shows</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8edf0]">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[#72808e]"
                  >
                    Loading event statistics...
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[#72808e]"
                  >
                    No events match this status filter.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#f8fafb]/70">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-[#14222e]">{ev.title}</div>
                      <div className="mt-0.5 text-[11px] text-[#72808e]">
                        {formatCebuDate(ev.starts_at)} ·{" "}
                        {formatCebuTimeRange(ev.starts_at, ev.ends_at)}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          ev.status === "published"
                            ? "bg-[#e2f8f5] text-[#147d77]"
                            : ev.status === "draft"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300"
                              : "bg-[#e8edf0] text-[#72808e] dark:bg-slate-700/60 dark:text-slate-300"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold tabular-nums text-[#14222e]">
                      {ev.active_count} / {ev.capacity}
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold tabular-nums text-[#168bd0]">
                      {ev.confirmed_count}
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold tabular-nums text-[#087b72]">
                      {ev.checked_in_count}
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold tabular-nums text-[#be6906]">
                      {ev.waitlisted_count}
                    </td>
                    <td className="px-3 py-3.5 text-center tabular-nums text-[#72808e]">
                      {ev.cancelled_count}
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold tabular-nums text-[#b34a4a]">
                      {ev.has_started ? ev.no_shows : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <Link
                          href={`/staff/attendees?event=${ev.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#e8edf0] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#14222e] hover:border-[#168bd0]/40 hover:text-[#168bd0]"
                        >
                          Attendees
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                        <a
                          href={`/api/staff/events/${ev.id}/export`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#e8edf0] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#72808e] hover:text-[#14222e]"
                          title="Export CSV"
                        >
                          <Download className="h-3 w-3" />
                          CSV
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (10 per page) */}
        {!loading && totalFiltered > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8edf0] px-5 py-3 text-xs text-[#72808e]">
            <div>
              Showing{" "}
              <strong className="text-[#14222e]">
                {rangeStart === 1 && rangeEnd === shownCount
                  ? shownCount
                  : `${rangeStart}–${rangeEnd}`}
              </strong>{" "}
              out of <strong className="text-[#14222e]">{totalFiltered}</strong>{" "}
              {totalFiltered === 1 ? "event" : "events"}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous 10 events"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8edf0] bg-white text-[#14222e] transition hover:border-[#168bd0]/40 hover:text-[#168bd0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next 10 events"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8edf0] bg-white text-[#14222e] transition hover:border-[#168bd0]/40 hover:text-[#168bd0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
