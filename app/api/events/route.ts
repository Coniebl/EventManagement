import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { PublicEvent } from "@/lib/types";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc("rpc_get_public_events");

    if (error) {
      return NextResponse.json(
        { error: "Failed to load events.", details: error.message },
        { status: 500 }
      );
    }

    // Hide ended events; keep full upcoming events visible for waitlist
    const now = Date.now();
    const activeEvents = ((data ?? []) as PublicEvent[]).filter(
      (ev) => !ev.is_ended && new Date(ev.ends_at).getTime() > now
    );

    return NextResponse.json({ events: activeEvents });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Server configuration error.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
