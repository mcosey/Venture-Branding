-- DRAFT / UNAPPLIED. Kept outside migrations deliberately.
-- Requires the existing Venture Branding migrations, including USPTO dates.
-- Apply only to a separately approved disposable test database first.
begin;
do $$ begin
  if current_database() <> 'venture_brand_map_test'
    or current_setting('vb_brand_map.test_approved',true) is distinct from 'local-disposable' then
    raise exception 'Unapplied draft: an explicitly approved disposable Brand Map test database is required.';
  end if;
end $$;

alter table public.vb_marks add constraint vb_marks_id_client_unique unique (id, client_id);

create table public.vb_brand_assets (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  client_id uuid not null references public.vb_clients(id),
  name text not null check (name = btrim(name) and length(name) between 1 and 200),
  kind text not null check (kind in ('master_brand','product','feature','service','sub_brand','logo','slogan','website','not_specified')),
  description text not null default '' check (length(description) <= 2000),
  business_use text not null check (business_use in ('planned','in_use','inactive','not_specified')),
  version bigint not null default 1 check (version > 0),
  identity_revision bigint not null default 1 check (identity_revision > 0),
  source_kind text not null check (source_kind in ('manual_client','manual_staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);

create table public.vb_brand_relationships (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  client_id uuid not null references public.vb_clients(id),
  child_asset_id uuid not null unique,
  parent_asset_id uuid,
  state text check (state in ('proposed','confirmed')),
  version bigint not null default 1 check (version > 0),
  confirmed_by uuid,
  confirmed_by_role text check (confirmed_by_role in ('client','staff')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (child_asset_id, client_id) references public.vb_brand_assets(id, client_id),
  foreign key (parent_asset_id, client_id) references public.vb_brand_assets(id, client_id),
  check (parent_asset_id is distinct from child_asset_id),
  check ((parent_asset_id is null and state is null) or
         (parent_asset_id is not null and state is not null)),
  check ((state = 'confirmed' and confirmed_by is not null and confirmed_by_role is not null and confirmed_at is not null) or
         (state is distinct from 'confirmed' and confirmed_by is null and confirmed_by_role is null and confirmed_at is null))
);
create index vb_brand_relationship_parent_idx on public.vb_brand_relationships(client_id, parent_asset_id);

create table public.vb_brand_legal_links (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  client_id uuid not null references public.vb_clients(id),
  asset_id uuid not null unique,
  mark_id uuid,
  version bigint not null default 1 check (version > 0),
  reviewed_asset_identity_revision bigint,
  reviewed_mark_fingerprint text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (asset_id, client_id) references public.vb_brand_assets(id, client_id),
  foreign key (mark_id, client_id) references public.vb_marks(id, client_id),
  check ((mark_id is null and reviewed_asset_identity_revision is null and reviewed_mark_fingerprint is null and reviewed_by is null and reviewed_at is null) or
         (mark_id is not null and reviewed_asset_identity_revision is not null and reviewed_asset_identity_revision > 0 and reviewed_mark_fingerprint is not null and reviewed_by is not null and reviewed_at is not null))
);
create index vb_brand_link_mark_idx on public.vb_brand_legal_links(client_id, mark_id);

-- Server-owned provenance, slot identity and ownership cannot be reassigned.
create function vb_private.brand_map_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.client_id is distinct from old.client_id or new.created_at is distinct from old.created_at then
    raise exception 'Brand Map record identity is immutable' using errcode = '23514';
  end if;
  if tg_table_name = 'vb_brand_assets' then
    if new.source_kind is distinct from old.source_kind then
      raise exception 'Brand Map source is immutable' using errcode = '23514';
    end if;
    new.identity_revision := old.identity_revision + case
      when row(new.name,new.kind,btrim(new.description)) is distinct from row(old.name,old.kind,btrim(old.description)) then 1 else 0 end;
  elsif tg_table_name = 'vb_brand_relationships' then
    if new.child_asset_id is distinct from old.child_asset_id then
      raise exception 'Brand Map slot is immutable' using errcode = '23514';
    end if;
  elsif new.asset_id is distinct from old.asset_id then
    raise exception 'Brand Map slot is immutable' using errcode = '23514';
  end if;
  new.version := old.version + 1;
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

-- Every asset has an existing relationship and legal slot from its creation.
-- Locking these rows detects stale snapshots even at REPEATABLE READ.
create function vb_private.brand_map_initialize_slots() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.vb_brand_relationships(client_id,child_asset_id) values(new.client_id,new.id);
  insert into public.vb_brand_legal_links(client_id,asset_id) values(new.client_id,new.id);
  return new;
end;
$$;

create trigger vb_brand_asset_touch before update on public.vb_brand_assets for each row execute function vb_private.brand_map_touch();
create trigger vb_brand_relationship_touch before update on public.vb_brand_relationships for each row execute function vb_private.brand_map_touch();
create trigger vb_brand_link_touch before update on public.vb_brand_legal_links for each row execute function vb_private.brand_map_touch();
create trigger vb_brand_asset_slots after insert on public.vb_brand_assets for each row execute function vb_private.brand_map_initialize_slots();
create trigger vb_brand_asset_audit after insert or update on public.vb_brand_assets for each row execute function vb_private.audit_record();
create trigger vb_brand_relationship_audit after insert or update on public.vb_brand_relationships for each row execute function vb_private.audit_record();
create trigger vb_brand_link_audit after insert or update on public.vb_brand_legal_links for each row execute function vb_private.audit_record();

create function vb_private.brand_map_can_read(target_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.vb_clients c where c.id = target_client and c.archived_at is null)
    and (vb_private.is_staff() or vb_private.is_client_member(target_client));
$$;

-- All writes acquire locks in this order: client, caller authorization, asset,
-- current slot, ancestor slots or mark. Hold permission locks until commit.
create function vb_private.brand_map_lock_write(target_client uuid, staff_only boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); portal_is_enabled boolean; active_role boolean;
begin
  if caller is null then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select c.portal_enabled into portal_is_enabled from public.vb_clients c
    where c.id = target_client and c.archived_at is null for update;
  if not found then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select s.active into active_role from vb_private.staff_members s where s.user_id = caller for share;
  if found then
    if active_role and vb_private.is_staff() then return 'staff'; end if;
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  if staff_only or not portal_is_enabled then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select m.active into active_role from vb_private.client_memberships m
    where m.client_id = target_client and m.user_id = caller for share;
  if not found or not active_role or not vb_private.is_client_member(target_client) then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  return 'client';
end;
$$;

create function vb_private.brand_map_mark_fingerprint(mark_row public.vb_marks) returns text
language sql immutable set search_path = '' as $$
  select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array((mark_row).client_id,(mark_row).name,(mark_row).mark_type,(mark_row).record_owner)::text, 'UTF8')), 'hex');
$$;

create function public.vb_read_brand_map(target_client uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not vb_private.brand_map_can_read(target_client) then
    raise exception 'Brand Map unavailable for this account.' using errcode = '42501';
  end if;
  select pg_catalog.jsonb_build_object(
    'client_id', target_client,
    'assets', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',a.id,'client_id',a.client_id,'name',a.name,'kind',a.kind,'description',a.description,
      'business_use',a.business_use,'version',a.version,'identity_revision',a.identity_revision,
      'source_kind',a.source_kind,'created_at',a.created_at,'updated_at',a.updated_at) order by a.created_at,a.id)
      from public.vb_brand_assets a where a.client_id = target_client), '[]'::jsonb),
    'relationships', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',r.id,'child_asset_id',r.child_asset_id,'parent_asset_id',r.parent_asset_id,
      'state',r.state,'version',r.version,'confirmed_by_role',r.confirmed_by_role,'confirmed_at',r.confirmed_at)
      order by r.child_asset_id) from public.vb_brand_relationships r where r.client_id = target_client), '[]'::jsonb),
    'legal_links', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',l.id,'asset_id',l.asset_id,'mark_id',l.mark_id,'version',l.version,'reviewed_at',l.reviewed_at,
      'reviewed_by_role',case when l.mark_id is not null then 'staff' else null end,
      'review_state',case when l.mark_id is null then 'not_linked'
        when m.id is null or m.archived_at is not null or l.reviewed_asset_identity_revision <> a.identity_revision
          or l.reviewed_mark_fingerprint is distinct from vb_private.brand_map_mark_fingerprint(m)
          then 'needs_attorney_review' else 'current' end,
      'linked_record_available',m.id is not null and m.archived_at is null,
      'linked_record_status',case when m.archived_at is null then m.status else null end)
      order by l.asset_id) from public.vb_brand_legal_links l
      join public.vb_brand_assets a on a.id = l.asset_id and a.client_id = l.client_id
      left join public.vb_marks m on m.id = l.mark_id and m.client_id = l.client_id
      where l.client_id = target_client), '[]'::jsonb),
    'marks', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',m.id,'client_id',m.client_id,'name',m.name,'mark_type',m.mark_type,'status',m.status,
      'uspto_status_text',m.uspto_status_text,'application_number',m.application_number,
      'registration_number',m.registration_number,'record_owner',m.record_owner,'source',m.source,
      'source_checked_at',m.source_checked_at,'filing_date',m.filing_date,
      'registration_date',m.registration_date,'uspto_status_date',m.uspto_status_date,'updated_at',m.updated_at)
      order by m.created_at,m.id) from public.vb_marks m where m.client_id = target_client and m.archived_at is null), '[]'::jsonb),
    'counts', pg_catalog.jsonb_build_object(
      'assets',(select count(*) from public.vb_brand_assets a where a.client_id = target_client),
      'legal_records',(select count(*) from public.vb_marks m where m.client_id = target_client and m.archived_at is null),
      'linked_legal_records',(select count(distinct l.mark_id) from public.vb_brand_legal_links l
        join public.vb_marks m on m.id = l.mark_id and m.client_id = l.client_id
        where l.client_id = target_client and m.archived_at is null))) into result;
  return result;
