-- ============================================================================
-- Event Registration with QR Check-in (Level 1, 2, 3)
-- Supabase PostgreSQL Schema, RLS Policies, and Atomic RPC Functions
-- Time zone standard: Asia/Manila (UTC+8)
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password_hash text not null,
  role text not null default 'door_staff' check (role in ('organizer', 'door_staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  venue text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity >= 1),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_starts check (ends_at > starts_at)
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  email text not null,
  mobile text not null,
  ticket_code text not null unique,
  status text not null default 'confirmed' check (status in ('confirmed', 'checked_in', 'waitlisted', 'cancelled')),
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid references public.staff_users(id) on delete set null,
  undone_at timestamptz,
  undone_by uuid references public.staff_users(id) on delete set null,
  cancelled_at timestamptz
);

-- Booking rule: One active registration per email per event.
-- Cancelled registrations do NOT block re-registering.
create unique index if not exists registrations_one_active_email_per_event
  on public.registrations (event_id, lower(email))
  where status <> 'cancelled';

create index if not exists idx_registrations_event_status
  on public.registrations (event_id, status, registered_at);

create index if not exists idx_registrations_ticket_code
  on public.registrations (upper(ticket_code));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references public.staff_users(id) on delete set null,
  staff_name text not null default 'System',
  action text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

-- 2. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
-- Lock down direct table access; all app operations go through server-side
-- Next.js API routes invoking SECURITY DEFINER RPC functions below.

alter table public.staff_users enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.audit_logs enable row level security;

-- Drop existing policies if re-running
drop policy if exists "public_read_published_events" on public.events;

create policy "public_read_published_events"
  on public.events for select
  using (status = 'published');

-- 3. PUBLIC / ATTENDEE RPC FUNCTIONS
-- ----------------------------------------------------------------------------

create or replace function public.rpc_get_public_events()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'venue', e.venue,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'capacity', e.capacity,
        'status', e.status,
        'confirmed_count', coalesce(stats.confirmed_count, 0),
        'checked_in_count', coalesce(stats.checked_in_count, 0),
        'active_count', coalesce(stats.active_count, 0),
        'waitlisted_count', coalesce(stats.waitlisted_count, 0),
        'spots_left', greatest(0, e.capacity - coalesce(stats.active_count, 0)),
        'is_ended', (e.ends_at < now())
      )
      order by (e.ends_at < now()) asc, e.starts_at asc
    ),
    '[]'::jsonb
  )
  from public.events e
  left join lateral (
    select
      count(*) filter (where r.status = 'confirmed') as confirmed_count,
      count(*) filter (where r.status = 'checked_in') as checked_in_count,
      count(*) filter (where r.status in ('confirmed', 'checked_in')) as active_count,
      count(*) filter (where r.status = 'waitlisted') as waitlisted_count
    from public.registrations r
    where r.event_id = e.id
  ) stats on true
  where e.status = 'published';
$$;

create or replace function public.rpc_get_public_event(p_event_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'venue', e.venue,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'capacity', e.capacity,
    'status', e.status,
    'confirmed_count', coalesce(stats.confirmed_count, 0),
    'checked_in_count', coalesce(stats.checked_in_count, 0),
    'active_count', coalesce(stats.active_count, 0),
    'waitlisted_count', coalesce(stats.waitlisted_count, 0),
    'spots_left', greatest(0, e.capacity - coalesce(stats.active_count, 0)),
    'is_ended', (e.ends_at < now())
  )
  from public.events e
  left join lateral (
    select
      count(*) filter (where r.status = 'confirmed') as confirmed_count,
      count(*) filter (where r.status = 'checked_in') as checked_in_count,
      count(*) filter (where r.status in ('confirmed', 'checked_in')) as active_count,
      count(*) filter (where r.status = 'waitlisted') as waitlisted_count
    from public.registrations r
    where r.event_id = e.id
  ) stats on true
  where e.id = p_event_id
    and e.status = 'published';
$$;

