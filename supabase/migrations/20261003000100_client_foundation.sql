-- VB foundation. Apply to a dedicated Supabase development project only.
-- No accounts, invitations, secrets, real records or scheduled jobs are created.
begin;

create schema if not exists vb_private;
revoke all on schema vb_private from public, anon, authenticated;
grant usage on schema vb_private to authenticated, service_role;

-- Provisioned by a trusted administrator/backend only, never browser metadata.
create table vb_private.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.vb_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  client_type text not null check (client_type in ('individual', 'business')),
  contact_name text not null check (length(btrim(contact_name)) between 1 and 200),
  contact_email text,
  portal_enabled boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vb_private.client_memberships (
  client_id uuid not null references public.vb_clients(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);
create index vb_memberships_user_idx on vb_private.client_memberships(user_id, client_id) where active;

-- Kept separate so internal references are never exposed to client users.
create table public.vb_client_references (
  client_id uuid primary key references public.vb_clients(id),
  clio_contact_reference text,
  clio_matter_reference text,
  quickbooks_customer_reference text,
  updated_at timestamptz not null default now()
);

create table public.vb_marks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.vb_clients(id),
  name text not null check (length(btrim(name)) between 1 and 200),
  mark_type text check (mark_type in ('word', 'logo', 'other')),
  status text check (status in ('not_filed', 'pending', 'registered', 'inactive', 'other')),
  uspto_status_text text,
  application_number text,
  registration_number text,
  record_owner text,
  source text not null default 'manual' check (source in ('manual', 'uspto')),
  source_checked_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source <> 'uspto' or
    (source_checked_at is not null and
     (nullif(btrim(application_number), '') is not null or nullif(btrim(registration_number), '') is not null)))
);
create index vb_marks_client_idx on public.vb_marks(client_id);

-- These are preferences, not evidence of running jobs or authority to create deadlines.
-- Portal add-on includes all five services; false is a conservative initial preference.
create table public.vb_service_preferences (
  client_id uuid not null references public.vb_clients(id),
  service text not null check (service in ('trademark_watch','brand_change_monitor','specimen_capture','maintenance_reminder','activity_digest')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (client_id, service)
);

create table vb_private.audit_events (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.vb_clients(id),
  record_id uuid not null,
  table_name text not null,
  operation text not null check (operation in ('INSERT','UPDATE')),
  actor_id uuid,
  occurred_at timestamptz not null default now(),
  previous_data jsonb,
  current_data jsonb not null
);
create index vb_audit_client_idx on vb_private.audit_events(client_id, occurred_at);

create function vb_private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt()->>'aal', '') = 'aal2'
    and exists(select 1 from vb_private.staff_members s where s.user_id = auth.uid() and s.active);
$$;

create function vb_private.is_client_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from vb_private.client_memberships m
    join public.vb_clients c on c.id = m.client_id
    where m.client_id = target and m.user_id = auth.uid() and m.active
      and c.portal_enabled and c.archived_at is null
  )
  -- Staff must use MFA even if someone also assigned a client membership.
  and not exists(select 1 from vb_private.staff_members s where s.user_id = auth.uid());
$$;

create function vb_private.touch_record() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_table_name in ('vb_clients', 'vb_marks') then
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'Record identity is immutable' using errcode = '23514';
    end if;
  end if;
  if tg_table_name <> 'vb_clients' then
    if new.client_id is distinct from old.client_id then
      raise exception 'Client ownership is immutable' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create function vb_private.audit_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare payload jsonb := to_jsonb(new);
begin
  insert into vb_private.audit_events(client_id,record_id,table_name,operation,actor_id,previous_data,current_data)
  values (
    case when tg_table_name = 'vb_clients' then (payload->>'id')::uuid else (payload->>'client_id')::uuid end,
    coalesce((payload->>'id')::uuid,(payload->>'client_id')::uuid),
    tg_table_name,tg_op,auth.uid(),case when tg_op = 'UPDATE' then to_jsonb(old) else null end,payload
  );
  return new;
end;
$$;

