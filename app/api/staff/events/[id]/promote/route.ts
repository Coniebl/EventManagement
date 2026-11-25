import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { sendTicketEmail } from "@/lib/email";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (staff.role !== "organizer") {
    return NextResponse.json(
      { error: "Forbidden: Only organizers can promote waitlisted attendees." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_promote_waitlist", {
    p_event_id: id,
    p_staff_user_id: staff.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to promote waitlist.", details: error.message },
      { status: 500 }
    );
  }

  if (data?.error) {
    return NextResponse.json({ error: data.message }, { status: 400 });
  }

  // Send waitlist promotion email (Level 3 #15)
  const reg = data.registration;
  const event = data.event;
  const emailDelivery = await sendTicketEmail({
    to: reg.email,
    attendeeName: reg.full_name,
    eventTitle: event.title,
    venue: event.venue,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    ticketCode: reg.ticket_code,
    status: "confirmed",
    isPromotion: true,
  });

  return NextResponse.json({
    ok: true,
    registration: reg,
    email_delivery: emailDelivery,
  });
}
