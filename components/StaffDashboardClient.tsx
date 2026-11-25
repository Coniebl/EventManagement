"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { formatCebuDate, formatCebuTimeRange } from "@/lib/time";
import type { DashboardEvent, StaffUser } from "@/lib/types";

export function StaffDashboardClient({ staff }: { staff: StaffUser }) {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalEvents = events.length;
  const totalConfirmed = events.reduce((s, e) => s + e.active_count, 0);
  const totalCheckedIn = events.reduce((s, e) => s + e.checked_in_count, 0);
  const totalWaitlisted = events.reduce((s, e) => s + e.waitlisted_count, 0);

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
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-white px-3.5 text-xs font-bold text-[#14222e] hover:bg-[#f8fafb]"
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

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card-panel p-5">
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

        <div className="card-panel p-5">
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
          <div className="mt-0.5 text-xs text-[#72808e]">
            Confirmed + Checked In
          </div>
        </div>

        <div className="card-panel p-5">
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

        <div className="card-panel p-5">
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
      <div className="card-panel overflow-hidden">
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#f8fafb] text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                <th className="px-5 py-3">Event</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Capacity</th>
                <th className="px-3 py-3 text-right">Confirmed</th>
                <th className="px-3 py-3 text-right">Checked In</th>
                <th className="px-3 py-3 text-right">Waitlisted</th>
                <th className="px-3 py-3 text-right">Cancelled</th>
                <th className="px-3 py-3 text-right">No-shows</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8edf0]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[#72808e]">
                    Loading event statistics...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[#72808e]">
                    No events found.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#f8fafb]/70">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-[#14222e]">{ev.title}</div>
                      <div className="mt-0.5 text-[11px] text-[#72808e]">
                        {formatCebuDate(ev.starts_at)} ·{" "}
                        {formatCebuTimeRange(ev.starts_at, ev.ends_at)}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          ev.status === "published"
                            ? "bg-[#e2f8f5] text-[#147d77]"
                            : ev.status === "draft"
                              ? "bg-[#fff2df] text-[#be6906]"
                              : "bg-[#e8edf0] text-[#72808e]"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-[#14222e]">
                      {ev.active_count} / {ev.capacity}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-[#168bd0]">
                      {ev.confirmed_count}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-[#087b72]">
                      {ev.checked_in_count}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-[#be6906]">
                      {ev.waitlisted_count}
                    </td>
                    <td className="px-3 py-3.5 text-right text-[#72808e]">
                      {ev.cancelled_count}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-[#b34a4a]">
                      {ev.has_started ? ev.no_shows : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
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
      </div>
    </div>
  );
}
