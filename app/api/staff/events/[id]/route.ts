import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { validateEventInput } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (staff.role !== "organizer") {
    return NextResponse.json(
      { error: "Forbidden: Only organizers can edit events." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  let body: {
    title?: string;
    description?: string;
    venue?: string;
    starts_at?: string;
    ends_at?: string;
    capacity?: number;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = {
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    venue: String(body.venue ?? ""),
    starts_at: String(body.starts_at ?? ""),
    ends_at: String(body.ends_at ?? ""),
    capacity: Number(body.capacity),
    status: String(body.status ?? "draft"),
  };

  const fieldErrors = validateEventInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_update_event", {
    p_event_id: id,
    p_title: input.title,
    p_description: input.description,
    p_venue: input.venue,
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_capacity: input.capacity,
    p_status: input.status,
    p_staff_user_id: staff.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update event.", details: error.message },
      { status: 500 }
    );
  }

  if (data?.error) {
    return NextResponse.json({ error: data.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, event: data.event });
}
