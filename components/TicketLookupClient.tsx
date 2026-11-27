"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Ticket, AlertCircle, CheckCircle2 } from "lucide-react";
import { TicketPassCard } from "./TicketPassCard";
import type { TicketLookupPayload } from "@/lib/types";

export function TicketLookupClient() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  const initialContact = searchParams.get("contact") ?? "";

  const [ticketCode, setTicketCode] = useState(initialCode);
  const [contact, setContact] = useState(initialContact);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketLookupPayload | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // Clear displayed ticket & inputs whenever the user navigates away
  // so the next person cannot see the previous attendee's ticket
  useEffect(() => {
    return () => {
      setTicketData(null);
      setTicketCode("");
      setContact("");
      setError(null);
      setCancelMessage(null);
    };
  }, []);

  const performLookup = useCallback(async (code: string, cont: string) => {
    setError(null);
    setCancelMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_code: code, contact: cont }),
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        setTicketData(null);
        setError(data.error || "Ticket not found");
        return;
      }
      setTicketData(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCode || !initialContact) return;
    let active = true;
    async function initLookup() {
      try {
        const res = await fetch("/api/tickets/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticket_code: initialCode,
            contact: initialContact,
          }),
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data.found) {
          setTicketData(null);
          setError(data.error || "Ticket not found");
          return;
        }
        setTicketData(data);
      } catch {
        if (active) setError("Network error. Please try again.");
      }
    }
    initLookup();
    return () => {
      active = false;
    };
  }, [initialCode, initialContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim() || !contact.trim()) {
      setError("Please enter both your ticket code and email (or mobile number).");
      return;
    }
    performLookup(ticketCode, contact);
  };

  const handleCancel = async () => {
    if (!ticketData?.registration) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_code: ticketData.registration.ticket_code,
          contact: contact.trim() || ticketData.registration.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not cancel registration.");
        return;
      }
      setCancelMessage("Your registration has been cancelled.");
      await performLookup(
        ticketData.registration.ticket_code,
        contact.trim() || ticketData.registration.email
      );
    } catch {
      setError("Network error while cancelling.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Lookup Form Card */}
      <div className="card-panel p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ddf8fb] text-[#0795a6]">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#14222e]">Find My Ticket</h1>
            <p className="text-xs text-[#72808e]">
              Enter your ticket code and the email or mobile number you used to
              register.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="lookup-code"
              className="block text-xs font-bold text-[#14222e]"
            >
              Ticket Code
            </label>
            <input
              id="lookup-code"
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
              placeholder="e.g. CDM-7K3P9Q4M-C188"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 font-mono text-sm uppercase text-[#14222e] outline-none focus:border-[#168bd0] focus:bg-white focus:ring-2 focus:ring-[#168bd0]/15"
            />
          </div>

          <div>
            <label
              htmlFor="lookup-contact"
              className="block text-xs font-bold text-[#14222e]"
            >
              Email or Mobile Number
            </label>
            <input
              id="lookup-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="name@example.com or 09171234567"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#e8edf0] bg-[#f8fafb] px-3.5 text-sm text-[#14222e] outline-none focus:border-[#168bd0] focus:bg-white focus:ring-2 focus:ring-[#168bd0]/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold sm:col-span-2"
          >
            <Search className="h-4 w-4" />
            {loading ? "Searching..." : "Retrieve My Ticket"}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#f5c2c2] bg-[#ffeded] px-4 py-3 text-sm font-semibold text-[#b34a4a]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cancelMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#b8efea] bg-[#e1f9f6] px-4 py-3 text-sm font-semibold text-[#057b74]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{cancelMessage}</span>
          </div>
        )}
      </div>

      {/* Ticket Pass Display */}
      {ticketData?.found && ticketData.registration && ticketData.event && (
        <TicketPassCard
          registration={ticketData.registration}
          event={ticketData.event}
          qrDataUrl={ticketData.qr_data_url}
          onCancel={handleCancel}
          cancelling={cancelling}
        />
      )}
    </div>
  );
}
