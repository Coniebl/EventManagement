"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  QrCode,
  Keyboard,
} from "lucide-react";
import { formatCebuDateTime } from "@/lib/time";
import { CubeSelect } from "./CubeSelect";
import type { CheckInResult, DashboardEvent } from "@/lib/types";

export function StaffCheckInClient() {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [ticketCode, setTicketCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pausedForResult, setPausedForResult] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanLockRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/staff/events", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      const list = (data.events ?? []) as DashboardEvent[];
      setEvents(list);
      setSelectedEventId((prev) => prev || list[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const res = await fetch("/api/staff/events", { cache: "no-store" });
      const data = await res.json();
      if (active && res.ok) {
        const list = (data.events ?? []) as DashboardEvent[];
        setEvents(list);
        setSelectedEventId((prev) => prev || list[0]?.id || "");
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const submitCheckIn = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!selectedEventId || !code) return;

      setSubmitting(true);
      try {
        const res = await fetch("/api/staff/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: selectedEventId,
            ticket_code: code,
          }),
        });
        const data = (await res.json()) as CheckInResult;
        setScanResult(data);
        setTicketCode("");

        if (data.result === "checked_in") {
          await loadEvents();
        }
      } catch {
        setScanResult({
          result: "invalid",
          message: "Network error during check-in.",
        });
      } finally {
        setSubmitting(false);
        inputRef.current?.focus();
      }
    },
    [selectedEventId, loadEvents]
  );

  // Camera scanning loop using jsQR (Level 3 #12)
  useEffect(() => {
    if (!cameraActive) return;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (
        video &&
        canvas &&
        video.readyState === video.HAVE_ENOUGH_DATA &&
        !scanLockRef.current
      ) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (qr?.data) {
            scanLockRef.current = true;
            setPausedForResult(true);
            submitCheckIn(qr.data).finally(() => {
              // Show result for ~2 seconds then automatically resume scanning
              setTimeout(() => {
                scanLockRef.current = false;
                setPausedForResult(false);
              }, 2200);
            });
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cameraActive, submitCheckIn]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera API unavailable. Please use HTTPS or enter the ticket code manually below."
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setCameraError(
        "Camera access was blocked or unavailable. You can still type or scan ticket codes manually below."
      );
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;
    submitCheckIn(ticketCode);
  };

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const checkedInPct =
    currentEvent && currentEvent.active_count > 0
      ? Math.round(
          (currentEvent.checked_in_count / currentEvent.active_count) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1392b4]">
          Door Operations
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#14222e]">
          QR Ticket Check-in
        </h1>
        <p className="mt-1 text-xs text-[#72808e]">
          Scan attendee QR tickets with your camera or enter/scan codes
          manually. Only Confirmed tickets on the event day check in.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Scanner Console */}
        <div className="card-panel p-5 sm:p-6 lg:col-span-8">
          {/* Event Selector */}
          <div>
            <label
              htmlFor="checkin-event"
              className="block text-xs font-bold text-[#14222e]"
            >
              Active Event at Door
            </label>
            <CubeSelect
              id="checkin-event"
              className="mt-1.5"
              value={selectedEventId}
              onChange={(val) => {
                setSelectedEventId(val);
                setScanResult(null);
              }}
              placeholder="Select an event"
              options={events.map((ev) => ({
                value: ev.id,
                label: ev.title,
                sublabel: `(${ev.checked_in_count}/${ev.active_count} checked in)`,
                dotClass:
                  ev.status === "published"
                    ? "bg-[#14a395]"
                    : ev.status === "draft"
                      ? "bg-yellow-400"
                      : "bg-[#9ba8b2]",
              }))}
            />
          </div>

          {/* Result Banner (Color + Icon + Text) */}
          {scanResult && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-5 flex items-start gap-3 rounded-2xl border-2 p-4 ${
                scanResult.result === "checked_in"
                  ? "border-[#14a395] bg-[#dff8f4] text-[#056159]"
                  : scanResult.result === "already_checked_in"
                    ? "border-[#e09b2d] bg-[#fff4dd] text-[#8a5105]"
                    : "border-[#d9534f] bg-[#ffeded] text-[#9e2c2c]"
              }`}
            >
              {scanResult.result === "checked_in" ? (
                <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-[#087b72]" />
              ) : scanResult.result === "already_checked_in" ? (
                <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0 text-[#c97a08]" />
              ) : (
                <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-[#c9302c]" />
              )}

              <div className="min-w-0 flex-1">
                <div className="text-base font-extrabold uppercase tracking-wide">
                  {scanResult.result === "checked_in"
                    ? "Checked in"
                    : scanResult.result === "already_checked_in"
                      ? "Already checked in"
                      : scanResult.result === "waitlisted"
                        ? "On waitlist — not confirmed"
                        : scanResult.result === "cancelled"
                          ? "Cancelled"
                          : scanResult.result === "wrong_day"
                            ? "Not Event Day"
                            : "Invalid ticket"}
                </div>

                {scanResult.attendee_name && (
                  <div className="mt-0.5 text-sm font-bold">
                    {scanResult.attendee_name}
                    {scanResult.ticket_code ? ` · ${scanResult.ticket_code}` : ""}
                  </div>
                )}

                {scanResult.result === "already_checked_in" &&
                  scanResult.checked_in_at && (
                    <div className="mt-0.5 text-xs font-semibold">
                      First checked in at:{" "}
                      {formatCebuDateTime(scanResult.checked_in_at)}
                    </div>
                  )}

                {scanResult.result !== "checked_in" &&
                  scanResult.result !== "already_checked_in" && (
                    <div className="mt-0.5 text-xs font-medium">
                      {scanResult.message}
                    </div>
                  )}

                {pausedForResult && cameraActive && (
                  <div className="mt-1.5 text-[11px] font-semibold opacity-80">
                    Ready for next scan in 2 seconds...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera QR Scanner Zone */}
          <div className="mt-5 rounded-2xl border border-dashed border-[#168bd0]/40 bg-[#f5f8fa] p-5">
            {!cameraActive ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e5fafb] to-[#e5f2fb] text-[#158fba]">
                  <QrCode className="h-11 w-11" />
                </div>
                <h2 className="mt-4 text-sm font-bold text-[#14222e]">
                  Camera QR Scanner
                </h2>
                <p className="mt-1 max-w-xs text-xs text-[#72808e]">
                  Point your phone or laptop camera at the attendee&apos;s QR
                  ticket. Results display for 2 seconds before scanning the next
                  guest.
                </p>
                {cameraError && (
                  <p className="mt-2 max-w-sm rounded-lg bg-[#ffeded] px-3 py-2 text-xs font-semibold text-[#b34a4a]">
                    {cameraError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn-primary mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-5 text-xs font-bold"
                >
                  <Camera className="h-4 w-4" />
                  Start Camera Scanner
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative mx-auto aspect-video max-w-md overflow-hidden rounded-xl bg-[#092d40]">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Viewfinder overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-44 w-44 rounded-xl border-2 border-[#42d6df] shadow-[0_0_0_999px_rgba(9,45,64,0.35)]" />
                  </div>
                  {pausedForResult && (
                    <div className="absolute inset-x-0 bottom-3 text-center">
                      <span className="rounded-full bg-[#092d40]/85 px-3 py-1 text-xs font-bold text-[#42d6df]">
                        Scan recorded — resetting...
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e8edf0] bg-white px-4 text-xs font-bold text-[#14222e]"
                  >
                    <CameraOff className="h-3.5 w-3.5" />
                    Stop Camera
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-[#9ba8b2]">
            <div className="h-px flex-1 bg-[#e8edf0]" />
            <span className="flex items-center gap-1">
              <Keyboard className="h-3.5 w-3.5" />
              Or enter / USB-scan ticket code
            </span>
            <div className="h-px flex-1 bg-[#e8edf0]" />
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
              placeholder="e.g. CDM-4T6W9X2K-24B6"
              className="h-11 flex-1 rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-4 font-mono text-sm font-bold uppercase tracking-wider text-[#14222e] outline-none focus:border-[#168bd0] focus:bg-white focus:ring-2 focus:ring-[#168bd0]/15"
            />
            <button
              type="submit"
              disabled={submitting || !ticketCode.trim()}
              className="btn-primary h-11 rounded-xl px-5 text-xs font-extrabold"
            >
              {submitting ? "Checking..." : "Check In"}
            </button>
          </form>
        </div>

        {/* Right: Live Door Counter (Level 2 #10) */}
        <div className="card-panel flex flex-col justify-between p-6 lg:col-span-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1392b4]">
              Live Door Counter
            </p>
            <h2 className="mt-1 text-base font-bold text-[#14222e]">
              {currentEvent?.title || "Select an event"}
            </h2>

            <div className="my-6 flex flex-col items-center justify-center rounded-2xl bg-[#f5f8fa] py-7">
              <div className="text-4xl font-extrabold tracking-tight text-[#092d40]">
                {currentEvent?.checked_in_count ?? 0}{" "}
                <span className="text-xl font-bold text-[#72808e]">
                  / {currentEvent?.active_count ?? 0}
                </span>
              </div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wider text-[#168c84]">
                Checked In ({checkedInPct}%)
              </div>
              <div className="mt-4 h-2 w-4/5 overflow-hidden rounded-full bg-[#e8edf0]">
                <div
                  className="progress-fill h-full rounded-full transition-all"
                  style={{ width: `${checkedInPct}%` }}
                />
              </div>
            </div>
          </div>

          {currentEvent && (
            <div className="space-y-2 border-t border-[#e8edf0] pt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-[#72808e]">Capacity</span>
                <strong className="text-[#14222e]">
                  {currentEvent.capacity}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#72808e]">Confirmed (Not yet in)</span>
                <strong className="text-[#168bd0]">
                  {currentEvent.confirmed_count}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#72808e]">Waitlisted</span>
                <strong className="text-[#be6906]">
                  {currentEvent.waitlisted_count}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#72808e]">Cancelled</span>
                <strong className="text-[#72808e]">
                  {currentEvent.cancelled_count}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
