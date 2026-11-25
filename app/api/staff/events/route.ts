import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { validateEventInput } from "@/lib/validation";
import type { DashboardEvent } from "@/lib/types";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_dashboard_events");
  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch events.", details: error.message },
      { status: 500 }
    );
  }

  // Automatically flag published events whose scheduled end time has passed as "closed".
  // If staff later edits & extends the end time into the future and sets it to "published",
  // it becomes open and visible to attendees again.
  const now = Date.now();
  const normalized = ((data ?? []) as DashboardEvent[]).map((ev) => {
    const hasPassed = ev.is_ended || new Date(ev.ends_at).getTime() <= now;
    if (ev.status === "published" && hasPassed) {
      return { ...ev, status: "closed" as const, is_ended: true };
    }
    return ev;
  });

  return NextResponse.json({ events: normalized });
}

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (staff.role !== "organizer") {
    return NextResponse.json(
      { error: "Forbidden: Only organizers can create events." },
      { status: 403 }
    );
  }

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
  const { data, error } = await supabase.rpc("rpc_create_event", {
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
      { error: "Failed to create event.", details: error.message },
      { status: 500 }
    );
  }

  if (data?.error) {
    return NextResponse.json({ error: data.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, event: data.event }, { status: 201 });
}