-- Atomic registration with row-level lock (Level 3 #13: Last-spot race condition)
create or replace function public.rpc_register_attendee(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_mobile text,
  p_ticket_code text,
  p_allow_waitlist boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_active_count integer;
  v_existing_id uuid;
  v_new_status text;
  v_reg public.registrations%rowtype;
  v_waitlist_pos integer := null;
begin
  -- Lock the event row to serialize concurrent registrations for the last spot
  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('error', 'event_not_found', 'message', 'Event not found.');
  end if;

  if v_event.status <> 'published' then
    return jsonb_build_object('error', 'event_closed', 'message', 'This event is not open for registration.');
  end if;

  if v_event.ends_at < now() then
    return jsonb_build_object('error', 'event_ended', 'message', 'This event has already ended.');
  end if;

  -- Check duplicate active registration for same email
  select id into v_existing_id
  from public.registrations
  where event_id = p_event_id
    and lower(email) = lower(trim(p_email))
    and status <> 'cancelled'
  limit 1;

  if found then
    return jsonb_build_object(
      'error', 'duplicate_email',
      'message', 'This email is already registered for this event.'
    );
  end if;

  -- Count capacity-consuming registrations (confirmed + checked_in)
  select count(*) into v_active_count
  from public.registrations
  where event_id = p_event_id
    and status in ('confirmed', 'checked_in');

  if v_active_count < v_event.capacity then
    v_new_status := 'confirmed';
  else
    if not p_allow_waitlist then
      return jsonb_build_object('error', 'event_full', 'message', 'This event is already full.');
    end if;
    v_new_status := 'waitlisted';
  end if;

  insert into public.registrations (
    event_id, full_name, email, mobile, ticket_code, status
  ) values (
    p_event_id,
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_mobile),
    upper(trim(p_ticket_code)),
    v_new_status
  )
  returning * into v_reg;

  if v_new_status = 'waitlisted' then
    select count(*) into v_waitlist_pos
    from public.registrations
    where event_id = p_event_id
      and status = 'waitlisted'
      and (registered_at < v_reg.registered_at or (registered_at = v_reg.registered_at and id <= v_reg.id));
  end if;

  return jsonb_build_object(
    'ok', true,
    'registration', jsonb_build_object(
      'id', v_reg.id,
      'event_id', v_reg.event_id,
      'full_name', v_reg.full_name,
      'email', v_reg.email,
      'mobile', v_reg.mobile,
      'ticket_code', v_reg.ticket_code,
      'status', v_reg.status,
      'registered_at', v_reg.registered_at,
      'checked_in_at', v_reg.checked_in_at,
      'waitlist_position', v_waitlist_pos
    ),
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'venue', v_event.venue,
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'error', 'duplicate_email',
      'message', 'This email is already registered for this event.'
    );
end;
$$;

-- Secure ticket lookup: requires ticket_code AND (email OR mobile)
create or replace function public.rpc_lookup_ticket(
  p_ticket_code text,
  p_contact text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.registrations%rowtype;
  v_event public.events%rowtype;
  v_waitlist_pos integer := null;
  v_clean_contact text := trim(p_contact);
begin
  select * into v_reg
  from public.registrations
  where upper(ticket_code) = upper(trim(p_ticket_code))
    and (
      lower(email) = lower(v_clean_contact)
      or mobile = v_clean_contact
    )
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select * into v_event
  from public.events
  where id = v_reg.event_id;

  if v_reg.status = 'waitlisted' then
    select count(*) into v_waitlist_pos
    from public.registrations
    where event_id = v_reg.event_id
      and status = 'waitlisted'
      and (registered_at < v_reg.registered_at or (registered_at = v_reg.registered_at and id <= v_reg.id));
  end if;

  return jsonb_build_object(
    'found', true,
    'registration', jsonb_build_object(
      'id', v_reg.id,
      'event_id', v_reg.event_id,
      'full_name', v_reg.full_name,
      'email', v_reg.email,
      'mobile', v_reg.mobile,
      'ticket_code', v_reg.ticket_code,
      'status', v_reg.status,
      'registered_at', v_reg.registered_at,
      'checked_in_at', v_reg.checked_in_at,
      'cancelled_at', v_reg.cancelled_at,
      'waitlist_position', v_waitlist_pos
    ),
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'description', v_event.description,
      'venue', v_event.venue,
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at,
      'status', v_event.status
    )
  );
end;
$$;

-- Attendee self-cancellation (Level 2 #09)
create or replace function public.rpc_self_cancel_registration(
  p_ticket_code text,
  p_contact text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.registrations%rowtype;
  v_clean_contact text := trim(p_contact);
begin
  select * into v_reg
  from public.registrations
  where upper(ticket_code) = upper(trim(p_ticket_code))
    and (
      lower(email) = lower(v_clean_contact)
      or mobile = v_clean_contact
    )
  for update;

  if not found then
    return jsonb_build_object('error', 'not_found', 'message', 'Ticket not found.');
  end if;

  if v_reg.status = 'checked_in' then
    return jsonb_build_object('error', 'checked_in', 'message', 'Checked-in registrations cannot be cancelled.');
  end if;

  if v_reg.status = 'cancelled' then
    return jsonb_build_object('error', 'already_cancelled', 'message', 'This registration is already cancelled.');
  end if;

  update public.registrations
  set status = 'cancelled',
      cancelled_at = now()
  where id = v_reg.id;

  return jsonb_build_object('ok', true, 'ticket_code', v_reg.ticket_code);
end;
$$;

-- 4. STAFF AUTH & ADMIN RPC FUNCTIONS
-- ----------------------------------------------------------------------------

create or replace function public.rpc_get_staff_by_username(p_username text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'username', username,
    'password_hash', password_hash,
    'role', role
  )
  from public.staff_users
  where lower(username) = lower(trim(p_username))
  limit 1;
$$;

create or replace function public.rpc_get_staff_by_id(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'username', username,
    'role', role
  )
  from public.staff_users
  where id = p_id
  limit 1;
$$;

-- Staff Dashboard events with full stats (Level 2 #10)
create or replace function public.rpc_get_dashboard_events()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'venue', e.venue,
        'starts_at', e.starts_at,
        'ends_at', e.ends_at,
        'capacity', e.capacity,
        'status', e.status,
        'created_at', e.created_at,
        'confirmed_count', coalesce(stats.confirmed_count, 0),
        'checked_in_count', coalesce(stats.checked_in_count, 0),
        'active_count', coalesce(stats.active_count, 0),
        'waitlisted_count', coalesce(stats.waitlisted_count, 0),
        'cancelled_count', coalesce(stats.cancelled_count, 0),
        'spots_left', greatest(0, e.capacity - coalesce(stats.active_count, 0)),
        'has_started', (e.starts_at <= now()),
        'is_ended', (e.ends_at < now()),
        'no_shows', case when e.starts_at <= now() then coalesce(stats.confirmed_count, 0) else null end
      )
      order by e.starts_at asc
    ),
    '[]'::jsonb
  )
  from public.events e
  left join lateral (
    select
      count(*) filter (where r.status = 'confirmed') as confirmed_count,
      count(*) filter (where r.status = 'checked_in') as checked_in_count,
      count(*) filter (where r.status in ('confirmed', 'checked_in')) as active_count,
      count(*) filter (where r.status = 'waitlisted') as waitlisted_count,
      count(*) filter (where r.status = 'cancelled') as cancelled_count
    from public.registrations r
    where r.event_id = e.id
  ) stats on true;
$$;

-- Event registrations list for staff (Level 1 #06 + Level 2)
create or replace function public.rpc_get_event_registrations(p_event_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      r.*,
      cb.name as checked_in_by_name,
      ub.name as undone_by_name,
      case
        when r.status = 'waitlisted' then
          row_number() over (partition by r.event_id, r.status order by r.registered_at asc, r.id asc)
        else null
      end as waitlist_position
    from public.registrations r
    left join public.staff_users cb on cb.id = r.checked_in_by
    left join public.staff_users ub on ub.id = r.undone_by
    where r.event_id = p_event_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'event_id', event_id,
        'full_name', full_name,
        'email', email,
        'mobile', mobile,
        'ticket_code', ticket_code,
        'status', status,
        'registered_at', registered_at,
        'checked_in_at', checked_in_at,
        'checked_in_by', checked_in_by,
        'checked_in_by_name', checked_in_by_name,
        'undone_at', undone_at,
        'undone_by', undone_by,
        'undone_by_name', undone_by_name,
        'cancelled_at', cancelled_at,
        'waitlist_position', waitlist_position
      )
      order by registered_at desc
    ),
    '[]'::jsonb
  )
  from ranked;
