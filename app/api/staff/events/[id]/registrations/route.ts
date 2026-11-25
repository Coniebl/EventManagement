import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_event_registrations", {
    p_event_id: id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load registrations.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ registrations: data ?? [] });
}
