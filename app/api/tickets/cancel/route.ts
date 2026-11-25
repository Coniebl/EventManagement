import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeMobile } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`ticket-cancel:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: { ticket_code?: string; contact?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ticketCode = String(body.ticket_code ?? "").trim().toUpperCase();
  const rawContact = String(body.contact ?? "").trim();
  const contact = rawContact.includes("@")
    ? rawContact.toLowerCase()
    : normalizeMobile(rawContact);

  if (!ticketCode || !contact) {
    return NextResponse.json(
      { error: "Ticket code and email/mobile are required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_self_cancel_registration", {
    p_ticket_code: ticketCode,
    p_contact: contact,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to cancel registration." },
      { status: 500 }
    );
  }

  if (data?.error) {
    const code = data.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: data.message }, { status: code });
  }

  return NextResponse.json({ ok: true });
}
