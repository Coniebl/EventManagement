-- ============================================================================
-- Seed Data for Event Registration with QR Check-in
-- Run this in Supabase SQL Editor AFTER supabase/schema.sql
--
-- Demo Staff Logins (hashed with bcryptjs, 10 rounds):
--   Organizer  -> username: organizer  | password: Organizer123!
--   Door Staff -> username: doorstaff  | password: DoorStaff123!
-- ============================================================================

-- 1. SEED STAFF ACCOUNTS (idempotent via username)
insert into public.staff_users (id, name, username, password_hash, role)
values
  (
    '11111111-1111-4111-8111-111111111101',
    'Clara Reyes',
    'organizer',
    '$2b$10$A.O3MibEf6I3j7l9UtC5detPPuxpOGXx/ZfzbvY7e0BYWh4q5HqYW',
    'organizer'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Marco Santos',
    'doorstaff',
    '$2b$10$nWQA1UNw33aknnBIVXxReudUmQDJV.tiFSsas2W9RtPkqN1pydPvm',
    'door_staff'
  )
on conflict (username) do nothing;

-- 2. SEED EVENTS (dynamically anchored to today in Cebu time / Asia/Manila)
do $$
declare
  v_today_manila date := (now() at time zone 'Asia/Manila')::date;
  v_ev_meetup uuid := '22222222-2222-4222-8222-222222222201';
  v_ev_full   uuid := '22222222-2222-4222-8222-222222222202';
  v_ev_next   uuid := '22222222-2222-4222-8222-222222222203';
  v_ev_past   uuid := '22222222-2222-4222-8222-222222222204';
  v_ev_draft  uuid := '22222222-2222-4222-8222-222222222205';
  v_org_id    uuid := '11111111-1111-4111-8111-111111111101';
  v_door_id   uuid := '11111111-1111-4111-8111-111111111102';
