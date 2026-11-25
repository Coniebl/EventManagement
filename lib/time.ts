export const CEBU_TIMEZONE = "Asia/Manila";

export function formatCebuDate(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: CEBU_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatCebuTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: CEBU_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatCebuTimeRange(startsAt: string, endsAt: string): string {
  return `${formatCebuTime(startsAt)} – ${formatCebuTime(endsAt)} (Cebu Time)`;
}

export function formatCebuDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: CEBU_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function getCebuDateBadge(iso: string): { month: string; day: string } {
  const date = new Date(iso);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: CEBU_TIMEZONE,
    month: "short",
  })
    .format(date)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: CEBU_TIMEZONE,
    day: "2-digit",
  }).format(date);
  return { month, day };
}

/**
 * Convert an ISO timestamp to Cebu local parts for HTML date/time inputs
 */
export function isoToCebuDateAndTime(iso: string): {
  date: string;
  time: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CEBU_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${hour}:${map.minute}`,
  };
}

/**
 * Convert Cebu date ("YYYY-MM-DD") and time ("HH:MM") to an ISO string with +08:00 offset
 */
export function cebuDateAndTimeToIso(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00+08:00`;
}