create function vb_private.initialize_preferences() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.vb_service_preferences(client_id,service)
  select new.id, service from unnest(array['trademark_watch','brand_change_monitor','specimen_capture','maintenance_reminder','activity_digest']) as service;
  return new;
end;
$$;

-- RLS everywhere, including protected membership/audit tables. No browser writes
-- to authorization records; later invitation provisioning must be server-only.
alter table vb_private.staff_members enable row level security;
alter table vb_private.client_memberships enable row level security;
alter table vb_private.audit_events enable row level security;
alter table public.vb_clients enable row level security;
alter table public.vb_client_references enable row level security;
alter table public.vb_marks enable row level security;
alter table public.vb_service_preferences enable row level security;

create policy clients_read on public.vb_clients for select to authenticated
using ((select vb_private.is_staff()) or vb_private.is_client_member(id));
create policy clients_create on public.vb_clients for insert to authenticated
with check ((select vb_private.is_staff()));
create policy clients_edit on public.vb_clients for update to authenticated
using ((select vb_private.is_staff())) with check ((select vb_private.is_staff()));
create policy references_staff on public.vb_client_references for all to authenticated
using ((select vb_private.is_staff())) with check ((select vb_private.is_staff()));
create policy marks_read on public.vb_marks for select to authenticated
using ((select vb_private.is_staff()) or (archived_at is null and vb_private.is_client_member(client_id)));
create policy marks_create on public.vb_marks for insert to authenticated
with check ((select vb_private.is_staff()) and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null));
create policy marks_edit on public.vb_marks for update to authenticated
using ((select vb_private.is_staff())) with check ((select vb_private.is_staff()));
create policy preferences_read on public.vb_service_preferences for select to authenticated
using ((select vb_private.is_staff()) or vb_private.is_client_member(client_id));
create policy preferences_edit on public.vb_service_preferences for update to authenticated
using (vb_private.is_client_member(client_id)) with check (vb_private.is_client_member(client_id));
create policy audit_staff_read on vb_private.audit_events for select to authenticated
using ((select vb_private.is_staff()));

-- Explicit grants override any broad default privileges inherited from Supabase.
revoke all on public.vb_clients, public.vb_client_references, public.vb_marks, public.vb_service_preferences
from public, anon, authenticated;
revoke all on vb_private.staff_members, vb_private.client_memberships, vb_private.audit_events
from public, anon, authenticated;
grant select, insert, update on public.vb_clients, public.vb_client_references, public.vb_marks to authenticated;
grant select on public.vb_service_preferences to authenticated;
grant update(enabled) on public.vb_service_preferences to authenticated;
grant select on vb_private.audit_events to authenticated;
grant all on public.vb_clients, public.vb_client_references, public.vb_marks, public.vb_service_preferences,
  vb_private.staff_members, vb_private.client_memberships, vb_private.audit_events to service_role;
revoke all on sequence vb_private.audit_events_id_seq from public, anon, authenticated;
grant usage, select on sequence vb_private.audit_events_id_seq to service_role;
revoke execute on all functions in schema vb_private from public, anon, authenticated;
grant execute on function vb_private.is_staff(), vb_private.is_client_member(uuid) to authenticated, service_role;

create trigger vb_client_touch before update on public.vb_clients for each row execute function vb_private.touch_record();
create trigger vb_mark_touch before update on public.vb_marks for each row execute function vb_private.touch_record();
create trigger vb_references_touch before update on public.vb_client_references for each row execute function vb_private.touch_record();
create trigger vb_preferences_touch before update on public.vb_service_preferences for each row execute function vb_private.touch_record();
create trigger vb_client_audit after insert or update on public.vb_clients for each row execute function vb_private.audit_record();
create trigger vb_mark_audit after insert or update on public.vb_marks for each row execute function vb_private.audit_record();
create trigger vb_references_audit after insert or update on public.vb_client_references for each row execute function vb_private.audit_record();
create trigger vb_preferences_audit after insert or update on public.vb_service_preferences for each row execute function vb_private.audit_record();
create trigger vb_client_preferences after insert on public.vb_clients for each row execute function vb_private.initialize_preferences();

commit;
