import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentStaff } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  formatCebuDate,
  formatCebuDateTime,
  formatCebuTimeRange,
} from "@/lib/time";
import type { DashboardEvent, RegistrationRecord } from "@/lib/types";

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function sanitizeEventNameForFile(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Event";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "xlsx").toLowerCase();

  const supabase = getSupabaseServerClient();

  const [eventsRes, regsRes] = await Promise.all([
    supabase.rpc("rpc_get_dashboard_events"),
    supabase.rpc("rpc_get_event_registrations", { p_event_id: id }),
  ]);

  if (regsRes.error) {
    return NextResponse.json(
      { error: "Failed to export attendees." },
      { status: 500 }
    );
  }

  const eventsList = (eventsRes.data ?? []) as DashboardEvent[];
  const eventObj = eventsList.find((e) => e.id === id);
  const safeEventName = sanitizeEventNameForFile(
    eventObj?.title || `Event-${id.slice(0, 8)}`
  );
  const baseFilename = `${safeEventName}-attendees`;
  const titleText = baseFilename.toUpperCase();
  const exportedAtText = formatCebuDateTime(new Date().toISOString());
  const dateDetailText = eventObj
    ? `Event Date: ${formatCebuDate(eventObj.starts_at)}  |  ${formatCebuTimeRange(eventObj.starts_at, eventObj.ends_at)}  |  Venue: ${eventObj.venue}  |  Exported: ${exportedAtText}`
    : `Exported: ${exportedAtText}`;

  const rows = (regsRes.data ?? []) as RegistrationRecord[];
  const headers = [
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

  // Optional plain CSV fallback via ?format=csv
  if (format === "csv") {
    const lines = [
      escapeCsvCell(titleText),
      escapeCsvCell(dateDetailText),
      headers.map(escapeCsvCell).join(","),
      ...rows.map((r) =>
        [
          r.full_name,
          r.email,
          `'${r.mobile}`,
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

    const csv = "\uFEFF" + lines.join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
      },
    });
  }

  // Default: Styled Excel (.xlsx) with bold uppercase Row 1 title,
  // CubePass ocean-blue header cells, and equal column widths
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CubePass Cebu";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Attendees", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  // Equal generous width across all 9 columns so nothing gets cut off
  sheet.columns = headers.map((_, idx) => ({
    key: `col_${idx}`,
    width: 26,
  }));

  // Row 1: Uppercase bold title matching the filename, merged across all columns
  sheet.mergeCells(1, 1, 1, headers.length);
  const titleRow = sheet.getRow(1);
  titleRow.height = 30;
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = titleText;
  titleCell.font = {
    name: "Calibri",
    size: 14,
    bold: true,
    color: { argb: "FF092D40" },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Event Date, Time (Cebu Time), Venue, and Export Date detail
  sheet.mergeCells(2, 1, 2, headers.length);
  const dateRow = sheet.getRow(2);
  dateRow.height = 22;
  const dateCell = sheet.getCell(2, 1);
  dateCell.value = dateDetailText;
  dateCell.font = {
    name: "Calibri",
    size: 10,
    italic: true,
    color: { argb: "FF4A5B68" },
  };
  dateCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: Column headers with CubePass ocean-blue color scheme (header cells only)
  const headerRow = sheet.getRow(3);
  headerRow.height = 24;
  headers.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF168BD0" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0C4560" } },
      bottom: { style: "thin", color: { argb: "FF0C4560" } },
      left: { style: "thin", color: { argb: "FF20A5E6" } },
      right: { style: "thin", color: { argb: "FF20A5E6" } },
    };
  });

  // Row 4+: Attendee rows with clean equal sizing and borders
  rows.forEach((r, idx) => {
    const row = sheet.getRow(idx + 4);
    row.height = 21;
    const values = [
      r.full_name,
      r.email,
      r.mobile,
      r.ticket_code,
      r.status.replace("_", " ").toUpperCase(),
      r.waitlist_position ?? "",
      formatCebuDateTime(r.registered_at),
      r.checked_in_at ? formatCebuDateTime(r.checked_in_at) : "",
      r.checked_in_by_name ?? "",
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      if (colIdx === 2) {
        cell.numFmt = "@"; // Keep leading 0 in PH mobile numbers
      }
      cell.font = { name: "Calibri", size: 10.5, color: { argb: "FF14222E" } };
      cell.alignment = {
        horizontal: colIdx <= 1 ? "left" : "center",
        vertical: "middle",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE8EDF0" } },
        bottom: { style: "thin", color: { argb: "FFE8EDF0" } },
        left: { style: "thin", color: { argb: "FFE8EDF0" } },
        right: { style: "thin", color: { argb: "FFE8EDF0" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseFilename}.xlsx"`,
    },
  });
}
