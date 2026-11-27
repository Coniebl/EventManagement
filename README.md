# Book&Go — Event Registration with QR Check-in

A full-stack **Event Registration & QR Check-in** web application built for the Intern Activity, targeting **Level 3 · Advanced**.

Attendees browse free upcoming Cebu events without creating an account, register or join the waitlist, receive a mobile-friendly HMAC-signed QR ticket pass, and can look up or cancel their registration anytime. Organizers and door staff sign in to the **Book&Go Admin Console** to manage events, inspect registrations, promote waitlists, export formatted Excel/CSV reports, review the audit log, and scan QR codes at the door using a live camera or manual/USB input.

---

## Target Level Reached

- **Level 1 · Core** — Complete
- **Level 2 · Intermediate** — Complete
- **Level 3 · Advanced** — Complete (all 6 advanced features implemented: Camera QR scanning, Last-spot & concurrent check-in race-condition locking, Secure HMAC-signed QR codes + rate limiting, Confirmation & waitlist-promotion email delivery, Organizer vs. Door Staff roles + Audit Log, and HTTPS/Vercel deployment-ready setup)

> **Live Deployed Link (Level 3 #17):** _Add your Vercel HTTPS URL here after deploying (e.g. `https://bookandgo.vercel.app`)_

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Route Handlers, Proxy) · React 19 · TypeScript
- **Styling**: Tailwind CSS v4 with Light & Dark Mode toggle (ocean blue `#168bd0`, cyan `#20c9db`, aqua `#42c8c2`, dark `#0b1218` / light `#f5f8fa` surfaces)
- **Database**: Supabase (PostgreSQL with Row Level Security + `SECURITY DEFINER` transactional PL/pgSQL RPC functions)
- **Authentication & Security**: `bcryptjs` password hashing (10 rounds), HMAC-SHA256 signed HTTP-only session cookies, HMAC-SHA256 signed ticket codes, sliding-window API rate limiting
- **QR Generation & Scanning**: `qrcode` (QR PNG generation) · `jsqr` + `navigator.mediaDevices.getUserMedia` (live camera scanning)
- **Spreadsheet Export**: `exceljs` (styled `.xlsx` with title row, event date detail, colored column headers, equal widths; plain `.csv` also supported via `?format=csv`)
- **Email Delivery (Level 3)**: Resend API or SMTP (`nodemailer` — compatible with Mailtrap / Ethereal sandbox)
- **Time Zone**: Cebu Local Time (`Asia/Manila`, UTC+8) formatted in 12-hour AM/PM

---

## Demo Staff Logins

Seeded via `supabase/seed.sql` (passwords stored as `bcryptjs` hashes, never plain text):

| Role | Username | Password | Permissions |
| --- | --- | --- | --- |
| **Organizer** | `organizer` | `Organizer123!` | Full admin access: create, edit, publish, close, and delete closed events; view/search/cancel attendees; promote waitlist; check in & undo check-in; export spreadsheets; view audit log |
| **Door Staff** | `doorstaff` | `DoorStaff123!` | QR check-in scanner (camera + manual/USB), undo check-in, read-only dashboard/events/attendee list/audit log, export spreadsheets (blocked with `403 Forbidden` from creating/editing/deleting events, cancelling registrations, or promoting waitlists) |

---

