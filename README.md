# EventFlow Cebu — Event Registration with QR Check-in

A full-stack Event Registration & QR Check-in web application built for the **Event Registration with QR Check-in** intern activity, targeting **Level 3 (Advanced)**.

Attendees browse free events, register without creating an account, receive a mobile-friendly HMAC-signed QR ticket, and can look up or cancel their registration anytime. Organizers and door staff sign in to an admin console to manage events, inspect attendees, promote waitlists, export CSVs, review the audit log, and scan QR codes with a live camera or manual/USB input.

---

## Target Level Reached

- **Level 1 · Core** — Complete
- **Level 2 · Intermediate** — Complete
- **Level 3 · Advanced** — Complete (Camera QR scanning, Last-spot race condition locking, Secure HMAC-signed QR codes + rate limiting, Email confirmation & waitlist promotion support, Organizer vs. Door Staff roles + Audit Log, Vercel/HTTPS deployment ready)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router + Route Handlers + Proxy) with React 19 & TypeScript
- **Styling**: Tailwind CSS v4 (themed with ocean blue `#168bd0`, cyan `#20c9db`, and aqua `#42c8c2` surfaces)
- **Database**: Supabase (PostgreSQL with Row Level Security + `SECURITY DEFINER` transactional RPC functions)
- **Auth & Security**: `bcryptjs` password hashing, HMAC-SHA256 signed HTTP-only session cookies, HMAC-SHA256 signed ticket codes, sliding-window API rate limiting
- **QR Code**: `qrcode` (generation) & `jsqr` + `getUserMedia` (live camera scanning)
- **Email (Level 3)**: Resend API or SMTP (`nodemailer` — compatible with Mailtrap / Ethereal sandbox)
- **Time Zone**: Cebu Local Time (`Asia/Manila`, UTC+8) in 12-hour AM/PM format

---

## Demo Staff Logins

Seeded via `supabase/seed.sql` (passwords stored as `bcryptjs` hashes, never plain text):

| Role | Username | Password | Permissions |
| --- | --- | --- | --- |
| **Organizer** | `organizer` | `Organizer123!` | Full admin access: create/edit/publish/close events, manage attendees, promote waitlist, cancel registrations, check-in, undo check-in, CSV export, audit log |
| **Door Staff** | `doorstaff` | `DoorStaff123!` | Check-in scanner, undo check-in, read-only dashboard/events/attendee list, CSV export (blocked from creating/editing events or cancelling/promoting) |

---