end;
$$;

-- Complete business form, not a permissive arbitrary-property patch.
-- Creation uses target_asset NULL and expected_version NULL.
create function public.vb_save_brand_asset(target_client uuid, target_asset uuid, expected_version bigint, details jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor_role text; saved public.vb_brand_assets; old_asset public.vb_brand_assets;
begin
  actor_role := vb_private.brand_map_lock_write(target_client);
  if details is null or pg_catalog.jsonb_typeof(details) is distinct from 'object' then
    raise exception 'Invalid Brand Map business fields.' using errcode = '22023';
  end if;
  if exists(select 1 from pg_catalog.jsonb_object_keys(details) k
      where k not in ('name','kind','description','business_use'))
    or not (details ?& array['name','kind','description','business_use'])
    or exists(select 1 from pg_catalog.jsonb_each(details) p where pg_catalog.jsonb_typeof(p.value) <> 'string')
    or length(btrim(details->>'name')) not between 1 and 200
    or length(details->>'description') > 2000
    or details->>'kind' not in ('master_brand','product','feature','service','sub_brand','logo','slogan','website','not_specified')
    or details->>'business_use' not in ('planned','in_use','inactive','not_specified') then
    raise exception 'Invalid Brand Map business fields.' using errcode = '22023';
  end if;
  if target_asset is null then
    if expected_version is not null then raise exception 'Invalid Brand Map version.' using errcode = '22023'; end if;
    insert into public.vb_brand_assets(client_id,name,kind,description,business_use,source_kind)
      values(target_client,btrim(details->>'name'),details->>'kind',btrim(details->>'description'),details->>'business_use','manual_' || actor_role)
      returning * into saved;
  else
    select * into old_asset from public.vb_brand_assets a where a.id = target_asset and a.client_id = target_client for update;
    if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
    if expected_version is null or old_asset.version <> expected_version then
      raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
    end if;
    update public.vb_brand_assets set name=btrim(details->>'name'),kind=details->>'kind',
      description=btrim(details->>'description'),business_use=details->>'business_use'
      where id=target_asset and client_id=target_client returning * into saved;
  end if;
  return pg_catalog.jsonb_build_object('id',saved.id,'version',saved.version,'identity_revision',saved.identity_revision);
end;
$$;

create function public.vb_set_brand_parent(target_client uuid, target_child uuid, target_parent uuid, expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare slot public.vb_brand_relationships; cursor_id uuid := target_parent; next_id uuid; visited uuid[] := array[]::uuid[];
begin
  perform vb_private.brand_map_lock_write(target_client);
  perform 1 from public.vb_brand_assets a where a.id = target_child and a.client_id = target_client for update;
  if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  if target_parent is not null then
    perform 1 from public.vb_brand_assets a where a.id = target_parent and a.client_id = target_client for update;
    if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  end if;
  select * into slot from public.vb_brand_relationships r where r.child_asset_id=target_child and r.client_id=target_client for update;
  if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
  if expected_version is null or slot.version <> expected_version then
    raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
  end if;
  while cursor_id is not null loop
    if cursor_id = target_child or cursor_id = any(visited) then
      raise exception 'A Brand Map relationship cannot form a cycle.' using errcode = '22023';
    end if;
    visited := pg_catalog.array_append(visited,cursor_id);
    select r.parent_asset_id into next_id from public.vb_brand_relationships r
      where r.child_asset_id=cursor_id and r.client_id=target_client for update;
    if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
    cursor_id := next_id;
  end loop;
  update public.vb_brand_relationships set parent_asset_id=target_parent,
    state=case when target_parent is null then null else 'proposed' end,
    confirmed_by=null,confirmed_by_role=null,confirmed_at=null
    where id=slot.id returning * into slot;
  return pg_catalog.jsonb_build_object('id',slot.id,'version',slot.version,'state',slot.state);
end;
$$;

create function public.vb_confirm_brand_relationship(target_client uuid, target_child uuid, expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor_role text; slot public.vb_brand_relationships;
begin
  actor_role := vb_private.brand_map_lock_write(target_client);
  perform 1 from public.vb_brand_assets a where a.id=target_child and a.client_id=target_client for update;
  if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  select * into slot from public.vb_brand_relationships r where r.child_asset_id=target_child and r.client_id=target_client for update;
  if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
  if expected_version is null or slot.version <> expected_version then
    raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
  end if;
  if slot.parent_asset_id is null then raise exception 'Choose a parent before confirming.' using errcode = '22023'; end if;
  update public.vb_brand_relationships set state='confirmed',confirmed_by=auth.uid(),
    confirmed_by_role=actor_role,confirmed_at=pg_catalog.clock_timestamp() where id=slot.id returning * into slot;
  return pg_catalog.jsonb_build_object('id',slot.id,'version',slot.version,'state',slot.state);
end;
$$;

-- expected_asset_identity and expected_mark_identity bind staff review to what
-- the staff member actually viewed. NULL mark + NULL fingerprint clears a link.
-- Fingerprint input is the four permitted identity fields, not a browser hash.
create function public.vb_review_brand_legal_link(target_client uuid, target_asset uuid, target_mark uuid,
  expected_version bigint, expected_asset_identity bigint, expected_mark_identity jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare asset public.vb_brand_assets; mark_row public.vb_marks; slot public.vb_brand_legal_links; identity_fields jsonb;
begin
  perform vb_private.brand_map_lock_write(target_client,true);
  select * into asset from public.vb_brand_assets a where a.id=target_asset and a.client_id=target_client for update;
  if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
  select * into slot from public.vb_brand_legal_links l where l.asset_id=target_asset and l.client_id=target_client for update;
  if not found then raise exception 'Brand Map slot unavailable.' using errcode = '23514'; end if;
  if expected_version is null or slot.version <> expected_version or expected_asset_identity is null or asset.identity_revision <> expected_asset_identity then
    raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
  end if;
  if target_mark is not null then
    select * into mark_row from public.vb_marks m where m.id=target_mark and m.client_id=target_client and m.archived_at is null for update;
    if not found then raise exception 'Brand Map unavailable for this account.' using errcode = '42501'; end if;
    identity_fields := pg_catalog.jsonb_build_object('client_id',mark_row.client_id,'name',mark_row.name,'mark_type',mark_row.mark_type,'record_owner',mark_row.record_owner);
    if expected_mark_identity is null or expected_mark_identity is distinct from identity_fields then
      raise exception 'Brand Map changed. Reload and review your edit.' using errcode = '40001';
    end if;
  elsif expected_mark_identity is not null then
    raise exception 'Invalid Brand Map legal-link fields.' using errcode = '22023';
  end if;
  update public.vb_brand_legal_links set mark_id=target_mark,
    reviewed_asset_identity_revision=case when target_mark is not null then asset.identity_revision end,
    reviewed_mark_fingerprint=case when target_mark is not null then vb_private.brand_map_mark_fingerprint(mark_row) end,
    reviewed_by=case when target_mark is not null then auth.uid() end,
    reviewed_at=case when target_mark is not null then pg_catalog.clock_timestamp() end
    where id=slot.id returning * into slot;
  return pg_catalog.jsonb_build_object('id',slot.id,'version',slot.version);
end;
$$;

alter table public.vb_brand_assets enable row level security;
alter table public.vb_brand_relationships enable row level security;
alter table public.vb_brand_legal_links enable row level security;
-- Defense in depth if SELECT grants are mistakenly added later. Raw SELECT is
-- currently denied; these policies do not authorize exposing actor columns.
create policy brand_assets_workspace_read on public.vb_brand_assets for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));
create policy brand_relationship_workspace_read on public.vb_brand_relationships for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));
create policy brand_link_workspace_read on public.vb_brand_legal_links for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));
revoke all on public.vb_brand_assets, public.vb_brand_relationships, public.vb_brand_legal_links from public, anon, authenticated, service_role;
revoke all on function vb_private.brand_map_touch(), vb_private.brand_map_initialize_slots(),
  vb_private.brand_map_can_read(uuid), vb_private.brand_map_lock_write(uuid,boolean),
  vb_private.brand_map_mark_fingerprint(public.vb_marks) from public, anon, authenticated, service_role;
revoke all on function public.vb_read_brand_map(uuid), public.vb_save_brand_asset(uuid,uuid,bigint,jsonb),
  public.vb_set_brand_parent(uuid,uuid,uuid,bigint), public.vb_confirm_brand_relationship(uuid,uuid,bigint),
  public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.vb_read_brand_map(uuid), public.vb_save_brand_asset(uuid,uuid,bigint,jsonb),
  public.vb_set_brand_parent(uuid,uuid,uuid,bigint), public.vb_confirm_brand_relationship(uuid,uuid,bigint),
  public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb) to authenticated;

commit;