## Setup & Run Instructions

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd event-management
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials (never commit `.env.local`):

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
SESSION_SECRET=replace-with-long-random-session-secret
QR_HMAC_SECRET=replace-with-long-random-qr-hmac-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional Email Sandbox (Level 3 #15)
# Option A: Resend
RESEND_API_KEY=
EMAIL_FROM=Book&Go Cebu <onboarding@resend.dev>

# Option B: SMTP (Mailtrap / Ethereal)
SMTP_HOST=
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
```

### 3. Load Database Schema & Seed Data

Open your **Supabase Dashboard → SQL Editor** and run both files in order:

1. [`supabase/schema.sql`](./supabase/schema.sql) — Creates tables (`events`, `registrations`, `staff_users`, `audit_logs`), partial unique index, RLS policies, and atomic RPC functions.
2. [`supabase/seed.sql`](./supabase/seed.sql) — Seeds:
   - Both demo staff accounts (`organizer` and `doorstaff`)
   - **Cebu Dev Meetup 2026** (`Ayala Center Cebu, Function Room 2`, capacity `30`, scheduled today in Cebu time, 6 active registrations)
   - **Cebu Cloud & AI Workshop 2026** (capacity `3`, **FULL** with 3 confirmed + 1 waitlisted, scheduled today in Cebu time)
   - **Next.js & Supabase Clinic** (upcoming next week, capacity `25`)
   - **Cebu Tech Kickoff 2026** (past event, auto-closed)
   - **Cebu Design Systems Night (Draft)** (draft event, hidden from attendees)

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):
- **Attendee Portal (No sign-in required):** `/` (Events), `/events/[id]` (Event details & Registration), `/ticket` (Find My Ticket & Self-Cancel)
- **Staff Admin Portal (Sign-in required):** `/staff/login` → `/staff` (Dashboard), `/staff/events`, `/staff/attendees`, `/staff/checkin`, `/staff/audit`

---

## Data Model

| Table | Key Columns |
| --- | --- |
| `events` | `id`, `title`, `description`, `venue`, `starts_at`, `ends_at`, `capacity`, `status` (`draft`/`published`/`closed`), `created_at`, `updated_at` |
| `registrations` | `id`, `event_id`, `full_name`, `email`, `mobile`, `ticket_code` (unique), `status` (`confirmed`/`checked_in`/`waitlisted`/`cancelled`), `registered_at`, `checked_in_at`, `checked_in_by`, `undone_at`, `undone_by`, `cancelled_at` |
| `staff_users` | `id`, `name`, `username` (unique), `password_hash`, `role` (`organizer`/`door_staff`), `created_at` |
| `audit_logs` | `id`, `staff_user_id`, `staff_name`, `action`, `target_id`, `details` (`jsonb`), `created_at` |

### Key Database Constraints & Integrity Rules
- `events_ends_after_starts`: `CHECK (ends_at > starts_at)` and `CHECK (capacity >= 1)`.
- `registrations_one_active_email_per_event`: Partial unique index on `(event_id, lower(email)) WHERE status <> 'cancelled'` so one email can hold only one active spot per event while cancelled registrations do not block re-registering.
- Capacity counts `confirmed` + `checked_in` only (`waitlisted` and `cancelled` do not consume capacity).

---

## Race-Condition & Security Approach (Level 3 #13 & #14)

### Last-Spot & Concurrent Check-in Locking
- **Registration (`rpc_register_attendee`)**: Locks the target event row using `SELECT ... FROM events WHERE id = p_event_id FOR UPDATE` inside a single PostgreSQL transaction. If two attendees submit for the final seat at the exact same moment, the second request waits on the row lock, sees `active_count >= capacity`, and is cleanly placed on the waitlist instead of overbooking.
- **Check-in (`rpc_checkin_ticket`)**: Locks the registration row using `SELECT ... FROM registrations ... FOR UPDATE`. If two staff devices scan the same ticket simultaneously, only the first transitions `confirmed → checked_in`; the second reads `checked_in` and displays yellow **"Already checked in"** with the first check-in time.

### Secure QR Content & Rate Limiting
- **HMAC-Signed Ticket Codes**: Generated via `crypto.randomBytes` + `HMAC-SHA256` (`<PREFIX>-<8_RANDOM>-<4_HMAC>`, e.g., `CDM-7K3P9Q4M-C188`). Sequential or edited codes (such as `CDM-000001`) fail timing-safe HMAC verification immediately before hitting the database.
- **Rate Limiting**: In-memory sliding-window rate limits protect `/api/tickets/lookup`, `/api/tickets/cancel`, `/api/staff/login`, and `/api/staff/checkin` (`429 Too Many Requests` with `Retry-After`).
- **Server-Side Auth & RBAC**: `proxy.ts` redirects unauthenticated `/staff/*` requests to `/staff/login`, and every staff Server Component (`requireStaffPage`) and API Route Handler independently verifies the signed HTTP-only session cookie and staff role.

---

## Completed Features

### Level 1 · Core
- Public upcoming events list with Cebu local time (12-hour AM/PM), venue, and live spots left (`X of Y spots left`).
- Event details page with description, disabled Register button when full, and registration form validating required fields, email format, and 11-digit Philippine mobile (`09XXXXXXXXX`) with per-field errors.
- Duplicate active email blocking and server-side capacity verification.
- Mobile-friendly (and desktop side-by-side) QR ticket pass + secure ticket lookup (`ticket code + email/mobile`) returning `"Ticket not found"` with zero details on mismatch.
- Hashed-password staff sign-in with server-enforced route protection.
- Door check-in screen with color + icon + text feedback (Green **Checked in**, Yellow **Already checked in + time**, Red **Invalid ticket**).
- Attendee list with `registered / capacity` and `checked in / registered` totals and search by name, email, or ticket code.

### Level 2 · Intermediate
- Full event management (Create, Edit, Draft, Published, Closed, plus Organizer-only Delete for Closed events) with server-enforced time and capacity validation (cannot lower capacity below active registrations).
- Automatic closing of past events and automatic reopening when an organizer extends the event end time.
- Full-event waitlist with position display (`#N on the waitlist`), non-working QR notice on scan (`"On waitlist — not confirmed"`), and one-click **Promote #1**.
- Attendee self-cancellation from `/ticket` and Organizer cancellation from the Attendee Directory (blocked if already checked in; frees 1 spot; scans as `"Cancelled"`).
- Staff Dashboard with per-event capacity, confirmed, checked in, waitlisted, cancelled, no-shows (shown after event starts), inline status filter, and 10-row pagination.
- Live door check-in counter + Undo check-in (records who undid it and when).
- Styled Excel (`.xlsx`) export (`<EventName>-attendees.xlsx` with uppercase title, event date details, ocean-blue header row, and equal column widths) plus plain CSV export (`?format=csv`).

### Level 3 · Advanced
- Live camera QR scanner (`jsQR` + `getUserMedia`) with ~2-second result pause and automatic reset + manual/USB fallback.
- Database row-level locking (`SELECT ... FOR UPDATE`) preventing last-spot overbooking and duplicate concurrent check-ins.
- Cryptographically random HMAC-SHA256 signed ticket codes + endpoint rate limiting.
- Automated confirmation and waitlist-promotion emails with embedded QR image and ticket link (Resend or SMTP sandbox).
- Organizer vs. Door Staff role-based access control + Audit Log with Cebu date calendar filter and 10-row pagination.
- Light & Dark mode toggle and Vercel/HTTPS deployment configuration.

---

## Deployment (Vercel + Supabase)

1. Push this repository to GitHub.
2. Import the repository on [Vercel](https://vercel.com).
3. Add all environment variables from `.env.example` in **Vercel Project Settings → Environment Variables** (set `NEXT_PUBLIC_APP_URL` to your `https://*.vercel.app` URL).
4. Deploy — Vercel provides HTTPS automatically, enabling mobile phone camera QR scanning.

---

## Known Limitations

- Rate limiting uses an in-memory sliding window per server instance (ideal for single-node/demo deployments; for multi-region serverless scale, swap with Redis/Upstash).
- Email delivery requires setting `RESEND_API_KEY` or `SMTP_*` (Mailtrap/Ethereal) in `.env.local` / Vercel env vars; when unconfigured, email previews are logged to the server console without blocking registration.

---

## Acceptance Checklist

> Mark each item **Pass** after running your final end-to-end walkthrough (including email sandbox + deployed HTTPS phone test).

### Level 1
- [x] Register for Cebu Dev Meetup 2026 on a phone-sized screen and see a ticket with a QR code.
- [x] Scan the QR with any phone QR app: it shows the same ticket code.
- [x] Refresh the browser, then find the ticket again with ticket code + email.
- [x] A wrong ticket code or wrong email shows "Ticket not found" and no details.
- [x] Register the same email twice for one event: the second attempt is blocked.
- [x] Submit the form with a bad email and a 10-digit mobile number: both show errors.
- [x] Open the seeded full event: it shows "Full" and the Register button is disabled.
- [x] Open a staff page while signed out: you are sent to the sign-in page.
- [x] Check in a valid ticket: green "Checked in" with the name.
- [x] Check in the same ticket again: yellow "Already checked in" with the first time.
- [x] Enter a made-up code, and a real code from a different event: both show "Invalid ticket".
- [x] The attendee list shows correct registered and checked-in totals.

### Level 2
- [x] Create a Draft event: attendees cannot see it. Publish it: it appears.
- [x] Try to save an event whose end time is before its start time: blocked.
- [x] Try to lower capacity below the number registered: blocked with a message.
- [x] Fill an event, then join the waitlist and see your position.
- [x] Scan a waitlisted ticket: "On waitlist — not confirmed".
- [x] Cancel one confirmed registration: spots left goes up by 1; scanning it shows "Cancelled".
- [x] Promote the first waitlisted person: they now check in successfully.
- [x] Try to cancel a checked-in registration: blocked.
- [x] Undo a check-in: the ticket can be checked in again, and the undo is recorded.
- [x] Dashboard counts match the attendee list. Export opens correctly in Excel.

### Level 3
- [x] Scan a ticket from another phone's screen with the camera: correct result, then ready for the next scan.
- [x] Two browsers register for the last spot at the same moment: only one gets it.
- [x] Two devices check in the same ticket at the same moment: only one says "Checked in".
- [x] Guess a sequential or edited ticket code: never valid.
- [ ] Registration and waitlist-promotion emails arrive in the sandbox inbox with the QR or ticket link *(configure `RESEND_API_KEY` or `SMTP_*` sandbox credentials to verify)*.
- [x] Door staff cannot create or edit events; Organizer can.
- [ ] The deployed link works on a phone over HTTPS, including the camera *(deploy to Vercel and paste your live URL above)*.
