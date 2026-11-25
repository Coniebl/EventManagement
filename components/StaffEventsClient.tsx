"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Calendar,
  MapPin,
  Users,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  formatCebuDate,
  formatCebuTimeRange,
  isoToCebuDateAndTime,
  cebuDateAndTimeToIso,
} from "@/lib/time";
import type { DashboardEvent, EventStatus, StaffUser } from "@/lib/types";

interface EventFormState {
  id?: string;
  title: string;
  description: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: EventStatus;
}

function defaultForm(): EventFormState {
  const today = isoToCebuDateAndTime(new Date().toISOString()).date;
  return {
    title: "",
    description: "",
    venue: "",
    date: today,
    startTime: "09:00",
    endTime: "17:00",
    capacity: 30,
    status: "draft",
  };
}

export function StaffEventsClient({ staff }: { staff: StaffUser }) {
  const isOrganizer = staff.role === "organizer";
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | EventStatus>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const openCreate = () => {
    setForm(defaultForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (ev: DashboardEvent) => {
    const startParts = isoToCebuDateAndTime(ev.starts_at);
    const endParts = isoToCebuDateAndTime(ev.ends_at);
    setForm({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      venue: ev.venue,
      date: startParts.date,
      startTime: startParts.time,
      endTime: endParts.time,
      capacity: ev.capacity,
      status: ev.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim() || !form.venue.trim()) {
      setFormError("Title and venue are required.");
      return;
    }

    const starts_at = cebuDateAndTimeToIso(form.date, form.startTime);
    const ends_at = cebuDateAndTimeToIso(form.date, form.endTime);

    if (new Date(ends_at) <= new Date(starts_at)) {
      setFormError("End time must be after start time.");
      return;
    }

    if (!Number.isInteger(form.capacity) || form.capacity < 1) {
      setFormError("Capacity must be at least 1.");
      return;
    }

    setSaving(true);
    try {
      const url = form.id ? `/api/staff/events/${form.id}` : "/api/staff/events";
      const method = form.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          venue: form.venue,
          starts_at,
          ends_at,
          capacity: form.capacity,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Could not save event.");
        return;
      }

      setModalOpen(false);
      setNotice(
        form.id
          ? `Updated "${form.title}" successfully.`
          : `Created "${form.title}" successfully.`
      );
      await load();
    } catch {
      setFormError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    filter === "all" ? events : events.filter((e) => e.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1392b4]">
            Event Management
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#14222e]">
            Events
          </h1>
          <p className="mt-1 text-xs text-[#72808e]">
            Only <strong>Published</strong> events appear to attendees. Closed
            events stop accepting registrations.
          </p>
        </div>

        {isOrganizer ? (
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-white px-3.5 py-2 text-xs font-semibold text-[#72808e]">
            <Lock className="h-3.5 w-3.5 text-[#168bd0]" />
            Door Staff (read-only event view)
          </div>
        )}
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-[#b8efea] bg-[#e1f9f6] px-4 py-3 text-xs font-bold text-[#057b74]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status Filter */}
      <div className="inline-flex rounded-xl border border-[#e8edf0] bg-white p-1 text-xs font-bold">
        {(["all", "published", "draft", "closed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-3 py-1.5 capitalize transition ${
              filter === tab
                ? "bg-[#e1f6fb] text-[#0878ba]"
                : "text-[#72808e] hover:text-[#14222e]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Event Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-[#e8edf0] bg-white p-5"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="card-panel relative flex flex-col overflow-hidden p-5"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${
                  ev.status === "published"
                    ? "bg-gradient-to-r from-[#20c9db] to-[#168bd0]"
                    : ev.status === "draft"
                      ? "bg-[#e59a38]"
                      : "bg-[#9ba8b2]"
                }`}
              />

              <div className="flex items-start justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                    ev.status === "published"
                      ? "bg-[#e2f8f5] text-[#147d77]"
                      : ev.status === "draft"
                        ? "bg-[#fff2df] text-[#be6906]"
                        : "bg-[#e8edf0] text-[#72808e]"
                  }`}
                >
                  {ev.status}
                </span>

                {isOrganizer && (
                  <button
                    type="button"
                    onClick={() => openEdit(ev)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e8edf0] px-2.5 py-1 text-[11px] font-bold text-[#14222e] hover:border-[#168bd0]/40 hover:text-[#168bd0]"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              <h3 className="mt-3 text-base font-bold text-[#14222e]">
                {ev.title}
              </h3>

              <div className="mt-2.5 space-y-1 text-xs text-[#72808e]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
                  <span>
                    {formatCebuDate(ev.starts_at)} ·{" "}
                    {formatCebuTimeRange(ev.starts_at, ev.ends_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
                  <span className="truncate">{ev.venue}</span>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-3 gap-2 border-t border-[#e8edf0] pt-4 text-center">
                <div>
                  <div className="text-sm font-extrabold text-[#14222e]">
                    {ev.active_count}/{ev.capacity}
                  </div>
                  <div className="text-[10px] font-semibold text-[#72808e]">
                    Registered
                  </div>
                </div>
                <div className="border-x border-[#e8edf0]">
                  <div className="text-sm font-extrabold text-[#087b72]">
                    {ev.checked_in_count}
                  </div>
                  <div className="text-[10px] font-semibold text-[#72808e]">
                    Checked In
                  </div>
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#be6906]">
                    {ev.waitlisted_count}
                  </div>
                  <div className="text-[10px] font-semibold text-[#72808e]">
                    Waitlisted
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && isOrganizer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050d13]/60 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e8edf0] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1392b4]">
                  {form.id ? "Edit Event" : "New Event"}
                </p>
                <h2 className="text-lg font-extrabold text-[#14222e]">
                  {form.id ? "Update Event Details" : "Create New Event"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f8fafb] text-[#72808e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#f5c2c2] bg-[#ffeded] px-3.5 py-2.5 text-xs font-semibold text-[#b34a4a]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#14222e]">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Cebu Dev Meetup 2026"
                  className="mt-1 h-10 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#168bd0] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14222e]">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Short summary of the event..."
                  className="mt-1 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] p-3 text-sm outline-none focus:border-[#168bd0] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14222e]">
                  Venue *
                </label>
                <input
                  type="text"
                  required
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="e.g. Ayala Center Cebu, Function Room 2"
                  className="mt-1 h-10 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#168bd0] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#14222e]">
                    Date (Cebu) *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 h-10 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-2.5 text-xs outline-none focus:border-[#168bd0] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14222e]">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-2.5 text-xs outline-none focus:border-[#168bd0] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14222e]">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-2.5 text-xs outline-none focus:border-[#168bd0] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#14222e]">
                    Capacity *
                  </label>
                  <div className="relative mt-1">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72808e]" />
                    <input
                      type="number"
                      min={1}
                      required
                      value={form.capacity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          capacity: parseInt(e.target.value || "0", 10),
                        })
                      }
                      className="h-10 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] pl-9 pr-3 text-sm outline-none focus:border-[#168bd0] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#14222e]">
                    Status *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as EventStatus,
                      })
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#168bd0] focus:bg-white"
                  >
                    <option value="draft">Draft (hidden)</option>
                    <option value="published">Published (visible)</option>
                    <option value="closed">Closed (no new signups)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 rounded-xl border border-[#e8edf0] bg-white px-4 text-xs font-bold text-[#72808e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary h-10 rounded-xl px-5 text-xs font-bold"
                >
                  {saving ? "Saving..." : form.id ? "Save Changes" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