## Setup & Run Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SESSION_SECRET=replace-with-long-random-secret
QR_HMAC_SECRET=replace-with-long-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional email sandbox variables (Level 3 #15):
- **Resend**: set `RESEND_API_KEY` and `EMAIL_FROM`
- **Mailtrap / Ethereal SMTP**: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

### 3. Load Database Schema & Seed Data

Open your **Supabase Dashboard → SQL Editor** and run these two scripts in order:

1. `supabase/schema.sql` — Creates tables (`events`, `registrations`, `staff_users`, `audit_logs`), partial unique indexes, RLS policies, and atomic PostgreSQL RPC functions.
2. `supabase/seed.sql` — Seeds:
   - Demo staff accounts (`organizer`, `doorstaff`)
   - **Cebu Dev Meetup 2026** (`Ayala Center Cebu, Function Room 2`, capacity `30`, scheduled **today** in Cebu time, 6 active registrations)
   - **Cebu Cloud & AI Workshop 2026** (capacity `3`, **FULL** with 3 confirmed + 1 waitlisted, scheduled **today** in Cebu time)
   - **Next.js & Supabase Clinic** (upcoming next week, capacity `25`)
   - **Cebu Tech Kickoff 2026** (past event marked **Ended**)
   - **Cebu Design Systems Night (Draft)** (draft event hidden from attendees)

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
- **Attendee Portal**: `/` (Events), `/events/[id]` (Details & Registration), `/ticket` (Ticket Lookup & Self-Cancel)
- **Staff Admin Portal**: `/staff/login` → `/staff` (Dashboard), `/staff/events`, `/staff/attendees`, `/staff/checkin`, `/staff/audit`

---

## Data Model

| Table | Key Columns |
| --- | --- |
| `events` | `id`, `title`, `description`, `venue`, `starts_at`, `ends_at`, `capacity`, `status` (`draft`/`published`/`closed`), `created_at`, `updated_at` |
| `registrations` | `id`, `event_id`, `full_name`, `email`, `mobile`, `ticket_code` (unique), `status` (`confirmed`/`checked_in`/`waitlisted`/`cancelled`), `registered_at`, `checked_in_at`, `checked_in_by`, `undone_at`, `undone_by`, `cancelled_at` |
| `staff_users` | `id`, `name`, `username` (unique), `password_hash`, `role` (`organizer`/`door_staff`), `created_at` |
| `audit_logs` | `id`, `staff_user_id`, `staff_name`, `action`, `target_id`, `details` (jsonb), `created_at` |

A partial unique index `registrations_one_active_email_per_event` on `(event_id, lower(email)) WHERE status <> 'cancelled'` enforces one active registration per email per event at the database level while allowing re-registration after cancellation.

---

## Race-Condition Prevention (Level 3 #13)

Both registration and check-in use PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside transactional PL/pgSQL RPC functions:

- **Last-spot registration (`rpc_register_attendee`)**: Locks the target `events` row with `SELECT ... FROM events WHERE id = p_event_id FOR UPDATE`. Concurrent requests for the last seat serialize cleanly — the first commits as `confirmed` and the second immediately sees `active_count >= capacity` and is placed on the `waitlist` (or rejected if waitlist is disabled).
- **Concurrent check-in (`rpc_checkin_ticket`)**: Locks the target `registrations` row with `SELECT ... FROM registrations ... FOR UPDATE`. If two door devices scan the exact same QR code at the same millisecond, only the first transitions `confirmed → checked_in`; the second reads the committed `checked_in` row and returns yellow `"Already checked in"` with the first check-in timestamp.

---

## Security & QR Integrity (Level 3 #14)

- **Signed Ticket Codes**: Ticket codes follow `<PREFIX>-<8_CRYPTO_RANDOM>-<4_HMAC_HEX>` (e.g. `CDM-7K3P9Q4M-C188`) using `crypto.randomBytes` and `HMAC-SHA256` with `QR_HMAC_SECRET`. Sequential or edited codes (like `CDM-000001`) fail timing-safe HMAC verification before touching the database.
- **Rate Limiting**: Sliding-window rate limits protect `/api/tickets/lookup`, `/api/tickets/cancel`, `/api/staff/login`, and `/api/staff/checkin`.
- **Server-Side Auth & RBAC**: `proxy.ts` redirects unauthenticated `/staff/*` requests to `/staff/login`, and every staff Server Component and API Route Handler independently verifies the signed HTTP-only cookie and staff role (`organizer` vs `door_staff`).

---

## Deployment (Level 3 #17)

Deploy directly to **Vercel** (HTTPS enabled automatically, which is required for mobile browser camera QR scanning):
1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Add the environment variables from `.env.example` in Vercel Project Settings (set `NEXT_PUBLIC_APP_URL` to your `https://*.vercel.app` URL).
4. Deploy and test camera scanning on a mobile phone over HTTPS.

---

## Known Limitations

- Rate limiting uses an in-memory sliding window per server instance (sufficient for single-node/demo deployments; use Redis/Upstash for multi-region serverless scale).
- Email delivery requires configuring `RESEND_API_KEY` or `SMTP_*` sandbox credentials in `.env.local`; when unconfigured, email previews are logged cleanly to the server console without blocking registration.

---

## Acceptance Checklist

### Level 1
- [ ] Register for Cebu Dev Meetup 2026 on a phone-sized screen and see a ticket with a QR code.
- [ ] Scan the QR with any phone QR app: it shows the same ticket code.
- [ ] Refresh the browser, then find the ticket again with ticket code + email.
- [ ] A wrong ticket code or wrong email shows "Ticket not found" and no details.
- [ ] Register the same email twice for one event: the second attempt is blocked.
- [ ] Submit the form with a bad email and a 10-digit mobile number: both show errors.
- [ ] Open the seeded full event: it shows "Full" and the Register button is disabled.
- [ ] Open a staff page while signed out: you are sent to the sign-in page.
- [ ] Check in a valid ticket: green "Checked in" with the name.
- [ ] Check in the same ticket again: yellow "Already checked in" with the first time.
- [ ] Enter a made-up code, and a real code from a different event: both show "Invalid ticket".
- [ ] The attendee list shows correct registered and checked-in totals.

### Level 2
- [ ] Create a Draft event: attendees cannot see it. Publish it: it appears.
- [ ] Try to save an event whose end time is before its start time: blocked.
- [ ] Try to lower capacity below the number registered: blocked with a message.
- [ ] Fill an event, then join the waitlist and see your position.
- [ ] Scan a waitlisted ticket: "On waitlist — not confirmed".
- [ ] Cancel one confirmed registration: spots left goes up by 1; scanning it shows "Cancelled".
- [ ] Promote the first waitlisted person: they now check in successfully.
- [ ] Try to cancel a checked-in registration: blocked.
- [ ] Undo a check-in: the ticket can be checked in again, and the undo is recorded.
- [ ] Dashboard counts match the attendee list. CSV export opens correctly in Excel.

### Level 3
- [ ] Scan a ticket from another phone's screen with the camera: correct result, then ready for the next scan.
- [ ] Two browsers register for the last spot at the same moment: only one gets it.
- [ ] Two devices check in the same ticket at the same moment: only one says "Checked in".
- [ ] Guess a sequential or edited ticket code: never valid.
- [ ] Registration and waitlist-promotion emails arrive in the sandbox inbox with the QR or ticket link.
- [ ] Door staff cannot create or edit events; Organizer can.
- [ ] The deployed link works on a phone over HTTPS, including the camera.
