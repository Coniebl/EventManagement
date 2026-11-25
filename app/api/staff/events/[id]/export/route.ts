import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { formatCebuDateTime } from "@/lib/time";
import type { RegistrationRecord } from "@/lib/types";

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

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
      { error: "Failed to export CSV." },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as RegistrationRecord[];
  const header = [
    "Full Name",
    "Email",
    "Mobile",
    "Ticket Code",
    "Status",
    "Waitlist Position",
    "Registered At (Cebu Time)",
    "Checked In At (Cebu Time)",
    "Checked In By",
  ];

  const lines = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((r) =>
      [
        r.full_name,
        r.email,
        `'${r.mobile}`, // Prevent Excel from stripping leading 0 on PH mobile numbers
        r.ticket_code,
        r.status,
        r.waitlist_position ?? "",
        formatCebuDateTime(r.registered_at),
        r.checked_in_at ? formatCebuDateTime(r.checked_in_at) : "",
        r.checked_in_by_name ?? "",
      ]
        .map(escapeCsvCell)
        .join(",")
    ),
  ];

  // UTF-8 BOM for clean Excel opening
  const csv = "\uFEFF" + lines.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendees-${id.slice(0, 8)}.csv"`,
    },
  });
}
