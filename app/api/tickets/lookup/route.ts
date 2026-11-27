import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateTicketQrDataUrl } from "@/lib/ticket";
import { normalizeMobile } from "@/lib/validation";

export async function POST(request: Request) {
  // 20 lookups per minute per IP
  const ip = getClientIp(request);
  const limit = checkRateLimit(`ticket-lookup:${ip}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many lookup attempts. Please try again in a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let body: { ticket_code?: string; contact?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const ticketCode = String(body.ticket_code ?? "").trim().toUpperCase();
  const rawContact = String(body.contact ?? "").trim();
  const contact = rawContact.includes("@")
    ? rawContact.toLowerCase()
    : normalizeMobile(rawContact);

  if (!ticketCode || !contact) {
    return NextResponse.json(
      { error: "Please enter both your ticket code and email (or mobile number)." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc("rpc_lookup_ticket", {
      p_ticket_code: ticketCode,
      p_contact: contact,
    });

    if (error) {
      return NextResponse.json(
        { error: "Unable to look up ticket right now." },
        { status: 500 }
      );
    }

    if (!data?.found) {
      return NextResponse.json(
        { found: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    const reg = data.registration;
    // Only confirmed or checked_in tickets display a QR code
    const qrDataUrl =
      reg.status === "confirmed" || reg.status === "checked_in"
        ? await generateTicketQrDataUrl(reg.ticket_code)
        : null;

    return NextResponse.json({
      found: true,
      registration: reg,
      event: data.event,
      qr_data_url: qrDataUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