begin
  -- Event 1: Demo event required by instructions (Cebu Dev Meetup 2026, capacity 30, TODAY)
  insert into public.events (id, title, description, venue, starts_at, ends_at, capacity, status)
  values (
    v_ev_meetup,
    'Cebu Dev Meetup 2026',
    'Join Cebu''s software engineering community for lightning talks on modern web architecture, live coding demos, and open networking over coffee.',
    'Ayala Center Cebu, Function Room 2',
    ((v_today_manila::text || ' 09:00:00')::timestamp at time zone 'Asia/Manila'),
    ((v_today_manila::text || ' 22:00:00')::timestamp at time zone 'Asia/Manila'),
    30,
    'published'
  )
  on conflict (id) do nothing;

  -- Event 2: Seeded FULL event (capacity 3, 3 confirmed + 1 waitlisted, TODAY)
  insert into public.events (id, title, description, venue, starts_at, ends_at, capacity, status)
  values (
    v_ev_full,
    'Cebu Cloud & AI Workshop 2026',
    'Hands-on small-group lab building production AI workflows and serverless APIs. Limited to 3 seats for hands-on mentoring — waitlist open!',
    'IT Park, Skyrise 4B, Cebu City',
    ((v_today_manila::text || ' 10:00:00')::timestamp at time zone 'Asia/Manila'),
    ((v_today_manila::text || ' 21:00:00')::timestamp at time zone 'Asia/Manila'),
    3,
    'published'
  )
  on conflict (id) do nothing;

  -- Event 3: Upcoming event next week
  insert into public.events (id, title, description, venue, starts_at, ends_at, capacity, status)
  values (
    v_ev_next,
    'Next.js & Supabase Clinic',
    'Deep dive into App Router performance, PostgreSQL row-level security, and real-time event apps with live Q&A.',
    'Cebu Business Park, Tech Hub Hall A',
    (((v_today_manila + 7)::text || ' 14:00:00')::timestamp at time zone 'Asia/Manila'),
    (((v_today_manila + 7)::text || ' 18:00:00')::timestamp at time zone 'Asia/Manila'),
    25,
    'published'
  )
  on conflict (id) do nothing;

  -- Event 4: Past event (Ended)
  insert into public.events (id, title, description, venue, starts_at, ends_at, capacity, status)
  values (
    v_ev_past,
    'Cebu Tech Kickoff 2026',
    'Our community kickoff celebrating Cebu builders, designers, and engineers.',
    'SM Seaside City Cebu, Hall 1',
    (((v_today_manila - 10)::text || ' 13:00:00')::timestamp at time zone 'Asia/Manila'),
    (((v_today_manila - 10)::text || ' 17:00:00')::timestamp at time zone 'Asia/Manila'),
    40,
    'published'
  )
  on conflict (id) do nothing;

  -- Event 5: Draft event (hidden from attendees, visible to staff)
  insert into public.events (id, title, description, venue, starts_at, ends_at, capacity, status)
  values (
    v_ev_draft,
    'Cebu Design Systems Night (Draft)',
    'Draft event for testing publish workflow. Not visible to attendees until published.',
    'Oakridge Pavilion, Mandaue City',
    (((v_today_manila + 14)::text || ' 18:00:00')::timestamp at time zone 'Asia/Manila'),
    (((v_today_manila + 14)::text || ' 21:00:00')::timestamp at time zone 'Asia/Manila'),
    20,
    'draft'
  )
  on conflict (id) do nothing;

  -- 3. SEED REGISTRATIONS
  -- Cebu Dev Meetup 2026 (4 confirmed + 2 checked_in = 6/30 active, 24 spots left)
  insert into public.registrations (event_id, full_name, email, mobile, ticket_code, status, registered_at, checked_in_at, checked_in_by)
  values
    (v_ev_meetup, 'Maria Elena Cruz',    'maria.cruz@example.com',    '09171234561', 'CDM-7K3P9Q4M-C188', 'checked_in', now() - interval '2 days', now() - interval '1 hour', v_door_id),
    (v_ev_meetup, 'Juan Carlo Reyes',    'juan.reyes@example.com',    '09171234562', 'CDM-8M2N5V7R-89B6', 'checked_in', now() - interval '2 days', now() - interval '40 minutes', v_door_id),
    (v_ev_meetup, 'Sofia Tan',           'sofia.tan@example.com',     '09171234563', 'CDM-4T6W9X2K-24B6', 'confirmed',  now() - interval '1 day',  null, null),
    (v_ev_meetup, 'Miguel Villanueva',   'miguel.v@example.com',      '09171234564', 'CDM-9P3R7J5N-6F8F', 'confirmed',  now() - interval '1 day',  null, null),
    (v_ev_meetup, 'Andrea Lim',          'andrea.lim@example.com',    '09171234565', 'CDM-2H8D4F6L-6D40', 'confirmed',  now() - interval '12 hours', null, null),
    (v_ev_meetup, 'Rafael Mendoza',      'rafael.m@example.com',      '09171234566', 'CDM-6C9V3B8M-3F7A', 'confirmed',  now() - interval '6 hours', null, null)
  on conflict (ticket_code) do nothing;

  -- Cebu Cloud & AI Workshop 2026 (FULL: 3/3 confirmed + 1 waitlisted)
  insert into public.registrations (event_id, full_name, email, mobile, ticket_code, status, registered_at)
  values
    (v_ev_full, 'Patricia Gomez',    'patricia.gomez@example.com', '09181234501', 'CDM-5K7M2Q9W-059A', 'confirmed',  now() - interval '3 days'),
    (v_ev_full, 'Daniel Bautista',   'daniel.b@example.com',       '09181234502', 'CDM-3X8P6N4T-7815', 'confirmed',  now() - interval '2 days'),
    (v_ev_full, 'Camille Soriano',   'camille.s@example.com',      '09181234503', 'CDM-7B4R9K2D-B0A4', 'confirmed',  now() - interval '1 day'),
    (v_ev_full, 'Paolo Navarro',     'paolo.navarro@example.com',  '09181234504', 'CDM-8L5T3M7P-157F', 'waitlisted', now() - interval '12 hours')
  on conflict (ticket_code) do nothing;

  -- Initial Audit Log entry
  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  select v_org_id, 'Clara Reyes', 'event_created', v_ev_meetup::text,
         jsonb_build_object('title', 'Cebu Dev Meetup 2026', 'status', 'published', 'capacity', 30)
  where not exists (select 1 from public.audit_logs where target_id = v_ev_meetup::text and action = 'event_created');
end $$;
