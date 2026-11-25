import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTicketCodeSignature } from "@/lib/ticket";

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 check-ins per minute per staff/IP (Level 3 #14)
  const ip = getClientIp(request);
  const limit = checkRateLimit(`checkin:${staff.id}:${ip}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        result: "invalid",
        message: "Too many scan attempts. Please slow down briefly.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let body: { event_id?: string; ticket_code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const eventId = String(body.event_id ?? "").trim();
  const ticketCode = String(body.ticket_code ?? "").trim().toUpperCase();

  if (!eventId || !ticketCode) {
    return NextResponse.json(
      { error: "Event and ticket code are required." },
      { status: 400 }
    );
  }

  // Level 3 #14: Reject forged, edited, or sequential codes before hitting DB
  if (!verifyTicketCodeSignature(ticketCode)) {
    return NextResponse.json({
      result: "invalid",
      message: "Invalid ticket — unrecognized or tampered ticket code.",
    });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_checkin_ticket", {
    p_event_id: eventId,
    p_ticket_code: ticketCode,
    p_staff_user_id: staff.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Check-in failed.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
