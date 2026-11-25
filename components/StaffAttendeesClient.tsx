"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  UserCheck,
  RotateCcw,
  XCircle,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Filter,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCebuDateTime } from "@/lib/time";
import { CubeSelect } from "./CubeSelect";
import type {
  DashboardEvent,
  RegistrationRecord,
  RegistrationStatus,
  StaffUser,
} from "@/lib/types";

const PAGE_SIZE = 10;

const REG_STATUS_ORDER: Record<RegistrationStatus, number> = {
  confirmed: 0,
  checked_in: 1,
  waitlisted: 2,
  cancelled: 3,
};

const REG_STATUS_OPTIONS: {
  value: "all" | RegistrationStatus;
  label: string;
  dotClass: string;
}[] = [
  { value: "all", label: "All Statuses", dotClass: "bg-[#168bd0]" },
  { value: "confirmed", label: "Confirmed", dotClass: "bg-[#168bd0]" },
  { value: "checked_in", label: "Checked In", dotClass: "bg-[#14a395]" },
  { value: "waitlisted", label: "Waitlisted", dotClass: "bg-yellow-400" },
  { value: "cancelled", label: "Cancelled", dotClass: "bg-[#d9534f]" },
];

export function StaffAttendeesClient({ staff }: { staff: StaffUser }) {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event") ?? "";
  const isOrganizer = staff.role === "organizer";

  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const activeEventId = eventParam || selectedEventId;
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RegistrationStatus>(
    "all"
  );
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!statusMenuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(e.target as Node)
      ) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [statusMenuOpen]);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/staff/events", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      const list = (data.events ?? []) as DashboardEvent[];
      setEvents(list);
      setSelectedEventId((prev) => prev || list[0]?.id || "");
    }
  }, []);

  const loadRegistrations = useCallback(async (eventId: string) => {
    if (!eventId) {
      setRegistrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/events/${eventId}/registrations`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setRegistrations(data.registrations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initEvents() {
      const res = await fetch("/api/staff/events", { cache: "no-store" });
      const data = await res.json();
      if (active && res.ok) {
        const list = (data.events ?? []) as DashboardEvent[];
        setEvents(list);
        setSelectedEventId((prev) => eventParam || prev || list[0]?.id || "");
      }
    }
    initEvents();
    return () => {
      active = false;
    };
  }, [eventParam]);

  useEffect(() => {
    if (!activeEventId) return;
    let active = true;
    async function initRegs() {
      try {
        const res = await fetch(
          `/api/staff/events/${activeEventId}/registrations`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (active && res.ok) setRegistrations(data.registrations ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }
    initRegs();
    return () => {
      active = false;
    };
  }, [activeEventId]);

  const currentEvent = events.find((e) => e.id === activeEventId);

  const handlePromote = async () => {
    if (!activeEventId) return;
    setBusyId("promote");
    setBanner(null);
    try {
      const res = await fetch(
        `/api/staff/events/${activeEventId}/promote`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Promotion failed." });
        return;
      }
      setBanner({
        type: "success",
        text: `Promoted ${data.registration.full_name} (${data.registration.ticket_code}) to Confirmed!`,
      });
      await Promise.all([loadEvents(), loadRegistrations(activeEventId)]);
    } finally {
      setBusyId(null);
    }
  };

  const handleUndoCheckin = async (reg: RegistrationRecord) => {
    setBusyId(reg.id);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/staff/registrations/${reg.id}/undo-checkin`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Undo failed." });
        return;
      }
      setBanner({
        type: "success",
        text: `Undid check-in for ${reg.full_name}. Ticket is back to Confirmed.`,
      });
      await Promise.all([loadEvents(), loadRegistrations(activeEventId)]);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (reg: RegistrationRecord) => {
    if (!confirm(`Cancel registration for ${reg.full_name}?`)) return;
    setBusyId(reg.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/staff/registrations/${reg.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.error || "Cancellation failed." });
        return;
      }
      setBanner({
        type: "success",
        text: `Cancelled registration for ${reg.full_name}.`,
      });
      await Promise.all([loadEvents(), loadRegistrations(activeEventId)]);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const base = registrations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.ticket_code.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    });

    // Arrange by status: Confirmed -> Checked In -> Waitlisted -> Cancelled
    return [...base].sort((a, b) => {
      const orderDiff = REG_STATUS_ORDER[a.status] - REG_STATUS_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      if (a.status === "waitlisted" && b.status === "waitlisted") {
        return (a.waitlist_position ?? 9999) - (b.waitlist_position ?? 9999);
      }
      return (
        new Date(b.registered_at).getTime() -
        new Date(a.registered_at).getTime()
      );
    });
  }, [registrations, statusFilter, search]);

  const activeStatusMeta =
    REG_STATUS_OPTIONS.find((o) => o.value === statusFilter) ??
    REG_STATUS_OPTIONS[0];

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedAttendees = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const shownCount = paginatedAttendees.length;
  const rangeStart = totalFiltered === 0 ? 0 : startIdx + 1;
  const rangeEnd = startIdx + shownCount;

  const canPromote =
    isOrganizer &&
    currentEvent &&
    currentEvent.waitlisted_count > 0 &&
    currentEvent.active_count < currentEvent.capacity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1392b4]">
            Attendee Directory
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#14222e]">
            {currentEvent ? currentEvent.title : "Registered Attendees"}
          </h1>
          <p className="mt-1 text-xs text-[#72808e]">
            View registrations, check-in status, promote waitlisted guests, undo
            check-ins, and export Excel/CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!eventParam && (
            <CubeSelect
              className="w-64"
              menuAlign="right"
              value={activeEventId}
              onChange={(val) => {
                setSelectedEventId(val);
                setPage(1);
              }}
              placeholder="Select event"
              options={events.map((ev) => ({
                value: ev.id,
                label: ev.title,
              }))}
            />
          )}

          {activeEventId && (
            <a
              href={`/api/staff/events/${activeEventId}/export`}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-white px-3.5 text-xs font-bold text-[#14222e] hover:border-[#168bd0]/40 hover:text-[#168bd0]"
            >
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </a>
          )}
        </div>
      </div>

      {/* Totals Summary (Level 1 #06) */}
      {currentEvent && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card-panel flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e1f1fb] text-[#168bd0]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#14222e]">
                {currentEvent.active_count} / {currentEvent.capacity}
              </div>
              <div className="text-xs text-[#72808e]">
                Registered / Capacity
              </div>
            </div>
          </div>

          <div className="card-panel flex items-center gap-3.5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dff7f4] text-[#087b72]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#14222e]">
                {currentEvent.checked_in_count} / {currentEvent.active_count}
              </div>
              <div className="text-xs text-[#72808e]">
                Checked In / Registered
              </div>
            </div>
          </div>

          <div className="card-panel flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff2df] text-[#be6906]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-[#14222e]">
                  {currentEvent.waitlisted_count}
                </div>
                <div className="text-xs text-[#72808e]">On Waitlist</div>
              </div>
            </div>

            {isOrganizer && currentEvent.waitlisted_count > 0 && (
              <button
                type="button"
                onClick={handlePromote}
                disabled={!canPromote || busyId === "promote"}
                title={
                  canPromote
                    ? "Promote #1 waitlisted attendee"
                    : "Event is full — cancel a registration or increase capacity first"
                }
                className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold"
              >
                <UserCheck className="h-3.5 w-3.5" />
                {busyId === "promote" ? "Promoting..." : "Promote #1"}
              </button>
            )}
          </div>
        </div>
      )}

      {banner && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold ${
            banner.type === "success"
              ? "border-[#b8efea] bg-[#e1f9f6] text-[#057b74]"
              : "border-[#f5c2c2] bg-[#ffeded] text-[#b34a4a]"
          }`}
        >
          <span className="flex items-center gap-2">
            {banner.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {banner.text}
          </span>
          <button type="button" onClick={() => setBanner(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Table */}
      <div className="card-panel overflow-visible">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e8edf0] p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72808e]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, ticket code, or email..."
              className="h-9 w-full rounded-lg border border-[#e8edf0] bg-[#f8fafb] pl-9 pr-3 text-xs text-[#14222e] outline-none focus:border-[#168bd0] focus:bg-white"
            />
          </div>

          <div ref={statusMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setStatusMenuOpen((o) => !o)}
              aria-expanded={statusMenuOpen}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${
                statusFilter !== "all" || statusMenuOpen
                  ? "border-[#168bd0]/50 bg-[#e1f6fb] text-[#0878ba]"
                  : "border-[#e8edf0] bg-white text-[#14222e] hover:border-[#168bd0]/40"
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-[#168bd0]" />
              <span className={`h-2 w-2 rounded-full ${activeStatusMeta.dotClass}`} />
              <span>{activeStatusMeta.label}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#72808e]" />
            </button>

            {statusMenuOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-[#e8edf0] bg-white p-1.5 shadow-xl">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                  Filter Attendee Status
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {REG_STATUS_OPTIONS.map((opt) => {
                    const selected = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setPage(1);
                          setStatusMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                          selected
                            ? "bg-[#e1f6fb] text-[#0878ba]"
                            : "text-[#14222e] hover:bg-[#f8fafb]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${opt.dotClass}`} />
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#f8fafb] text-[10px] font-extrabold uppercase tracking-wider text-[#72808e]">
                <th className="px-4 py-3">Attendee</th>
                <th className="px-3 py-3">Mobile</th>
                <th className="px-3 py-3">Ticket Code</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Registered (Cebu)</th>
                <th className="px-3 py-3">Check-in Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8edf0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#72808e]">
                    Loading attendees...
                  </td>
                </tr>
              ) : paginatedAttendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#72808e]">
                    No matching attendees found.
                  </td>
                </tr>
              ) : (
                paginatedAttendees.map((reg) => (
                  <tr key={reg.id} className="hover:bg-[#f8fafb]/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#14222e]">
                        {reg.full_name}
                      </div>
                      <div className="text-[11px] text-[#72808e]">
                        {reg.email}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-[#14222e]">
                      {reg.mobile}
                    </td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-[#f1f5f8] px-2 py-1 font-mono text-[11px] font-bold text-[#092d40]">
                        {reg.ticket_code}
                      </code>
                    </td>
                    <td className="px-3 py-3">
                      {reg.status === "checked_in" && (
                        <span className="inline-flex rounded-full bg-[#dff8f4] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#087b72]">
                          Checked In
                        </span>
                      )}
                      {reg.status === "confirmed" && (
                        <span className="inline-flex rounded-full bg-[#e1f1fb] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#168bd0]">
                          Confirmed
                        </span>
                      )}
                      {reg.status === "waitlisted" && (
                        <span className="inline-flex rounded-full bg-[#fff2df] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#be6906]">
                          Waitlist #{reg.waitlist_position ?? "—"}
                        </span>
                      )}
                      {reg.status === "cancelled" && (
                        <span className="inline-flex rounded-full bg-[#ffeded] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#b34a4a]">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-[#72808e]">
                      {formatCebuDateTime(reg.registered_at)}
                    </td>
                    <td className="px-3 py-3 text-[11px] text-[#72808e]">
                      {reg.checked_in_at ? (
                        <div>
                          <div className="font-semibold text-[#087b72]">
                            {formatCebuDateTime(reg.checked_in_at)}
                          </div>
                          {reg.checked_in_by_name && (
                            <div className="text-[10px]">
                              by {reg.checked_in_by_name}
                            </div>
                          )}
                        </div>
                      ) : reg.undone_at ? (
                        <div className="text-[10px] text-[#be6906]">
                          Undone {formatCebuDateTime(reg.undone_at)}
                          {reg.undone_by_name ? ` by ${reg.undone_by_name}` : ""}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {reg.status === "checked_in" && (
                          <button
                            type="button"
                            disabled={busyId === reg.id}
                            onClick={() => handleUndoCheckin(reg)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#f5d8aa] bg-[#fff2df] px-2.5 py-1 text-[11px] font-bold text-[#9a5705] hover:bg-[#ffe8c5] disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Undo Check-in
                          </button>
                        )}
                        {isOrganizer &&
                          (reg.status === "confirmed" ||
                            reg.status === "waitlisted") && (
                            <button
                              type="button"
                              disabled={busyId === reg.id}
                              onClick={() => handleCancel(reg)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#f5c2c2] bg-white px-2.5 py-1 text-[11px] font-bold text-[#b34a4a] hover:bg-[#ffeded] disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </button>
                          )}
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
              {totalFiltered === 1 ? "attendee" : "attendees"}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous 10 attendees"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8edf0] bg-white text-[#14222e] transition hover:border-[#168bd0]/40 hover:text-[#168bd0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next 10 attendees"
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
