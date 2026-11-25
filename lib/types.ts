export type EventStatus = "draft" | "published" | "closed";
export type RegistrationStatus =
  | "confirmed"
  | "checked_in"
  | "waitlisted"
  | "cancelled";
export type StaffRole = "organizer" | "door_staff";

export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: EventStatus;
  confirmed_count: number;
  checked_in_count: number;
  active_count: number;
  waitlisted_count: number;
  spots_left: number;
  is_ended: boolean;
}

export interface DashboardEvent extends PublicEvent {
  created_at: string;
  cancelled_count: number;
  has_started: boolean;
  no_shows: number | null;
}

export interface RegistrationRecord {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  mobile: string;
  ticket_code: string;
  status: RegistrationStatus;
  registered_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_in_by_name?: string | null;
  undone_at?: string | null;
  undone_by?: string | null;
  undone_by_name?: string | null;
  cancelled_at?: string | null;
  waitlist_position?: number | null;
}

export interface TicketLookupPayload {
  found: boolean;
  registration?: RegistrationRecord;
  event?: {
    id: string;
    title: string;
    description: string;
    venue: string;
    starts_at: string;
    ends_at: string;
    status: EventStatus;
  };
  qr_data_url?: string | null;
}

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
}

export interface AuditLogEntry {
  id: string;
  staff_user_id: string | null;
  staff_name: string;
  action: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CheckInResult {
  result:
    | "checked_in"
    | "already_checked_in"
    | "waitlisted"
    | "cancelled"
    | "invalid"
    | "wrong_day";
  message: string;
  attendee_name?: string;
  ticket_code?: string;
  checked_in_at?: string;
}
