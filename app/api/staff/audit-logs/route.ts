import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("rpc_get_audit_logs", {
    p_limit: 150,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load audit logs." },
      { status: 500 }
    );
  }

  return NextResponse.json({ logs: data ?? [] });
}
