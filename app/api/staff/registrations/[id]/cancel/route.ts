import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";

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
      { error: "Forbidden: Only organizers can cancel registrations." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_staff_cancel_registration", {
    p_registration_id: id,
    p_staff_user_id: staff.id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to cancel registration.", details: error.message },
      { status: 500 }
    );
  }

  if (data?.error) {
    return NextResponse.json({ error: data.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
