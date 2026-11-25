"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  Search,
  AlertCircle,
} from "lucide-react";
import {
  formatCebuDate,
  formatCebuTimeRange,
  getCebuDateBadge,
} from "@/lib/time";
import type { PublicEvent } from "@/lib/types";

export function PublicEventsList() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not load events.");
        }
        if (active) setEvents(data.events ?? []);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load events."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = events.filter((ev) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q)
    );
  });

  const upcoming = filtered.filter((ev) => !ev.is_ended);
  const past = filtered.filter((ev) => ev.is_ended);

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl border border-[#e8edf0] bg-white p-6"
          >
            <div className="h-12 w-12 rounded-xl bg-[#e8edf0]" />
            <div className="mt-4 h-5 w-3/4 rounded bg-[#e8edf0]" />
            <div className="mt-3 h-4 w-1/2 rounded bg-[#f1f5f8]" />
            <div className="mt-6 h-10 w-full rounded-xl bg-[#f1f5f8]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#f5c2c2] bg-[#ffeded] p-6 text-sm text-[#b34a4a]">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="h-4 w-4" />
          Unable to load events
        </div>
        <p className="mt-1 text-xs">{error}</p>
        <p className="mt-2 text-xs text-[#72808e]">
          Make sure you have run <code>supabase/schema.sql</code> and{" "}
          <code>supabase/seed.sql</code> in your Supabase SQL Editor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#14222e]">
            Upcoming Events
          </h2>
          <p className="text-xs text-[#72808e]">
            All event times are displayed in Cebu local time (Asia/Manila, UTC+8)
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72808e]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events or venues..."
            className="h-10 w-full rounded-xl border border-[#e8edf0] bg-white pl-10 pr-4 text-sm text-[#14222e] outline-none transition focus:border-[#168bd0] focus:ring-2 focus:ring-[#168bd0]/15"
          />
        </div>
      </div>

      {/* Upcoming Grid */}
      {upcoming.length === 0 ? (
        <div className="card-panel p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-[#9ba8b2]" />
          <h3 className="mt-3 text-base font-bold text-[#14222e]">
            No upcoming events found
          </h3>
          <p className="mt-1 text-sm text-[#72808e]">
            Check back soon or clear your search filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((event) => {
            const badge = getCebuDateBadge(event.starts_at);
            const isFull = event.spots_left <= 0;
            const fillPct = Math.min(
              100,
              Math.round((event.active_count / Math.max(1, event.capacity)) * 100)
            );

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#e8edf0] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#20c9db]/60 hover:shadow-md"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${
                    isFull
                      ? "bg-[#e59a38]"
                      : "bg-gradient-to-r from-[#20c9db] to-[#168bd0]"
                  }`}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-14 w-13 shrink-0 flex-col items-center justify-center rounded-xl bg-[#e1f6fb] text-[#128eb3]">
                    <span className="text-[10px] font-extrabold tracking-wider">
                      {badge.month}
                    </span>
                    <strong className="text-xl leading-none">
                      {badge.day}
                    </strong>
                  </div>

                  {isFull ? (
                    <span className="inline-flex items-center rounded-full bg-[#fff2df] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#be6906]">
                      Full
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-[#e2f8f5] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#147d77]">
                      Free · Open
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-lg font-bold leading-snug text-[#14222e] group-hover:text-[#168bd0]">
                  {event.title}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-[#72808e]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
                    <span>{formatCebuDate(event.starts_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
                    <span>
                      {formatCebuTimeRange(event.starts_at, event.ends_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#168bd0]" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-[#14222e]">
                      <Users className="h-3.5 w-3.5 text-[#168bd0]" />
                      {isFull
                        ? "Full — Waitlist available"
                        : `${event.spots_left} of ${event.capacity} spots left`}
                    </span>
                    <span className="text-[11px] text-[#72808e]">
                      {fillPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f1f5f8]">
                    <div
                      className={`h-full rounded-full ${
                        isFull ? "bg-[#e59a38]" : "progress-fill"
                      }`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#e8edf0] pt-3.5 text-xs font-bold text-[#168bd0]">
                    <span>
                      {isFull ? "View Details & Waitlist" : "View Details & Register"}
                    </span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Past Events (clearly marked Ended) */}
      {past.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-[#14222e]">
              Past Events
            </h2>
            <span className="rounded-full bg-[#e8edf0] px-2.5 py-0.5 text-[11px] font-bold text-[#72808e]">
              Ended
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => {
              const badge = getCebuDateBadge(event.starts_at);
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-start gap-4 rounded-2xl border border-[#e8edf0] bg-white/80 p-5 opacity-80 transition hover:opacity-100"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f1f5f8] text-[#72808e]">
                    <span className="text-[9px] font-extrabold">
                      {badge.month}
                    </span>
                    <strong className="text-base leading-none">
                      {badge.day}
                    </strong>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-[#14222e]">
                        {event.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-[#e8edf0] px-2 py-0.5 text-[10px] font-bold uppercase text-[#72808e]">
                        Ended
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#72808e]">
                      {formatCebuDate(event.starts_at)} · {event.venue}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
