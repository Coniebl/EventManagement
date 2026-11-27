"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  User,
} from "lucide-react";
import {
  formatCebuDate,
  formatCebuTimeRange,
  formatCebuDateTime,
} from "@/lib/time";
import type { RegistrationRecord } from "@/lib/types";

interface TicketPassCardProps {
  registration: RegistrationRecord;
  event: {
    id: string;
    title: string;
    venue: string;
    starts_at: string;
    ends_at: string;
  };
  qrDataUrl?: string | null;
  onCancel?: () => Promise<void>;
  cancelling?: boolean;
  onCopyCode?: () => void;
}

export function TicketPassCard({
  registration,
  event,
  qrDataUrl,
  onCancel,
  cancelling,
  onCopyCode,
}: TicketPassCardProps) {
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registration.ticket_code);
      setCopied(true);
      onCopyCode?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in non-HTTPS contexts
    }
  };

  const isConfirmed = registration.status === "confirmed";
  const isCheckedIn = registration.status === "checked_in";
  const isWaitlisted = registration.status === "waitlisted";
  const isCancelled = registration.status === "cancelled";

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#e8edf0] bg-white shadow-sm">
      {/* Header Banner */}
      <div className="hero-ocean flex flex-wrap items-center justify-between gap-3 px-7 py-5 text-white">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#42d6df]">
            Book&amp;Go Ticket
          </span>
          <h2 className="mt-1 text-2xl font-bold leading-snug tracking-tight">
            {event.title}
          </h2>
        </div>

        <div>
          {isConfirmed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e2f8f5] px-3 py-1 text-xs font-bold text-[#087b72]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmed
            </span>
          )}
          {isCheckedIn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#dff8f4] px-3 py-1 text-xs font-bold text-[#087b72]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Checked In
            </span>
          )}
          {isWaitlisted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2df] px-3 py-1 text-xs font-bold text-[#be6906]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Waitlist #{registration.waitlist_position ?? "—"}
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ffeded] px-3 py-1 text-xs font-bold text-[#b34a4a]">
              <XCircle className="h-3.5 w-3.5" />
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Body (horizontal on md+, stacked on phones) */}
      <div className="grid gap-6 p-6 sm:p-7 md:grid-cols-12 md:items-stretch">
        {/* Left Column: Attendee & Event Details */}
        <div className="flex flex-col justify-between gap-4 md:col-span-7">
          <div className="space-y-4 rounded-xl border border-[#e8edf0] bg-[#f8fafb] p-5 text-sm">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-[#168bd0]" />
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#72808e]">
                  Attendee
                </div>
                <div className="text-base font-bold text-[#14222e]">
                  {registration.full_name}
                </div>
                <div className="truncate text-xs text-[#72808e]">
                  {registration.email} · {registration.mobile}
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-[#e8edf0] pt-4 sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#168bd0]" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#72808e]">
                    Date
                  </div>
                  <div className="text-sm font-semibold text-[#14222e]">
                    {formatCebuDate(event.starts_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#168bd0]" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#72808e]">
                    Time
                  </div>
                  <div className="text-sm font-semibold text-[#14222e]">
                    {formatCebuTimeRange(event.starts_at, event.ends_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 border-t border-[#e8edf0] pt-4">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#168bd0]" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#72808e]">
                  Venue
                </div>
                <div className="text-sm font-semibold text-[#14222e]">
                  {event.venue}
                </div>
              </div>
            </div>
          </div>

          {!isCancelled && (
            <p className="text-xs leading-relaxed text-[#72808e]">
              Save your ticket code{" "}
              <span className="font-mono font-bold text-[#14222e]">
                {registration.ticket_code}
              </span>{" "}
              to look up your pass anytime with your email or mobile number.
            </p>
          )}

          {/* Self-Cancel Action (Confirmed or Waitlisted only) */}
          {onCancel && (isConfirmed || isWaitlisted) && (
            <div className="border-t border-[#e8edf0] pt-3">
              {!confirmCancel ? (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="w-full rounded-xl border border-[#f5c2c2] bg-white px-4 py-2 text-xs font-bold text-[#b34a4a] transition hover:bg-[#ffeded]"
                >
                  Cancel My Registration
                </button>
              ) : (
                <div className="rounded-xl border border-[#f5c2c2] bg-[#ffeded] p-3 text-center">
                  <p className="text-xs font-semibold text-[#b34a4a]">
                    Are you sure you want to cancel your spot?
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelling}
                      className="flex-1 rounded-lg border border-[#e8edf0] bg-white py-1.5 text-xs font-bold text-[#14222e]"
                    >
                      Keep Ticket
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={cancelling}
                      className="flex-1 rounded-lg bg-[#b34a4a] py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {cancelling ? "Cancelling..." : "Yes, Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (shown first on mobile so QR is ready at the door) */}
        <div className="order-first flex flex-col justify-center md:order-last md:col-span-5">
          {(isConfirmed || isCheckedIn) && qrDataUrl ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#168bd0]/35 bg-[#f5f8fa] p-5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code for ticket ${registration.ticket_code}`}
                className="qr-surface h-48 w-48 rounded-xl border border-[#e8edf0] p-2.5 shadow-xs"
              />
              <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[#72808e]">
                Ticket Code
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <code className="rounded-lg border border-[#e8edf0] bg-white px-3 py-1.5 font-mono text-base font-bold tracking-wider text-[#092d40]">
                  {registration.ticket_code}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8edf0] bg-white text-[#72808e] transition hover:text-[#168bd0]"
                  title="Copy ticket code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#087b72]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2.5 text-xs text-[#72808e]">
                {isCheckedIn && registration.checked_in_at
                  ? `Checked in on ${formatCebuDateTime(registration.checked_in_at)}`
                  : "Show this QR code to door staff on event day."}
              </p>
            </div>
          ) : null}

          {isWaitlisted && (
            <div className="flex h-full flex-col justify-center rounded-xl border border-[#f5d8aa] bg-[#fff2df] p-4 text-sm text-[#9a5705]">
              <div className="font-bold">
                You are #{registration.waitlist_position ?? "—"} on the waitlist
              </div>
              <p className="mt-1.5 text-xs leading-relaxed">
                Waitlisted attendees do not receive a working QR pass yet. If a
                spot opens up and an organizer promotes you, your ticket becomes
                confirmed and your QR code will appear here.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-xs">
                <span className="font-semibold text-[#72808e]">Ref Code</span>
                <div className="flex items-center gap-1.5">
                  <code className="font-mono font-bold text-[#14222e]">
                    {registration.ticket_code}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[#168bd0]"
                    title="Copy reference code"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="flex h-full flex-col justify-center rounded-xl border border-[#f5c2c2] bg-[#ffeded] p-4 text-sm text-[#b34a4a]">
              <div className="font-bold">Registration Cancelled</div>
              <p className="mt-1.5 text-xs leading-relaxed">
                This ticket ({registration.ticket_code}) has been cancelled and
                cannot be used for entry. You may register again if spots are
                available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