$$;

-- Atomic Check-in (Level 1 #05 + Level 3 #13 race-condition safe)
create or replace function public.rpc_checkin_ticket(
  p_event_id uuid,
  p_ticket_code text,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.registrations%rowtype;
  v_event public.events%rowtype;
  v_staff_name text;
  v_start_date date;
  v_end_date date;
  v_today date;
begin
  select name into v_staff_name from public.staff_users where id = p_staff_user_id;

  -- Lock the registration row so concurrent scans serialize atomically
  select * into v_reg
  from public.registrations
  where upper(ticket_code) = upper(trim(p_ticket_code))
    and event_id = p_event_id
  for update;

  if not found then
    return jsonb_build_object(
      'result', 'invalid',
      'message', 'Invalid ticket — code not found for this event.'
    );
  end if;

  if v_reg.status = 'waitlisted' then
    return jsonb_build_object(
      'result', 'waitlisted',
      'message', 'On waitlist — not confirmed',
      'attendee_name', v_reg.full_name,
      'ticket_code', v_reg.ticket_code
    );
  end if;

  if v_reg.status = 'cancelled' then
    return jsonb_build_object(
      'result', 'cancelled',
      'message', 'Cancelled',
      'attendee_name', v_reg.full_name,
      'ticket_code', v_reg.ticket_code
    );
  end if;

  if v_reg.status = 'checked_in' then
    return jsonb_build_object(
      'result', 'already_checked_in',
      'message', 'Already checked in',
      'attendee_name', v_reg.full_name,
      'ticket_code', v_reg.ticket_code,
      'checked_in_at', v_reg.checked_in_at
    );
  end if;

  -- Check event day in Asia/Manila (UTC+8)
  select * into v_event from public.events where id = p_event_id;
  v_start_date := (v_event.starts_at at time zone 'Asia/Manila')::date;
  v_end_date := (v_event.ends_at at time zone 'Asia/Manila')::date;
  v_today := (now() at time zone 'Asia/Manila')::date;

  if v_today < v_start_date or v_today > v_end_date then
    return jsonb_build_object(
      'result', 'wrong_day',
      'message', 'Check-in is only allowed on the event day (Cebu time).',
      'attendee_name', v_reg.full_name,
      'ticket_code', v_reg.ticket_code
    );
  end if;

  -- Perform atomic transition from confirmed -> checked_in
  update public.registrations
  set status = 'checked_in',
      checked_in_at = now(),
      checked_in_by = p_staff_user_id
  where id = v_reg.id
  returning * into v_reg;

  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  values (
    p_staff_user_id,
    coalesce(v_staff_name, 'Staff'),
    'check_in',
    v_reg.id::text,
    jsonb_build_object(
      'ticket_code', v_reg.ticket_code,
      'attendee_name', v_reg.full_name,
      'event_id', p_event_id,
      'event_title', v_event.title
    )
  );

  return jsonb_build_object(
    'result', 'checked_in',
    'message', 'Checked in',
    'attendee_name', v_reg.full_name,
    'ticket_code', v_reg.ticket_code,
    'checked_in_at', v_reg.checked_in_at
  );
end;
$$;

-- Undo Check-in (Level 2 #11)
create or replace function public.rpc_undo_checkin(
  p_registration_id uuid,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.registrations%rowtype;
  v_staff_name text;
begin
  select name into v_staff_name from public.staff_users where id = p_staff_user_id;

  select * into v_reg
  from public.registrations
  where id = p_registration_id
  for update;

  if not found then
    return jsonb_build_object('error', 'not_found', 'message', 'Registration not found.');
  end if;

  if v_reg.status <> 'checked_in' then
    return jsonb_build_object('error', 'not_checked_in', 'message', 'Only checked-in registrations can be undone.');
  end if;

  update public.registrations
  set status = 'confirmed',
      checked_in_at = null,
      checked_in_by = null,
      undone_at = now(),
      undone_by = p_staff_user_id
  where id = v_reg.id;

  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  values (
    p_staff_user_id,
    coalesce(v_staff_name, 'Staff'),
    'undo_check_in',
    v_reg.id::text,
    jsonb_build_object(
      'ticket_code', v_reg.ticket_code,
      'attendee_name', v_reg.full_name,
      'event_id', v_reg.event_id
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- Staff Cancel Registration (Level 2 #09)
create or replace function public.rpc_staff_cancel_registration(
  p_registration_id uuid,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.registrations%rowtype;
  v_staff_name text;
begin
  select name into v_staff_name from public.staff_users where id = p_staff_user_id;

  select * into v_reg
  from public.registrations
  where id = p_registration_id
  for update;

  if not found then
    return jsonb_build_object('error', 'not_found', 'message', 'Registration not found.');
  end if;

  if v_reg.status = 'checked_in' then
    return jsonb_build_object('error', 'checked_in', 'message', 'Checked-in registrations cannot be cancelled.');
  end if;

  if v_reg.status = 'cancelled' then
    return jsonb_build_object('error', 'already_cancelled', 'message', 'Already cancelled.');
  end if;

  update public.registrations
  set status = 'cancelled',
      cancelled_at = now()
  where id = v_reg.id;

  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  values (
    p_staff_user_id,
    coalesce(v_staff_name, 'Staff'),
    'registration_cancelled',
    v_reg.id::text,
    jsonb_build_object(
      'ticket_code', v_reg.ticket_code,
      'attendee_name', v_reg.full_name,
      'event_id', v_reg.event_id
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- Promote First Person on Waitlist (Level 2 #08)
create or replace function public.rpc_promote_waitlist(
  p_event_id uuid,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_active_count integer;
  v_reg public.registrations%rowtype;
  v_staff_name text;
begin
  select name into v_staff_name from public.staff_users where id = p_staff_user_id;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('error', 'event_not_found', 'message', 'Event not found.');
  end if;

  select count(*) into v_active_count
  from public.registrations
  where event_id = p_event_id
    and status in ('confirmed', 'checked_in');

  if v_active_count >= v_event.capacity then
    return jsonb_build_object('error', 'event_full', 'message', 'No open spot available. Increase capacity or cancel a registration first.');
  end if;

  select * into v_reg
  from public.registrations
  where event_id = p_event_id
    and status = 'waitlisted'
  order by registered_at asc, id asc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('error', 'no_waitlist', 'message', 'No attendees on the waitlist.');
  end if;

  update public.registrations
  set status = 'confirmed'
  where id = v_reg.id
  returning * into v_reg;

  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  values (
    p_staff_user_id,
    coalesce(v_staff_name, 'Staff'),
    'waitlist_promoted',
    v_reg.id::text,
    jsonb_build_object(
      'ticket_code', v_reg.ticket_code,
      'attendee_name', v_reg.full_name,
      'event_id', p_event_id,
      'event_title', v_event.title
    )
  );

  return jsonb_build_object(
    'ok', true,
    'registration', jsonb_build_object(
      'id', v_reg.id,
      'full_name', v_reg.full_name,
      'email', v_reg.email,
      'ticket_code', v_reg.ticket_code,
      'status', v_reg.status
    ),
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'venue', v_event.venue,
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at
    )
  );
end;
$$;

-- Create Event (Level 2 #07, Organizer only)
create or replace function public.rpc_create_event(
  p_title text,
  p_description text,
  p_venue text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_status text,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_staff_name text;
begin
  if p_ends_at <= p_starts_at then
    return jsonb_build_object('error', 'invalid_time', 'message', 'End time must be after start time.');
  end if;

  if p_capacity < 1 then
    return jsonb_build_object('error', 'invalid_capacity', 'message', 'Capacity must be at least 1.');
  end if;

  select name into v_staff_name from public.staff_users where id = p_staff_user_id;

  insert into public.events (title, description, venue, starts_at, ends_at, capacity, status)
  values (trim(p_title), coalesce(trim(p_description), ''), trim(p_venue), p_starts_at, p_ends_at, p_capacity, p_status)
  returning * into v_event;

  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  values (
    p_staff_user_id,
    coalesce(v_staff_name, 'Staff'),
    'event_created',
    v_event.id::text,
    jsonb_build_object('title', v_event.title, 'status', v_event.status, 'capacity', v_event.capacity)
  );

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_event));
end;
$$;

-- Update Event (Level 2 #07, Organizer only)
create or replace function public.rpc_update_event(
  p_event_id uuid,
  p_title text,
  p_description text,
  p_venue text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_status text,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_active_count integer;
  v_staff_name text;
begin
  if p_ends_at <= p_starts_at then
    return jsonb_build_object('error', 'invalid_time', 'message', 'End time must be after start time.');
  end if;

  if p_capacity < 1 then
    return jsonb_build_object('error', 'invalid_capacity', 'message', 'Capacity must be at least 1.');
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('error', 'event_not_found', 'message', 'Event not found.');
  end if;

  select count(*) into v_active_count
  from public.registrations
  where event_id = p_event_id
    and status in ('confirmed', 'checked_in');

  if p_capacity < v_active_count then
    return jsonb_build_object(
      'error', 'capacity_below_registered',
      'message', format('Capacity cannot be lower than the %s attendees already registered.', v_active_count)
    );
  end if;

  select name into v_staff_name from public.staff_users where id = p_staff_user_id;

  update public.events
  set title = trim(p_title),
      description = coalesce(trim(p_description), ''),
      venue = trim(p_venue),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      capacity = p_capacity,
      status = p_status,
      updated_at = now()
  where id = p_event_id
  returning * into v_event;

  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  values (
    p_staff_user_id,
    coalesce(v_staff_name, 'Staff'),
    'event_updated',
    v_event.id::text,
    jsonb_build_object('title', v_event.title, 'status', v_event.status, 'capacity', v_event.capacity)
  );

  return jsonb_build_object('ok', true, 'event', to_jsonb(v_event));
end;
$$;

-- Delete Closed Event (Organizer only)
create or replace function public.rpc_delete_closed_event(
  p_event_id uuid,
  p_staff_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_staff_name text;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('error', 'event_not_found', 'message', 'Event not found.');
  end if;

  -- Allow deleting explicitly closed events or published events whose end time has passed
  if not (v_event.status = 'closed' or (v_event.status = 'published' and v_event.ends_at <= now())) then
    return jsonb_build_object('error', 'not_closed', 'message', 'Only closed events can be deleted.');
  end if;

  select name into v_staff_name from public.staff_users where id = p_staff_user_id;

  insert into public.audit_logs (staff_user_id, staff_name, action, target_id, details)
  values (
    p_staff_user_id,
    coalesce(v_staff_name, 'Staff'),
    'event_deleted',
    v_event.id::text,
    jsonb_build_object('title', v_event.title, 'venue', v_event.venue)
  );

  delete from public.events where id = p_event_id;

  return jsonb_build_object('ok', true, 'title', v_event.title);
end;
$$;

-- Audit Logs (Level 3 #16)
create or replace function public.rpc_get_audit_logs(p_limit integer default 100)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'staff_user_id', a.staff_user_id,
        'staff_name', a.staff_name,
        'action', a.action,
        'target_id', a.target_id,
        'details', a.details,
        'created_at', a.created_at
      )
      order by a.created_at desc
    ),
    '[]'::jsonb
  )
  from (
    select * from public.audit_logs order by created_at desc limit p_limit
  ) a;
$$;
