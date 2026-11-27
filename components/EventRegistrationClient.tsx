"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Copy,
  Check,
  X,
} from "lucide-react";
import { formatCebuDate, formatCebuTimeRange } from "@/lib/time";
import {
  validateRegistrationInput,
  type RegistrationValidationErrors,
} from "@/lib/validation";
import type { PublicEvent, RegistrationRecord } from "@/lib/types";
import { TicketPassCard } from "./TicketPassCard";

interface EventRegistrationClientProps {
  eventId: string;
}

export function EventRegistrationClient({
  eventId,
}: EventRegistrationClientProps) {
  const router = useRouter();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    RegistrationValidationErrors & { first_name?: string; last_name?: string }
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);

  // Exit save-code reminder state
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [pendingExitHref, setPendingExitHref] = useState<string | null>(null);
  const [modalCopied, setModalCopied] = useState(false);

  // Result state (after registration)
  const [result, setResult] = useState<{
    registration: RegistrationRecord;
    event: {
      id: string;
      title: string;
      venue: string;
      starts_at: string;
      ends_at: string;
    };
    qrDataUrl: string | null;
    emailNotice?: string;
    emailPreviewUrl?: string;
  } | null>(null);

  // Auto-fade confirmation banner (5s)
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [bannerFading, setBannerFading] = useState(false);
  const fadeTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setResult(null);
      setShowSuccessBanner(false);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Event not found.");
        }
        if (active) setEvent(data.event);
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load event."
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
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent, joinWaitlist: boolean) => {
    e.preventDefault();
    setSubmitError(null);

    const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const baseErrors = validateRegistrationInput({
      full_name: combinedName,
      email,
      mobile,
    });
    const errors: RegistrationValidationErrors & {
      first_name?: string;
      last_name?: string;
    } = { ...baseErrors };
    delete errors.full_name;
    if (!firstName.trim()) errors.first_name = "First name is required.";
    if (!lastName.trim()) errors.last_name = "Last name is required.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: combinedName,
          email,
          mobile,
          join_waitlist: joinWaitlist,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setSubmitError(data.error || "Registration failed.");
        return;
      }

      const emailNotice = data.email_delivery?.sent
        ? `A confirmation email was sent to ${data.registration.email}.`
        : undefined;

      setResult({
        registration: data.registration,
        event: data.event,
        qrDataUrl: data.qr_data_url ?? null,
        emailNotice,
        emailPreviewUrl: data.email_delivery?.previewUrl,
      });

      // Reset form for next attendee
      setFirstName("");
      setLastName("");
      setEmail("");
      setMobile("");
      setShowWaitlistForm(false);
      setHasCopiedCode(false);
      setPendingExitHref(null);
      setModalCopied(false);

      // Show banner then fade out at 5s
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setShowSuccessBanner(true);
      setBannerFading(false);
      fadeTimerRef.current = window.setTimeout(() => {
        setBannerFading(true);
      }, 4300);
      hideTimerRef.current = window.setTimeout(() => {
        setShowSuccessBanner(false);
        setBannerFading(false);
      }, 5000);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4">
        <div className="h-6 w-32 rounded bg-[#e8edf0]" />
        <div className="h-64 rounded-2xl bg-white" />
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#e8edf0] bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-[#b34a4a]" />
        <h2 className="mt-3 text-lg font-bold text-[#14222e]">
          {loadError || "Event not found"}
        </h2>
        <Link
          href="/"
          className="btn-primary mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      </div>
    );
  }

  // Success View: Show QR Ticket Pass or Waitlist Confirmation
  if (result) {
    const firstWord =
      result.registration.full_name.trim().split(/\s+/)[0] ||
      result.registration.full_name;

    const handleExitAttempt = (href: string) => {
      if (hasCopiedCode) {
        setResult(null);
        setShowSuccessBanner(false);
        router.push(href);
        return;
      }
      setPendingExitHref(href);
    };

    const handleModalCopy = async () => {
      try {
        await navigator.clipboard.writeText(result.registration.ticket_code);
        setHasCopiedCode(true);
        setModalCopied(true);
      } catch {
        // Clipboard unavailable
      }
    };

    const proceedExit = () => {
      const target = pendingExitHref || "/";
      setPendingExitHref(null);
      setResult(null);
      setShowSuccessBanner(false);
      router.push(target);
    };

    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleExitAttempt("/")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#72808e] hover:text-[#168bd0]"
          >
            <ArrowLeft className="h-4 w-4" />
            All Events
          </button>
          <button
            type="button"
            onClick={() => handleExitAttempt("/ticket")}
            className="text-sm font-semibold text-[#168bd0] hover:underline"
          >
            Look up ticket anytime →
          </button>
        </div>

        {showSuccessBanner && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border border-[#b8efea] bg-[#e1f9f6] px-4 py-3 text-sm font-semibold text-[#057b74] transition-opacity duration-700 ${
              bannerFading ? "opacity-0" : "opacity-100"
            }`}
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              {result.registration.status === "waitlisted"
                ? `You're #${result.registration.waitlist_position} on the waitlist, ${firstWord}!`
                : `You're registered, ${firstWord}! Here is your QR ticket pass.`}
              {result.emailNotice && (
                <div className="text-xs font-normal text-[#087b72]">
                  {result.emailNotice}{" "}
                  {result.emailPreviewUrl && (
                    <a
                      href={result.emailPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline"
                    >
                      Open Email Preview ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <TicketPassCard
          registration={result.registration}
          event={result.event}
          qrDataUrl={result.qrDataUrl}
          onCopyCode={() => setHasCopiedCode(true)}
        />

        {/* Save Ticket Code Reminder Modal */}
        {pendingExitHref && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050d13]/65 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e8edf0] bg-white shadow-2xl">
              <div className="hero-ocean flex items-center justify-between px-6 py-4 text-white">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#42d6df]">
                    Before You Leave
                  </p>
                  <h2 className="text-base font-extrabold leading-tight">
                    Save Your Ticket Code
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingExitHref(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Close reminder"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm leading-relaxed text-[#14222e]">
                  Make sure to copy or save your ticket code first so you can
                  retrieve your pass anytime under <strong>My Ticket</strong>.
                </p>

                <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-4 py-3">
                  <code className="font-mono text-sm font-bold tracking-wider text-[#092d40]">
                    {result.registration.ticket_code}
                  </code>
                  <button
                    type="button"
                    onClick={handleModalCopy}
                    className="btn-primary inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold"
                  >
                    {modalCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPendingExitHref(null)}
                    className="h-10 rounded-xl border border-[#e8edf0] bg-white px-4 text-xs font-bold text-[#14222e] transition hover:bg-[#f8fafb]"
                  >
                    Stay on Ticket
                  </button>
                  <button
                    type="button"
                    onClick={proceedExit}
                    className="btn-primary h-10 rounded-xl px-4 text-xs font-bold"
                  >
                    {modalCopied ? "Continue" : "Leave Anyway"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isFull = event.spots_left <= 0;
  const isEnded = event.is_ended;
  const fillPct = Math.min(
    100,
    Math.round((event.active_count / Math.max(1, event.capacity)) * 100)
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#72808e] transition hover:text-[#168bd0]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Event Details */}
        <div className="space-y-5 lg:col-span-7">
          <div className="card-panel overflow-hidden">
            <div className="hero-ocean p-6 text-white sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                {isEnded ? (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">
                    Ended
                  </span>
                ) : isFull ? (
                  <span className="rounded-full bg-[#fff2df] px-3 py-1 text-xs font-extrabold uppercase text-[#be6906]">
                    Full
                  </span>
                ) : (
                  <span className="rounded-full bg-[#e2f8f5] px-3 py-1 text-xs font-extrabold uppercase text-[#087b72]">
                    Open · Free Admission
                  </span>
                )}
                <span className="text-xs font-medium text-[#b5d7e2]">
                  Asia/Manila (UTC+8)
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {event.title}
              </h1>
            </div>

            <div className="space-y-5 p-6 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl border border-[#e8edf0] bg-[#f8fafb] p-3.5">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[#168bd0]" />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#72808e]">
                      Date
                    </div>
                    <div className="text-sm font-bold text-[#14222e]">
                      {formatCebuDate(event.starts_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[#e8edf0] bg-[#f8fafb] p-3.5">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#168bd0]" />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#72808e]">
                      Time
                    </div>
                    <div className="text-sm font-bold text-[#14222e]">
                      {formatCebuTimeRange(event.starts_at, event.ends_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-[#e8edf0] bg-[#f8fafb] p-3.5 sm:col-span-2">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#168bd0]" />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#72808e]">
                      Venue
                    </div>
                    <div className="text-sm font-bold text-[#14222e]">
                      {event.venue}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#72808e]">
                  About this event
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#14222e]">
                  {event.description || "Join us for this upcoming event in Cebu!"}
                </p>
              </div>

              {/* Capacity Bar */}
              <div className="rounded-xl border border-[#e8edf0] bg-[#f8fafb] p-4">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#14222e]">
                    <Users className="h-4 w-4 text-[#168bd0]" />
                    {isFull
                      ? `Full (${event.active_count} of ${event.capacity} spots filled)`
                      : `${event.spots_left} of ${event.capacity} spots left`}
                  </span>
                  {event.waitlisted_count > 0 && (
                    <span className="text-xs font-semibold text-[#be6906]">
                      {event.waitlisted_count} on waitlist
                    </span>
                  )}
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#e8edf0]">
                  <div
                    className={`h-full rounded-full ${
                      isFull ? "bg-[#e59a38]" : "progress-fill"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Registration / Waitlist Card */}
        <div className="lg:col-span-5">
          <div className="card-panel p-6">
            {isEnded ? (
              <div className="py-6 text-center">
                <span className="inline-flex rounded-full bg-[#e8edf0] px-3 py-1 text-xs font-bold uppercase text-[#72808e]">
                  Event Ended
                </span>
                <h2 className="mt-3 text-lg font-bold text-[#14222e]">
                  Registration Closed
                </h2>
                <p className="mt-1 text-sm text-[#72808e]">
                  This event has already ended and is no longer accepting
                  registrations.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-xl bg-[#e8edf0] py-3 text-sm font-bold text-[#72808e]"
                >
                  Register
                </button>
              </div>
            ) : isFull && !showWaitlistForm ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#f5d8aa] bg-[#fff2df] p-4 text-sm text-[#9a5705]">
                  <div className="font-extrabold uppercase tracking-wide">
                    Event Full
                  </div>
                  <p className="mt-1 text-xs leading-relaxed">
                    All {event.capacity} seats are currently reserved. You can
                    still join the waitlist — if a spot opens up, an organizer
                    can promote you to a confirmed ticket.
                  </p>
                </div>

                {/* Disabled Register Button */}
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-[#e8edf0] py-3 text-sm font-bold text-[#72808e] opacity-70 dark:bg-[#1b2a36] dark:text-[#6f8392]"
                >
                  Register
                </button>

                {/* Join Waitlist CTA per Level 2 #08 */}
                <button
                  type="button"
                  onClick={() => setShowWaitlistForm(true)}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Waitlist (#{event.waitlisted_count + 1})
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1392b4]">
                    {isFull ? "Waitlist Registration" : "Free Registration"}
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-[#14222e]">
                    {isFull ? "Join the Waitlist" : "Reserve Your Spot"}
                  </h2>
                  <p className="mt-1 text-xs text-[#72808e]">
                    {isFull
                      ? "You'll see your waitlist position right away. No account needed."
                      : "No sign-in required. You'll get your QR ticket immediately."}
                  </p>
                </div>

                {submitError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#f5c2c2] bg-[#ffeded] p-3 text-xs font-semibold text-[#b34a4a]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => handleSubmit(e, true)}
                  noValidate
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="first_name"
                        className="block text-xs font-bold text-[#14222e]"
                      >
                        First Name <span className="text-[#b34a4a]">*</span>
                      </label>
                      <input
                        id="first_name"
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          setFieldErrors((prev) => ({
                            ...prev,
                            first_name: undefined,
                          }));
                        }}
                        placeholder="e.g. Juan"
                        className={`mt-1.5 h-11 w-full rounded-xl border bg-[#f8fafb] px-3.5 text-sm text-[#14222e] outline-none transition focus:bg-white ${
                          fieldErrors.first_name
                            ? "border-[#b34a4a] focus:ring-2 focus:ring-[#b34a4a]/20"
                            : "border-[#e8edf0] focus:border-[#168bd0] focus:ring-2 focus:ring-[#168bd0]/15"
                        }`}
                      />
                      {fieldErrors.first_name && (
                        <p className="mt-1 text-xs font-medium text-[#b34a4a]">
                          {fieldErrors.first_name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="last_name"
                        className="block text-xs font-bold text-[#14222e]"
                      >
                        Last Name <span className="text-[#b34a4a]">*</span>
                      </label>
                      <input
                        id="last_name"
                        type="text"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          setFieldErrors((prev) => ({
                            ...prev,
                            last_name: undefined,
                          }));
                        }}
                        placeholder="e.g. Dela Cruz"
                        className={`mt-1.5 h-11 w-full rounded-xl border bg-[#f8fafb] px-3.5 text-sm text-[#14222e] outline-none transition focus:bg-white ${
                          fieldErrors.last_name
                            ? "border-[#b34a4a] focus:ring-2 focus:ring-[#b34a4a]/20"
                            : "border-[#e8edf0] focus:border-[#168bd0] focus:ring-2 focus:ring-[#168bd0]/15"
                        }`}
                      />
                      {fieldErrors.last_name && (
                        <p className="mt-1 text-xs font-medium text-[#b34a4a]">
                          {fieldErrors.last_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-bold text-[#14222e]"
                    >
                      Email Address <span className="text-[#b34a4a]">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                      }}
                      placeholder="e.g. juan@example.com"
                      className={`mt-1.5 h-11 w-full rounded-xl border bg-[#f8fafb] px-3.5 text-sm text-[#14222e] outline-none transition focus:bg-white ${
                        fieldErrors.email
                          ? "border-[#b34a4a] focus:ring-2 focus:ring-[#b34a4a]/20"
                          : "border-[#e8edf0] focus:border-[#168bd0] focus:ring-2 focus:ring-[#168bd0]/15"
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs font-medium text-[#b34a4a]">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="mobile"
                      className="block text-xs font-bold text-[#14222e]"
                    >
                      Mobile Number (PH) <span className="text-[#b34a4a]">*</span>
                    </label>
                    <input
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          mobile: undefined,
                        }));
                      }}
                      placeholder="09171234567"
                      className={`mt-1.5 h-11 w-full rounded-xl border bg-[#f8fafb] px-3.5 text-sm text-[#14222e] outline-none transition focus:bg-white ${
                        fieldErrors.mobile
                          ? "border-[#b34a4a] focus:ring-2 focus:ring-[#b34a4a]/20"
                          : "border-[#e8edf0] focus:border-[#168bd0] focus:ring-2 focus:ring-[#168bd0]/15"
                      }`}
                    />
                    {fieldErrors.mobile ? (
                      <p className="mt-1 text-xs font-medium text-[#b34a4a]">
                        {fieldErrors.mobile}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[#72808e]">
                        11-digit Philippine mobile number starting with 09
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold"
                  >
                    {submitting
                      ? "Submitting..."
                      : isFull
                        ? "Join Waitlist"
                        : "Register & Get QR Ticket"}
                  </button>

                  {isFull && (
                    <button
                      type="button"
                      onClick={() => setShowWaitlistForm(false)}
                      className="w-full text-center text-xs font-semibold text-[#72808e] hover:text-[#14222e]"
                    >
                      Back
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
