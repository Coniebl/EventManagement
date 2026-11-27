"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { formatCebuDateTime, isoToCebuDateAndTime } from "@/lib/time";
import { CubeDatePicker } from "./CubeDatePicker";
import type { AuditLogEntry } from "@/lib/types";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  event_created: {
    label: "Event Created",
    color: "bg-[#e1f1fb] text-[#168bd0]",
  },
  event_updated: {
    label: "Event Updated",
    color: "bg-[#ddf8fb] text-[#0795a6]",
  },
  event_deleted: {
    label: "Event Deleted",
    color: "bg-[#ffeded] text-[#b34a4a]",
  },
  check_in: {
    label: "Check-in",
    color: "bg-[#dff8f4] text-[#087b72]",
  },
  undo_check_in: {
    label: "Undo Check-in",
    color: "bg-[#fff2df] text-[#be6906]",
  },
  waitlist_promoted: {
    label: "Waitlist Promoted",
    color: "bg-[#e2f8f5] text-[#147d77]",
  },
  registration_cancelled: {
    label: "Registration Cancelled",
    color: "bg-[#ffeded] text-[#b34a4a]",
  },
};

const PAGE_SIZE = 10;

export function StaffAuditClient() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD in Cebu time
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/audit-logs", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await fetch("/api/staff/audit-logs", { cache: "no-store" });
        const data = await res.json();
        if (active && res.ok) setLogs(data.logs ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const filteredLogs = useMemo(() => {
    if (!selectedDate) return logs;
    return logs.filter((log) => {
      const { date } = isoToCebuDateAndTime(log.created_at);
      return date === selectedDate;
    });
  }, [logs, selectedDate]);

  const totalFiltered = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedLogs = filteredLogs.slice(startIdx, startIdx + PAGE_SIZE);
  const shownCount = paginatedLogs.length;
  const rangeStart = totalFiltered === 0 ? 0 : startIdx + 1;
  const rangeEnd = startIdx + shownCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1392b4]">
            Accountability & Security
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#14222e]">
            Audit Log
          </h1>
          <p className="mt-1 text-xs text-[#72808e]">
            Tracks event changes, check-ins, undo check-ins, cancellations, and
            waitlist promotions with staff identity and Cebu timestamp.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-white px-3.5 text-xs font-bold text-[#14222e] transition hover:border-[#168bd0]/40 hover:text-[#168bd0]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="card-panel overflow-visible">
        {/* Date Filter Toolbar right above the table on the left side */}
        <div className="flex items-center justify-start gap-2 border-b border-[#e8edf0] px-5 py-3">
          <CubeDatePicker
            className="w-48"
            value={selectedDate}
            onChange={(val) => {
              setSelectedDate(val);
              setPage(1);
            }}
            placeholder="Filter by date"
            allowClear
            placement="bottom"
            align="left"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#f8fafb] text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                <th className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-[#168bd0]" />
                    When (Cebu Time)
                  </span>
                </th>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8edf0]">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-[#72808e]"
                  >
                    Loading audit logs...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-[#72808e]"
                  >
                    <ClipboardList className="mx-auto mb-2 h-6 w-6 text-[#9ba8b2]" />
                    {selectedDate
                      ? "No audit log entries match the selected date."
                      : "No audit log entries yet."}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const meta = ACTION_LABELS[log.action] ?? {
                    label: log.action,
                    color: "bg-[#e8edf0] text-[#14222e]",
                  };
                  const details = log.details || {};
                  const summary = [
                    details.title ? `Event: ${details.title}` : null,
                    details.attendee_name
                      ? `Attendee: ${details.attendee_name}`
                      : null,
                    details.ticket_code
                      ? `Ticket: ${details.ticket_code}`
                      : null,
                    details.status ? `Status: ${details.status}` : null,
                    details.capacity ? `Capacity: ${details.capacity}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <tr key={log.id} className="hover:bg-[#f8fafb]/70">
                      <td className="whitespace-nowrap px-5 py-3 text-[11px] text-[#72808e]">
                        {formatCebuDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#14222e]">
                        {log.staff_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#14222e]">
                        {summary || log.target_id}
                      </td>
                    </tr>
                  );
                })
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
              {totalFiltered === 1 ? "entry" : "entries"}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous 10 audit entries"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8edf0] bg-white text-[#14222e] transition hover:border-[#168bd0]/40 hover:text-[#168bd0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next 10 audit entries"
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
