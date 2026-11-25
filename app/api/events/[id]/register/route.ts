import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  normalizeMobile,
  validateRegistrationInput,
} from "@/lib/validation";
import {
  generateSignedTicketCode,
  generateTicketQrDataUrl,
} from "@/lib/ticket";
import { sendTicketEmail } from "@/lib/email";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid event ID." }, { status: 400 });
  }

  let body: {
    full_name?: string;
    email?: string;
    mobile?: string;
    join_waitlist?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const full_name = String(body.full_name ?? "");
  const email = String(body.email ?? "");
  const mobile = normalizeMobile(String(body.mobile ?? ""));
  const allowWaitlist = body.join_waitlist !== false;

  const fieldErrors = validateRegistrationInput({ full_name, email, mobile });
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();

    // Fetch event title for clean ticket code prefix
    const { data: eventInfo } = await supabase.rpc("rpc_get_public_event", {
      p_event_id: id,
    });
    const ticketCode = generateSignedTicketCode(eventInfo?.title);

    const { data, error } = await supabase.rpc("rpc_register_attendee", {
      p_event_id: id,
      p_full_name: full_name.trim(),
      p_email: email.trim().toLowerCase(),
      p_mobile: mobile,
      p_ticket_code: ticketCode,
      p_allow_waitlist: allowWaitlist,
    });

    if (error) {
      return NextResponse.json(
        { error: "Registration failed.", details: error.message },
        { status: 500 }
      );
    }

    if (data?.error) {
      const statusMap: Record<string, number> = {
        event_not_found: 404,
        event_closed: 400,
        event_ended: 400,
        duplicate_email: 409,
        event_full: 409,
      };
      return NextResponse.json(
        { error: data.message, code: data.error },
        { status: statusMap[data.error] ?? 400 }
      );
    }

    const registration = data.registration;
    const event = data.event;

    // Waitlisted attendees do NOT get a working QR ticket
    const qrDataUrl =
      registration.status === "confirmed"
        ? await generateTicketQrDataUrl(registration.ticket_code)
        : null;

    // Send confirmation / waitlist email (non-fatal if sandbox isn't configured)
    const emailResult = await sendTicketEmail({
      to: registration.email,
      attendeeName: registration.full_name,
      eventTitle: event.title,
      venue: event.venue,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      ticketCode: registration.ticket_code,
      status: registration.status,
      waitlistPosition: registration.waitlist_position,
    });

    return NextResponse.json(
      {
        ok: true,
        registration,
        event,
        qr_data_url: qrDataUrl,
        email_delivery: emailResult,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Unexpected server error.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
