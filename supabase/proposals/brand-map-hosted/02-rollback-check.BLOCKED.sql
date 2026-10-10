-- PREPARED / NOT EXECUTED. Browser-only sequential privacy test, with rollback.
-- Exact approved project: imvkhicfmidzbzsbhkzs. Main Venture Branding and Cotivate Development prohibited.
-- SQL cannot authenticate a dashboard project ref. Verify the visible URL independently.
-- The reviewed cluster/schema pins are additional checks, not substitutes for the URL check.
-- Default copy is BLOCKED. A later approved preflight must supply actual pins.
-- Audit identity counters can advance despite rollback; NEVER reset those sequences.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
set local idle_in_transaction_session_timeout='60s';
set local search_path=public,extensions;
do $vb_target_guard$
begin
  if false is not true then raise exception 'No execution approval/verified Test identity: prepared copy is blocked.'; end if;
  if current_database()<>'postgres' or current_user<>'postgres' then raise exception 'Expected hosted database/executor role unavailable: stop.'; end if;
  if (select system_identifier::text from pg_control_system()) is distinct from '__UNVERIFIED_TEST_IDENTITY__' then raise exception 'Wrong or changed database cluster: stop.'; end if;
  if (select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata) is distinct from '__UNVERIFIED_TEST_SCHEMA__' then raise exception 'Test schema changed after preflight: review required.'; end if;
  if (select coalesce(jsonb_agg(table_name||'.'||column_name),'[]'::jsonb) from (values ('auth.users','id'),
('auth.users','email'),
('public.vb_clients','id'),
('public.vb_clients','name'),
('public.vb_clients','client_type'),
('public.vb_clients','contact_name'),
('public.vb_clients','portal_enabled'),
('public.vb_clients','archived_at'),
('public.vb_clients','created_at'),
('public.vb_clients','updated_at'),
('public.vb_marks','id'),
('public.vb_marks','client_id'),
('public.vb_marks','name'),
('public.vb_marks','mark_type'),
('public.vb_marks','status'),
('public.vb_marks','uspto_status_text'),
('public.vb_marks','application_number'),
('public.vb_marks','registration_number'),
('public.vb_marks','record_owner'),
('public.vb_marks','source'),
('public.vb_marks','source_checked_at'),
('public.vb_marks','filing_date'),
('public.vb_marks','registration_date'),
('public.vb_marks','uspto_status_date'),
('public.vb_marks','created_at'),
('public.vb_marks','updated_at'),
('public.vb_marks','archived_at'),
('public.vb_service_preferences','client_id'),
('public.vb_service_preferences','service'),
('public.vb_bcm_settings','client_id'),
('public.vb_bcm_scans','client_id'),
('vb_private.staff_members','user_id'),
('vb_private.staff_members','active'),
('vb_private.client_memberships','client_id'),
('vb_private.client_memberships','user_id'),
('vb_private.client_memberships','active'),
('vb_private.audit_events','id'),
('vb_private.audit_events','client_id'),
('vb_private.audit_events','record_id'),
('vb_private.audit_events','table_name'),
('vb_private.audit_events','actor_id'),
('vb_private.audit_events','previous_data'),
('vb_private.audit_events','current_data')) required(table_name,column_name) where not exists(select 1 from pg_attribute where attrelid=to_regclass(required.table_name) and attname=required.column_name and attnum>0 and not attisdropped)) <> '[]'::jsonb or (select coalesce(jsonb_agg(signature),'[]'::jsonb) from (values ('auth.uid()'),('auth.jwt()'),('vb_private.is_staff()'),('vb_private.is_client_member(uuid)'),('vb_private.audit_record()')) required(signature) where to_regprocedure(signature) is null) <> '[]'::jsonb or (select coalesce(jsonb_agg(name),'[]'::jsonb) from (
  select n.nspname||'.'||c.relname name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private') and (c.relname like 'vb_brand_%' or c.relname='vb_marks_id_client_unique')
  union all select n.nspname||'.'||p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='vb_private' and p.proname like 'brand_map_%') or (n.nspname='public' and p.proname in ('vb_read_brand_map','vb_save_brand_asset','vb_set_brand_parent','vb_confirm_brand_relationship','vb_review_brand_legal_link'))
  union all select 'constraint:'||conname from pg_constraint where conrelid=to_regclass('public.vb_marks') and conname='vb_marks_id_client_unique'
) collisions) <> '[]'::jsonb then raise exception 'Missing dependencies or Brand Map object collisions: stop, do not replace existing objects.'; end if;
  if not exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgtap' and n.nspname='extensions') then raise exception 'Existing pgTAP extension required; no automatic installation.'; end if;
  if not coalesce((select bool_and(relrowsecurity) and count(*)=2 from pg_class where oid in (to_regclass('public.vb_clients'),to_regclass('public.vb_marks'))),false) then raise exception 'Base row security unavailable: stop.'; end if;
end;
$vb_target_guard$;

-- Transaction-local helper; exports counts/digests only, never original rows.
create function pg_temp.brand_map_preservation_snapshot() returns jsonb
language plpgsql set search_path='' as $vb_snapshot$
declare result jsonb := '{}'::jsonb; relation record; row_count bigint; row_digest text; bytes bigint;
begin
  for relation in select n.nspname,c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and ((n.nspname='public' and left(c.relname,3)='vb_') or n.nspname='vb_private' or (n.nspname='auth' and c.relname='users')) order by n.nspname,c.relname loop
    execute pg_catalog.format('select count(*),coalesce(sum(pg_catalog.octet_length(pg_catalog.to_jsonb(t)::text)),0) from %I.%I t',relation.nspname,relation.relname) into row_count,bytes;
    if row_count>10000 or bytes>16777216 then raise exception 'Preservation snapshot exceeds reviewed test limits.'; end if;
    execute pg_catalog.format('select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(coalesce(pg_catalog.string_agg(pg_catalog.to_jsonb(t)::text,E''\n'' order by pg_catalog.to_jsonb(t)::text),''''),''UTF8'')),''hex'') from %I.%I t',relation.nspname,relation.relname) into row_digest;
    result := result || pg_catalog.jsonb_build_object(relation.nspname||'.'||relation.relname,pg_catalog.jsonb_build_object('rows',row_count,'digest',row_digest));
  end loop;
  return result;
end;
$vb_snapshot$;

do $vb_hosted_run$
declare
  statements text[] := array[$vb_hosted_statement_0$alter table public.vb_marks add constraint vb_marks_id_client_unique unique (id, client_id);$vb_hosted_statement_0$,
$vb_hosted_statement_1$create table public.vb_brand_assets (
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
);$vb_hosted_statement_1$,
$vb_hosted_statement_2$create table public.vb_brand_relationships (
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
);$vb_hosted_statement_2$,
$vb_hosted_statement_3$create index vb_brand_relationship_parent_idx on public.vb_brand_relationships(client_id, parent_asset_id);$vb_hosted_statement_3$,
$vb_hosted_statement_4$create table public.vb_brand_legal_links (
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
);$vb_hosted_statement_4$,
$vb_hosted_statement_5$create index vb_brand_link_mark_idx on public.vb_brand_legal_links(client_id, mark_id);$vb_hosted_statement_5$,
$vb_hosted_statement_6$-- Server-owned provenance, slot identity and ownership cannot be reassigned.
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
$$;$vb_hosted_statement_6$,
$vb_hosted_statement_7$-- Every asset has an existing relationship and legal slot from its creation.
-- Locking these rows detects stale snapshots even at REPEATABLE READ.
create function vb_private.brand_map_initialize_slots() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.vb_brand_relationships(client_id,child_asset_id) values(new.client_id,new.id);
  insert into public.vb_brand_legal_links(client_id,asset_id) values(new.client_id,new.id);
  return new;
end;
$$;$vb_hosted_statement_7$,
$vb_hosted_statement_8$create trigger vb_brand_asset_touch before update on public.vb_brand_assets for each row execute function vb_private.brand_map_touch();$vb_hosted_statement_8$,
$vb_hosted_statement_9$create trigger vb_brand_relationship_touch before update on public.vb_brand_relationships for each row execute function vb_private.brand_map_touch();$vb_hosted_statement_9$,
$vb_hosted_statement_10$create trigger vb_brand_link_touch before update on public.vb_brand_legal_links for each row execute function vb_private.brand_map_touch();$vb_hosted_statement_10$,
$vb_hosted_statement_11$create trigger vb_brand_asset_slots after insert on public.vb_brand_assets for each row execute function vb_private.brand_map_initialize_slots();$vb_hosted_statement_11$,
$vb_hosted_statement_12$create trigger vb_brand_asset_audit after insert or update on public.vb_brand_assets for each row execute function vb_private.audit_record();$vb_hosted_statement_12$,
$vb_hosted_statement_13$create trigger vb_brand_relationship_audit after insert or update on public.vb_brand_relationships for each row execute function vb_private.audit_record();$vb_hosted_statement_13$,
$vb_hosted_statement_14$create trigger vb_brand_link_audit after insert or update on public.vb_brand_legal_links for each row execute function vb_private.audit_record();$vb_hosted_statement_14$,
$vb_hosted_statement_15$create function vb_private.brand_map_can_read(target_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.vb_clients c where c.id = target_client and c.archived_at is null)
    and (vb_private.is_staff() or vb_private.is_client_member(target_client));
$$;$vb_hosted_statement_15$,
$vb_hosted_statement_16$-- All writes acquire locks in this order: client, caller authorization, asset,
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
$$;$vb_hosted_statement_16$,
$vb_hosted_statement_17$create function vb_private.brand_map_mark_fingerprint(mark_row public.vb_marks) returns text
language sql immutable set search_path = '' as $$
  select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array((mark_row).client_id,(mark_row).name,(mark_row).mark_type,(mark_row).record_owner)::text, 'UTF8')), 'hex');
$$;$vb_hosted_statement_17$,
$vb_hosted_statement_18$create function public.vb_read_brand_map(target_client uuid) returns jsonb
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
$$;$vb_hosted_statement_18$,
$vb_hosted_statement_19$-- Complete business form, not a permissive arbitrary-property patch.
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
$$;$vb_hosted_statement_19$,
$vb_hosted_statement_20$create function public.vb_set_brand_parent(target_client uuid, target_child uuid, target_parent uuid, expected_version bigint) returns jsonb
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
$$;$vb_hosted_statement_20$,
$vb_hosted_statement_21$create function public.vb_confirm_brand_relationship(target_client uuid, target_child uuid, expected_version bigint) returns jsonb
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
$$;$vb_hosted_statement_21$,
$vb_hosted_statement_22$-- expected_asset_identity and expected_mark_identity bind staff review to what
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
$$;$vb_hosted_statement_22$,
$vb_hosted_statement_23$alter table public.vb_brand_assets enable row level security;$vb_hosted_statement_23$,
$vb_hosted_statement_24$alter table public.vb_brand_relationships enable row level security;$vb_hosted_statement_24$,
$vb_hosted_statement_25$alter table public.vb_brand_legal_links enable row level security;$vb_hosted_statement_25$,
$vb_hosted_statement_26$-- Defense in depth if SELECT grants are mistakenly added later. Raw SELECT is
-- currently denied; these policies do not authorize exposing actor columns.
create policy brand_assets_workspace_read on public.vb_brand_assets for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));$vb_hosted_statement_26$,
$vb_hosted_statement_27$create policy brand_relationship_workspace_read on public.vb_brand_relationships for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));$vb_hosted_statement_27$,
$vb_hosted_statement_28$create policy brand_link_workspace_read on public.vb_brand_legal_links for select to authenticated
using ((vb_private.is_staff() and exists(select 1 from public.vb_clients c where c.id=client_id and c.archived_at is null)) or vb_private.is_client_member(client_id));$vb_hosted_statement_28$,
$vb_hosted_statement_29$revoke all on public.vb_brand_assets, public.vb_brand_relationships, public.vb_brand_legal_links from public, anon, authenticated, service_role;$vb_hosted_statement_29$,
$vb_hosted_statement_30$revoke all on function vb_private.brand_map_touch(), vb_private.brand_map_initialize_slots(),
  vb_private.brand_map_can_read(uuid), vb_private.brand_map_lock_write(uuid,boolean),
  vb_private.brand_map_mark_fingerprint(public.vb_marks) from public, anon, authenticated, service_role;$vb_hosted_statement_30$,
$vb_hosted_statement_31$revoke all on function public.vb_read_brand_map(uuid), public.vb_save_brand_asset(uuid,uuid,bigint,jsonb),
  public.vb_set_brand_parent(uuid,uuid,uuid,bigint), public.vb_confirm_brand_relationship(uuid,uuid,bigint),
  public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb) from public, anon, authenticated, service_role;$vb_hosted_statement_31$,
$vb_hosted_statement_32$grant execute on function public.vb_read_brand_map(uuid), public.vb_save_brand_asset(uuid,uuid,bigint,jsonb),
  public.vb_set_brand_parent(uuid,uuid,uuid,bigint), public.vb_confirm_brand_relationship(uuid,uuid,bigint),
  public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb) to authenticated;$vb_hosted_statement_32$,
$vb_hosted_statement_33$set local search_path = public, extensions;$vb_hosted_statement_33$,
$vb_hosted_statement_34$select no_plan();$vb_hosted_statement_34$,
$vb_hosted_statement_35$create function pg_temp.fixture_id(kind integer, n integer) returns uuid
language sql immutable as $$ select ('03abbc4c-' || lpad(kind::text,4,'0') || '-4a0a-b800-' || lpad(n::text,12,'0'))::uuid $$;$vb_hosted_statement_35$,
$vb_hosted_statement_36$create function pg_temp.business_fields(asset_name text, use_state text default 'in_use') returns jsonb
language sql immutable as $$ select jsonb_build_object('name',asset_name,'kind','product','description','','business_use',use_state) $$;$vb_hosted_statement_36$,
$vb_hosted_statement_37$create function pg_temp.asset(n integer) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'assets') item
    where item->>'id' = pg_temp.fixture_id(3,n)::text
$$;$vb_hosted_statement_37$,
$vb_hosted_statement_38$create function pg_temp.link(n integer) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'legal_links') item
    where item->>'asset_id' = pg_temp.fixture_id(3,n)::text
$$;$vb_hosted_statement_38$,
$vb_hosted_statement_39$create function pg_temp.relationship(n integer) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'relationships') item
    where item->>'child_asset_id' = pg_temp.fixture_id(3,n)::text
$$;$vb_hosted_statement_39$,
$vb_hosted_statement_40$create function pg_temp.mark_identity(n integer) returns jsonb language sql as $$
  select jsonb_build_object('client_id',item->'client_id','name',item->'name','mark_type',item->'mark_type','record_owner',item->'record_owner')
    from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'marks') item
    where item->>'id' = pg_temp.fixture_id(4,n)::text
$$;$vb_hosted_statement_40$,
$vb_hosted_statement_41$create function pg_temp.claims(n integer, assurance text default 'aal1') returns text language sql as $$
  select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.fixture_id(2,n),'role','authenticated','aal',assurance)::text,true)
$$;$vb_hosted_statement_41$,
$vb_hosted_statement_42$do $$ declare temp_schema text; begin
  select nspname into temp_schema from pg_namespace where oid=pg_my_temp_schema();
  execute format('grant usage on schema %I to anon, authenticated',temp_schema);
  execute format('grant execute on function %I.fixture_id(integer,integer), %I.business_fields(text,text), %I.asset(integer), %I.link(integer), %I.relationship(integer), %I.mark_identity(integer), %I.claims(integer,text) to anon, authenticated',temp_schema,temp_schema,temp_schema,temp_schema,temp_schema,temp_schema,temp_schema);
end $$;$vb_hosted_statement_42$,
$vb_hosted_statement_43$insert into auth.users(id,email) select pg_temp.fixture_id(2,n),'brand-map-hosted-03abbc4c-' || n || '@example.invalid' from generate_series(1,4) n;$vb_hosted_statement_43$,
$vb_hosted_statement_44$insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled)
  select pg_temp.fixture_id(1,n),'Brand Map hosted rollback 03abbc4c client ' || n,'business','Test contact',true from generate_series(1,3) n;$vb_hosted_statement_44$,
$vb_hosted_statement_45$insert into vb_private.client_memberships(client_id,user_id) values
  (pg_temp.fixture_id(1,1),pg_temp.fixture_id(2,1)),
  (pg_temp.fixture_id(1,2),pg_temp.fixture_id(2,2)),
  (pg_temp.fixture_id(1,3),pg_temp.fixture_id(2,1)),
  (pg_temp.fixture_id(1,1),pg_temp.fixture_id(2,4));$vb_hosted_statement_45$,
$vb_hosted_statement_46$insert into vb_private.staff_members(user_id) values(pg_temp.fixture_id(2,3)),(pg_temp.fixture_id(2,4));$vb_hosted_statement_46$,
$vb_hosted_statement_47$insert into public.vb_brand_assets(id,client_id,name,kind,business_use,source_kind)
  select pg_temp.fixture_id(3,n),pg_temp.fixture_id(1,case when n=4 then 2 else 1 end),
    'Asset ' || n,'product','in_use','manual_client' from generate_series(1,4) n;$vb_hosted_statement_47$,
$vb_hosted_statement_48$insert into public.vb_marks(id,client_id,name,mark_type,status,record_owner) values
  (pg_temp.fixture_id(4,1),pg_temp.fixture_id(1,1),'INACTIVE TEST MARK','word','inactive','Test Owner'),
  (pg_temp.fixture_id(4,2),pg_temp.fixture_id(1,1),'SECOND TEST MARK','logo','pending','Test Owner'),
  (pg_temp.fixture_id(4,3),pg_temp.fixture_id(1,2),'PRIVATE B MARK','word','registered','Private B Owner');$vb_hosted_statement_48$,
$vb_hosted_statement_49$select ok((select bool_and(relrowsecurity) from pg_class where oid in
  ('public.vb_brand_assets'::regclass,'public.vb_brand_relationships'::regclass,'public.vb_brand_legal_links'::regclass)), 'RLS enabled on every new table');$vb_hosted_statement_49$,
$vb_hosted_statement_50$select ok(not has_table_privilege('authenticated',table_name,permission),table_name || ' denies direct ' || permission)
  from unnest(array['public.vb_brand_assets','public.vb_brand_relationships','public.vb_brand_legal_links']) table_name
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) permission;$vb_hosted_statement_50$,
$vb_hosted_statement_51$select is((select count(*) from public.vb_brand_relationships where client_id in (pg_temp.fixture_id(1,1),pg_temp.fixture_id(1,2),pg_temp.fixture_id(1,3))),4::bigint,'Every asset has a relationship slot');$vb_hosted_statement_51$,
$vb_hosted_statement_52$select is((select count(*) from public.vb_brand_legal_links where client_id in (pg_temp.fixture_id(1,1),pg_temp.fixture_id(1,2),pg_temp.fixture_id(1,3))),4::bigint,'Every asset has a legal slot');$vb_hosted_statement_52$,
$vb_hosted_statement_53$select ok(not has_function_privilege('anon',rpc,'EXECUTE'),'Anonymous execution denied for ' || rpc)
  from unnest(array['public.vb_read_brand_map(uuid)','public.vb_save_brand_asset(uuid,uuid,bigint,jsonb)',
    'public.vb_set_brand_parent(uuid,uuid,uuid,bigint)','public.vb_confirm_brand_relationship(uuid,uuid,bigint)',
    'public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb)']) rpc;$vb_hosted_statement_53$,
$vb_hosted_statement_54$set local role anon;$vb_hosted_statement_54$,
$vb_hosted_statement_55$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Anonymous read denied');$vb_hosted_statement_55$,
$vb_hosted_statement_56$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''No''))','42501',null,'Anonymous write denied');$vb_hosted_statement_56$,
$vb_hosted_statement_57$select throws_ok('select * from public.vb_brand_assets','42501',null,'Anonymous raw read denied');$vb_hosted_statement_57$,
$vb_hosted_statement_58$reset role;$vb_hosted_statement_58$,
$vb_hosted_statement_59$set local role authenticated;$vb_hosted_statement_59$,
$vb_hosted_statement_60$select pg_temp.claims(1);$vb_hosted_statement_60$,
$vb_hosted_statement_61$select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'assets')::integer,3,'Client A receives only its three assets');$vb_hosted_statement_61$,
$vb_hosted_statement_62$select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'legal_records')::integer,2,'Client A legal count excludes Client B');$vb_hosted_statement_62$,
$vb_hosted_statement_63$select is((public.vb_read_brand_map(pg_temp.fixture_id(1,3))->'counts'->>'assets')::integer,0,'Authorized empty map has zero assets');$vb_hosted_statement_63$,
$vb_hosted_statement_64$select is(public.vb_read_brand_map(pg_temp.fixture_id(1,3))->'marks','[]'::jsonb,'Authorized empty portfolio has no fabricated marks');$vb_hosted_statement_64$,
$vb_hosted_statement_65$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,2))','42501','Brand Map unavailable for this account.','Client A cannot read/count/search B');$vb_hosted_statement_65$,
$vb_hosted_statement_66$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,99))','42501','Brand Map unavailable for this account.','Missing workspace returns same denial');$vb_hosted_statement_66$,
$vb_hosted_statement_67$select throws_ok('select * from public.vb_brand_assets','42501',null,'Client cannot read raw asset table');$vb_hosted_statement_67$,
$vb_hosted_statement_68$select throws_ok('select * from public.vb_brand_relationships','42501',null,'Client cannot read raw confirmation actors');$vb_hosted_statement_68$,
$vb_hosted_statement_69$select throws_ok('select * from public.vb_brand_legal_links','42501',null,'Client cannot read raw legal reviewers/fingerprints');$vb_hosted_statement_69$,
$vb_hosted_statement_70$select throws_ok('update public.vb_brand_assets set name=''Forged''','42501',null,'Direct update denied');$vb_hosted_statement_70$,
$vb_hosted_statement_71$select throws_ok('delete from public.vb_brand_assets','42501',null,'Permanent deletion denied');$vb_hosted_statement_71$,
$vb_hosted_statement_72$select throws_ok('select vb_private.brand_map_lock_write(pg_temp.fixture_id(1,1))','42501',null,'Private privileged helper not callable');$vb_hosted_statement_72$,
$vb_hosted_statement_73$select is((select count(*) from vb_private.audit_events),0::bigint,'Client sees no protected audit history');$vb_hosted_statement_73$,
$vb_hosted_statement_74$select ok(public.vb_read_brand_map(pg_temp.fixture_id(1,1))::text !~ 'confirmed_by"|reviewed_by"|reviewed_mark_fingerprint|previous_data|current_data','Response excludes actor IDs, fingerprint, and history');$vb_hosted_statement_74$,
$vb_hosted_statement_75$select throws_ok(format('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,%L::jsonb)',
  (pg_temp.business_fields('Spoof') || jsonb_build_object(field,'forged'))::text),
  '22023','Invalid Brand Map business fields.','Asset form rejects forged ' || field)
  from unnest(array['client_id','mark_id','asset_id','source_reference','source_kind','actor_id','confirmed_by','state','reviewed_by','version','identity_revision']) field;$vb_hosted_statement_75$,
$vb_hosted_statement_76$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,''[]''::jsonb)','22023',null,'Array payload rejected');$vb_hosted_statement_76$,
$vb_hosted_statement_77$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,''{"name":"Partial"}''::jsonb)','22023',null,'Incomplete form rejected');$vb_hosted_statement_77$,
$vb_hosted_statement_78$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''   ''))','22023',null,'Blank name rejected');$vb_hosted_statement_78$,
$vb_hosted_statement_79$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(repeat(''x'',201)))','22023',null,'Overlong name rejected');$vb_hosted_statement_79$,
$vb_hosted_statement_80$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Long'') || jsonb_build_object(''description'',repeat(''x'',2001)))','22023',null,'Overlong description rejected');$vb_hosted_statement_80$,
$vb_hosted_statement_81$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Wrong'') || ''{"kind":null}''::jsonb)','22023',null,'Null enum rejected');$vb_hosted_statement_81$,
$vb_hosted_statement_82$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,4),1,pg_temp.business_fields(''B overwrite''))','42501','Brand Map unavailable for this account.','Client A cannot edit B asset');$vb_hosted_statement_82$,
$vb_hosted_statement_83$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,2),null,null,pg_temp.business_fields(''B create''))','42501','Brand Map unavailable for this account.','Client A cannot create inside B');$vb_hosted_statement_83$,
$vb_hosted_statement_84$select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''<script>alert(1)</script>''))','Script-like name stored as text, not executed by SQL');$vb_hosted_statement_84$,
$vb_hosted_statement_85$select ok(exists(select 1 from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'assets') a
  where a->>'name'='<script>alert(1)</script>' and a->>'source_kind'='manual_client' and (a->>'version')::integer=1),'Created asset has authentic source and initial version');$vb_hosted_statement_85$,
$vb_hosted_statement_86$select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),1,pg_temp.business_fields(''Asset 1'',''inactive''))','Business-use edit succeeds');$vb_hosted_statement_86$,
$vb_hosted_statement_87$select is((pg_temp.asset(1)->>'version')::integer,2,'Every save advances version');$vb_hosted_statement_87$,
$vb_hosted_statement_88$select is((pg_temp.asset(1)->>'identity_revision')::integer,1,'Business use alone preserves identity');$vb_hosted_statement_88$,
$vb_hosted_statement_89$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),1,pg_temp.business_fields(''Lost edit''))','40001',null,'Stale expected version denied');$vb_hosted_statement_89$,
$vb_hosted_statement_90$select is(pg_temp.asset(1)->>'name','Asset 1','Stale save cannot overwrite name');$vb_hosted_statement_90$,
$vb_hosted_statement_91$select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),2,pg_temp.business_fields(''Renamed asset''))','Identity edit succeeds');$vb_hosted_statement_91$,
$vb_hosted_statement_92$select is((pg_temp.asset(1)->>'identity_revision')::integer,2,'Identity revision advances on name change');$vb_hosted_statement_92$,
$vb_hosted_statement_93$select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,4),1)','42501','Brand Map unavailable for this account.','Foreign parent denied');$vb_hosted_statement_93$,
$vb_hosted_statement_94$select throws_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,4),1)','42501','Brand Map unavailable for this account.','Foreign confirmation denied');$vb_hosted_statement_94$,
$vb_hosted_statement_95$select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,1),1)','22023',null,'Self-parent denied');$vb_hosted_statement_95$,
$vb_hosted_statement_96$select throws_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),1)','22023',null,'Root cannot be confirmed as an edge');$vb_hosted_statement_96$,
$vb_hosted_statement_97$select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,2),1)','First parent creates proposed edge');$vb_hosted_statement_97$,
$vb_hosted_statement_98$select is(pg_temp.relationship(1)->>'state','proposed','New edge is proposed');$vb_hosted_statement_98$,
$vb_hosted_statement_99$select lives_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),2)','Exact current edge can be confirmed');$vb_hosted_statement_99$,
$vb_hosted_statement_100$select is(pg_temp.relationship(1)->>'confirmed_by_role','client','Business confirmation has client label');$vb_hosted_statement_100$,
$vb_hosted_statement_101$select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,3),3)','Parent change succeeds');$vb_hosted_statement_101$,
$vb_hosted_statement_102$select is(pg_temp.relationship(1)->>'state','proposed','Parent change resets confirmation');$vb_hosted_statement_102$,
$vb_hosted_statement_103$select is(pg_temp.relationship(1)->'confirmed_at','null'::jsonb,'Old confirmation absent from current edge');$vb_hosted_statement_103$,
$vb_hosted_statement_104$select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,4)','Parent can be cleared');$vb_hosted_statement_104$,
$vb_hosted_statement_105$select is(pg_temp.relationship(1)->'state','null'::jsonb,'Cleared edge has no confirmation state');$vb_hosted_statement_105$,
$vb_hosted_statement_106$select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,2),5)','First edge of longer chain');$vb_hosted_statement_106$,
$vb_hosted_statement_107$select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,2),pg_temp.fixture_id(3,3),1)','Second edge of longer chain');$vb_hosted_statement_107$,
$vb_hosted_statement_108$select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,3),pg_temp.fixture_id(3,1),1)','22023',null,'Three-node proposed cycle denied');$vb_hosted_statement_108$,
$vb_hosted_statement_109$select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,5)','40001',null,'Stale parent edit denied');$vb_hosted_statement_109$,
$vb_hosted_statement_110$select throws_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),5)','40001',null,'Stale confirmation denied');$vb_hosted_statement_110$,
$vb_hosted_statement_111$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,pg_temp.mark_identity(1))','42501','Brand Map unavailable for this account.','Client cannot review legal links');$vb_hosted_statement_111$,
$vb_hosted_statement_112$select pg_temp.claims(3);$vb_hosted_statement_112$,
$vb_hosted_statement_113$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Staff without MFA cannot read map');$vb_hosted_statement_113$,
$vb_hosted_statement_114$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,null)','42501',null,'Staff without MFA cannot review link');$vb_hosted_statement_114$,
$vb_hosted_statement_115$select pg_temp.claims(4);$vb_hosted_statement_115$,
$vb_hosted_statement_116$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Dual membership cannot bypass staff MFA');$vb_hosted_statement_116$,
$vb_hosted_statement_117$select pg_temp.claims(3,'aal2');$vb_hosted_statement_117$,
$vb_hosted_statement_118$select lives_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,2))','MFA staff can read other authorized workspace');$vb_hosted_statement_118$,
$vb_hosted_statement_119$select throws_ok('select * from public.vb_brand_legal_links','42501',null,'MFA staff also uses projected reads');$vb_hosted_statement_119$,
$vb_hosted_statement_120$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,3),1,2,null)','42501','Brand Map unavailable for this account.','Staff cannot create cross-client legal link');$vb_hosted_statement_120$,
$vb_hosted_statement_121$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,4),pg_temp.fixture_id(4,1),1,1,null)','42501',null,'Staff cannot mismatch asset workspace');$vb_hosted_statement_121$,
$vb_hosted_statement_122$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,1,pg_temp.mark_identity(1))','40001',null,'Stale asset identity cannot be approved');$vb_hosted_statement_122$,
$vb_hosted_statement_123$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,pg_temp.mark_identity(1) || ''{"name":"Old name"}''::jsonb)','40001',null,'Stale mark identity cannot be approved');$vb_hosted_statement_123$,
$vb_hosted_statement_124$select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,pg_temp.mark_identity(1))','Inactive legal record may be associated without inventing protection');$vb_hosted_statement_124$,
$vb_hosted_statement_125$select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,2),pg_temp.fixture_id(4,1),1,1,pg_temp.mark_identity(1))','Second asset can reference same mark');$vb_hosted_statement_125$,
$vb_hosted_statement_126$select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'linked_legal_records')::integer,1,'Repeated links count one distinct mark');$vb_hosted_statement_126$,
$vb_hosted_statement_127$select is(pg_temp.link(1)->>'linked_record_status','inactive','Linked inactive record status stays factual');$vb_hosted_statement_127$,
$vb_hosted_statement_128$select is(pg_temp.link(1)->>'review_state','current','Link review separate from inactive legal status');$vb_hosted_statement_128$,
$vb_hosted_statement_129$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,1,2,null)','40001',null,'Stale legal-link edit denied');$vb_hosted_statement_129$,
$vb_hosted_statement_130$select pg_temp.claims(1);$vb_hosted_statement_130$,
$vb_hosted_statement_131$select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),3,pg_temp.business_fields(''Renamed asset'',''inactive''))','Business inactivity save allowed');$vb_hosted_statement_131$,
$vb_hosted_statement_132$select is(pg_temp.link(1)->>'review_state','current','Business inactivity does not invalidate legal identity');$vb_hosted_statement_132$,
$vb_hosted_statement_133$select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),4,pg_temp.business_fields(''Renamed asset'',''inactive'') || ''{"description":"Changed identity"}''::jsonb)','Substantive description edit allowed');$vb_hosted_statement_133$,
$vb_hosted_statement_134$select is(pg_temp.link(1)->>'review_state','needs_attorney_review','Substantive asset change invalidates old review');$vb_hosted_statement_134$,
$vb_hosted_statement_135$select is(pg_temp.link(1)->>'linked_record_status','inactive','Identity change preserves factual legal status');$vb_hosted_statement_135$,
$vb_hosted_statement_136$select pg_temp.claims(3,'aal2');$vb_hosted_statement_136$,
$vb_hosted_statement_137$select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),2,3,pg_temp.mark_identity(1))','Staff can reconfirm current identity');$vb_hosted_statement_137$,
$vb_hosted_statement_138$reset role;$vb_hosted_statement_138$,
$vb_hosted_statement_139$update public.vb_marks set status='pending',uspto_status_text='Synthetic status update' where id=pg_temp.fixture_id(4,1);$vb_hosted_statement_139$,
$vb_hosted_statement_140$set local role authenticated;$vb_hosted_statement_140$,
$vb_hosted_statement_141$select pg_temp.claims(1);$vb_hosted_statement_141$,
$vb_hosted_statement_142$select is(pg_temp.link(1)->>'review_state','current','Status update alone does not invalidate identity review');$vb_hosted_statement_142$,
$vb_hosted_statement_143$select is(pg_temp.link(1)->>'linked_record_status','pending','Linked status reflects latest legal facts');$vb_hosted_statement_143$,
$vb_hosted_statement_144$reset role;$vb_hosted_statement_144$,
$vb_hosted_statement_145$update public.vb_marks set record_owner='Changed owner' where id=pg_temp.fixture_id(4,1);$vb_hosted_statement_145$,
$vb_hosted_statement_146$set local role authenticated;$vb_hosted_statement_146$,
$vb_hosted_statement_147$select pg_temp.claims(1);$vb_hosted_statement_147$,
$vb_hosted_statement_148$select is(pg_temp.link(1)->>'review_state','needs_attorney_review','Legal owner identity change requires review');$vb_hosted_statement_148$,
$vb_hosted_statement_149$select is(pg_temp.link(2)->>'review_state','needs_attorney_review','All associations detect changed mark identity');$vb_hosted_statement_149$,
$vb_hosted_statement_150$reset role;$vb_hosted_statement_150$,
$vb_hosted_statement_151$update public.vb_marks set archived_at=now() where id=pg_temp.fixture_id(4,1);$vb_hosted_statement_151$,
$vb_hosted_statement_152$set local role authenticated;$vb_hosted_statement_152$,
$vb_hosted_statement_153$select pg_temp.claims(3,'aal2');$vb_hosted_statement_153$,
$vb_hosted_statement_154$select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),3,3,null)','42501',null,'Archived mark unavailable for a new/reconfirmed link');$vb_hosted_statement_154$,
$vb_hosted_statement_155$select is(pg_temp.link(1)->'linked_record_available','false'::jsonb,'Archived linked record flagged unavailable');$vb_hosted_statement_155$,
$vb_hosted_statement_156$select is(pg_temp.link(1)->'linked_record_status','null'::jsonb,'Archived record facts withheld');$vb_hosted_statement_156$,
$vb_hosted_statement_157$select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'linked_legal_records')::integer,0,'Archived mark excluded from visible linked count');$vb_hosted_statement_157$,
$vb_hosted_statement_158$select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,3,3,null)','Current legal link can be cleared');$vb_hosted_statement_158$,
$vb_hosted_statement_159$select is(pg_temp.link(1)->>'review_state','not_linked','Clearing association gives accurate unlinked state');$vb_hosted_statement_159$,
$vb_hosted_statement_160$reset role;$vb_hosted_statement_160$,
$vb_hosted_statement_161$select is((select count(*) from public.vb_marks where id=pg_temp.fixture_id(4,1)),1::bigint,'Clearing link does not delete mark');$vb_hosted_statement_161$,
$vb_hosted_statement_162$select ok(exists(select 1 from vb_private.audit_events where table_name='vb_brand_relationships'
  and current_data->>'child_asset_id'=pg_temp.fixture_id(3,1)::text and current_data->>'state'='confirmed'
  and actor_id=pg_temp.fixture_id(2,1)),'Protected history retains actual relationship confirmer');$vb_hosted_statement_162$,
$vb_hosted_statement_163$select ok(exists(select 1 from vb_private.audit_events where table_name='vb_brand_legal_links'
  and previous_data->>'mark_id'=pg_temp.fixture_id(4,1)::text and current_data->>'mark_id' is null
  and actor_id=pg_temp.fixture_id(2,3)),'Protected history retains cleared link and authentic reviewer');$vb_hosted_statement_163$,
$vb_hosted_statement_164$select throws_ok('update public.vb_brand_assets set client_id=pg_temp.fixture_id(1,2) where id=pg_temp.fixture_id(3,1)','23514',null,'Asset ownership immutable even in privileged updates');$vb_hosted_statement_164$,
$vb_hosted_statement_165$select throws_ok('update public.vb_brand_assets set source_kind=''manual_staff'' where id=pg_temp.fixture_id(3,1)','23514',null,'Original source immutable');$vb_hosted_statement_165$,
$vb_hosted_statement_166$select throws_ok('update public.vb_brand_relationships set parent_asset_id=pg_temp.fixture_id(3,4) where child_asset_id=pg_temp.fixture_id(3,1)','23503',null,'Composite foreign key rejects cross-client edge');$vb_hosted_statement_166$,
$vb_hosted_statement_167$select throws_ok('update public.vb_brand_legal_links set mark_id=pg_temp.fixture_id(4,3) where asset_id=pg_temp.fixture_id(3,2)','23503',null,'Composite foreign key rejects cross-client legal association');$vb_hosted_statement_167$,
$vb_hosted_statement_168$update vb_private.client_memberships set active=false where client_id=pg_temp.fixture_id(1,1) and user_id=pg_temp.fixture_id(2,1);$vb_hosted_statement_168$,
$vb_hosted_statement_169$set local role authenticated;$vb_hosted_statement_169$,
$vb_hosted_statement_170$select pg_temp.claims(1);$vb_hosted_statement_170$,
$vb_hosted_statement_171$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Revoked membership denies read');$vb_hosted_statement_171$,
$vb_hosted_statement_172$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Revoked''))','42501',null,'Revoked membership denies write');$vb_hosted_statement_172$,
$vb_hosted_statement_173$reset role;$vb_hosted_statement_173$,
$vb_hosted_statement_174$update vb_private.client_memberships set active=true where client_id=pg_temp.fixture_id(1,1) and user_id=pg_temp.fixture_id(2,1);$vb_hosted_statement_174$,
$vb_hosted_statement_175$update public.vb_clients set portal_enabled=false where id=pg_temp.fixture_id(1,1);$vb_hosted_statement_175$,
$vb_hosted_statement_176$set local role authenticated;$vb_hosted_statement_176$,
$vb_hosted_statement_177$select pg_temp.claims(1);$vb_hosted_statement_177$,
$vb_hosted_statement_178$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Disabled portal denies client read');$vb_hosted_statement_178$,
$vb_hosted_statement_179$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Disabled''))','42501',null,'Disabled portal denies client write');$vb_hosted_statement_179$,
$vb_hosted_statement_180$select pg_temp.claims(3,'aal2');$vb_hosted_statement_180$,
$vb_hosted_statement_181$select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Staff preparation''))','MFA staff can prepare active client with portal disabled');$vb_hosted_statement_181$,
$vb_hosted_statement_182$select ok(exists(select 1 from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'assets') a
  where a->>'name'='Staff preparation' and a->>'source_kind'='manual_staff'),'Staff source is server assigned');$vb_hosted_statement_182$,
$vb_hosted_statement_183$reset role;$vb_hosted_statement_183$,
$vb_hosted_statement_184$update public.vb_clients set archived_at=now() where id=pg_temp.fixture_id(1,1);$vb_hosted_statement_184$,
$vb_hosted_statement_185$set local role authenticated;$vb_hosted_statement_185$,
$vb_hosted_statement_186$select pg_temp.claims(3,'aal2');$vb_hosted_statement_186$,
$vb_hosted_statement_187$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Archived client unavailable to map read');$vb_hosted_statement_187$,
$vb_hosted_statement_188$select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Archived''))','42501',null,'Archived client rejects staff writes');$vb_hosted_statement_188$,
$vb_hosted_statement_189$reset role;$vb_hosted_statement_189$,
$vb_hosted_statement_190$update vb_private.staff_members set active=false where user_id=pg_temp.fixture_id(2,3);$vb_hosted_statement_190$,
$vb_hosted_statement_191$set local role authenticated;$vb_hosted_statement_191$,
$vb_hosted_statement_192$select pg_temp.claims(3,'aal2');$vb_hosted_statement_192$,
$vb_hosted_statement_193$select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,2))','42501',null,'Deactivated staff loses access despite MFA claim');$vb_hosted_statement_193$,
$vb_hosted_statement_194$select pg_temp.claims(2);$vb_hosted_statement_194$,
$vb_hosted_statement_195$select is((public.vb_read_brand_map(pg_temp.fixture_id(1,2))->'counts'->>'assets')::integer,1,'Client B remains isolated and untouched');$vb_hosted_statement_195$,
$vb_hosted_statement_196$select is((public.vb_read_brand_map(pg_temp.fixture_id(1,2))->'marks'->0->>'name'),'PRIVATE B MARK','B mark remains unchanged');$vb_hosted_statement_196$,
$vb_hosted_statement_197$reset role;$vb_hosted_statement_197$,
$vb_hosted_statement_198$select * from finish(true);$vb_hosted_statement_198$];
  capture boolean[] := array[false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true,true,true,false,true,true,true,false,false,false,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,false,true,true,false,true,false,true,true,true,true,true,true,true,true,true,true,true,true,false,true,true,true,true,true,false,true,false,false,false,false,true,true,false,false,false,false,true,true,false,false,false,false,true,true,true,true,true,true,false,true,true,true,true,true,true,true,false,false,false,true,true,false,false,false,false,false,true,true,false,true,true,false,false,false,false,true,true,false,false,false,false,true,false,true,true,false,true];
  before_rows jsonb; after_rows jsonb; before_schema text; after_schema text; before_prerequisites jsonb; after_prerequisites jsonb;
  tap text[] := array[]::text[]; result_line text; line text; plans integer:=0; planned integer:=0; assertions integer:=0; i integer;
begin
  before_rows := pg_temp.brand_map_preservation_snapshot();
  before_schema := (select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata);
  before_prerequisites := (select jsonb_build_object('missing_columns',(select coalesce(jsonb_agg(table_name||'.'||column_name),'[]'::jsonb) from (values ('auth.users','id'),
('auth.users','email'),
('public.vb_clients','id'),
('public.vb_clients','name'),
('public.vb_clients','client_type'),
('public.vb_clients','contact_name'),
('public.vb_clients','portal_enabled'),
('public.vb_clients','archived_at'),
('public.vb_clients','created_at'),
('public.vb_clients','updated_at'),
('public.vb_marks','id'),
('public.vb_marks','client_id'),
('public.vb_marks','name'),
('public.vb_marks','mark_type'),
('public.vb_marks','status'),
('public.vb_marks','uspto_status_text'),
('public.vb_marks','application_number'),
('public.vb_marks','registration_number'),
('public.vb_marks','record_owner'),
('public.vb_marks','source'),
('public.vb_marks','source_checked_at'),
('public.vb_marks','filing_date'),
('public.vb_marks','registration_date'),
('public.vb_marks','uspto_status_date'),
('public.vb_marks','created_at'),
('public.vb_marks','updated_at'),
('public.vb_marks','archived_at'),
('public.vb_service_preferences','client_id'),
('public.vb_service_preferences','service'),
('public.vb_bcm_settings','client_id'),
('public.vb_bcm_scans','client_id'),
('vb_private.staff_members','user_id'),
('vb_private.staff_members','active'),
('vb_private.client_memberships','client_id'),
('vb_private.client_memberships','user_id'),
('vb_private.client_memberships','active'),
('vb_private.audit_events','id'),
('vb_private.audit_events','client_id'),
('vb_private.audit_events','record_id'),
('vb_private.audit_events','table_name'),
('vb_private.audit_events','actor_id'),
('vb_private.audit_events','previous_data'),
('vb_private.audit_events','current_data')) required(table_name,column_name) where not exists(select 1 from pg_attribute where attrelid=to_regclass(required.table_name) and attname=required.column_name and attnum>0 and not attisdropped)),'extensions',(select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e)));
  -- Catch only our success sentinel. Variables survive the inner rollback;
  -- assertion errors, permission errors and unknown errors propagate as failures.
  begin
    for i in 1..cardinality(statements) loop
      if capture[i] then
        for result_line in execute statements[i] loop
          foreach line in array string_to_array(result_line,E'
') loop tap := array_append(tap,line); end loop;
        end loop;
      else execute statements[i]; end if;
    end loop;
    foreach line in array tap loop
      if line ~ '^not ok' or line ~ '^Bail out!' then raise exception 'Database assertion failed: no passing report.'; end if;
      if line ~ '^1\.\.[0-9]+$' then plans:=plans+1; planned:=substring(line from 4)::integer;
      elsif line ~ '^ok [0-9]+( |$)' then
        assertions:=assertions+1;
        if (regexp_match(line,'^ok ([0-9]+)'))[1]::integer<>assertions then raise exception 'Incomplete or out-of-order assertion results.'; end if;
      end if;
    end loop;
    if plans<>1 or planned<1 or planned<>assertions then raise exception 'Incomplete pgTAP plan: no passing report.'; end if;
    raise exception using errcode='VB001', message='Brand Map success rollback sentinel';
  exception when sqlstate 'VB001' then
    if sqlerrm<>'Brand Map success rollback sentinel' then raise; end if;
  end;
  execute 'reset role';
  after_rows := pg_temp.brand_map_preservation_snapshot();
  after_schema := (select encode(sha256(convert_to(coalesce(jsonb_agg(item order by item::text),'[]'::jsonb)::text,'UTF8')),'hex') from (
  select jsonb_build_object('relation',n.nspname||'.'||c.relname,'oid',c.oid,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',c.relowner) item
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('column',a.attrelid,'n',a.attnum,'name',a.attname,'type',a.atttypid,'mod',a.atttypmod,'null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid))
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname in ('public','vb_private') and a.attnum>0 and not a.attisdropped
  union all select jsonb_build_object('function',p.oid,'name',n.nspname||'.'||p.proname,'args',p.proargtypes::text,'result',p.prorettype,'source_hash',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'owner',p.proowner)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('constraint',x.oid,'definition',pg_get_constraintdef(x.oid)) from pg_constraint x join pg_namespace n on n.oid=x.connamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('trigger',t.oid,'definition',pg_get_triggerdef(t.oid)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','vb_private')
  union all select jsonb_build_object('policy',to_jsonb(p)) from pg_policies p where p.schemaname in ('public','vb_private')
  union all select jsonb_build_object('namespace',n.nspname,'acl',n.nspacl,'owner',n.nspowner) from pg_namespace n where n.nspname in ('public','vb_private')
) metadata);
  after_prerequisites := (select jsonb_build_object('missing_columns',(select coalesce(jsonb_agg(table_name||'.'||column_name),'[]'::jsonb) from (values ('auth.users','id'),
('auth.users','email'),
('public.vb_clients','id'),
('public.vb_clients','name'),
('public.vb_clients','client_type'),
('public.vb_clients','contact_name'),
('public.vb_clients','portal_enabled'),
('public.vb_clients','archived_at'),
('public.vb_clients','created_at'),
('public.vb_clients','updated_at'),
('public.vb_marks','id'),
('public.vb_marks','client_id'),
('public.vb_marks','name'),
('public.vb_marks','mark_type'),
('public.vb_marks','status'),
('public.vb_marks','uspto_status_text'),
('public.vb_marks','application_number'),
('public.vb_marks','registration_number'),
('public.vb_marks','record_owner'),
('public.vb_marks','source'),
('public.vb_marks','source_checked_at'),
('public.vb_marks','filing_date'),
('public.vb_marks','registration_date'),
('public.vb_marks','uspto_status_date'),
('public.vb_marks','created_at'),
('public.vb_marks','updated_at'),
('public.vb_marks','archived_at'),
('public.vb_service_preferences','client_id'),
('public.vb_service_preferences','service'),
('public.vb_bcm_settings','client_id'),
('public.vb_bcm_scans','client_id'),
('vb_private.staff_members','user_id'),
('vb_private.staff_members','active'),
('vb_private.client_memberships','client_id'),
('vb_private.client_memberships','user_id'),
('vb_private.client_memberships','active'),
('vb_private.audit_events','id'),
('vb_private.audit_events','client_id'),
('vb_private.audit_events','record_id'),
('vb_private.audit_events','table_name'),
('vb_private.audit_events','actor_id'),
('vb_private.audit_events','previous_data'),
('vb_private.audit_events','current_data')) required(table_name,column_name) where not exists(select 1 from pg_attribute where attrelid=to_regclass(required.table_name) and attname=required.column_name and attnum>0 and not attisdropped)),'extensions',(select coalesce(jsonb_agg(to_jsonb(e) order by e.extname),'[]'::jsonb) from pg_extension e)));
  if before_prerequisites is distinct from after_prerequisites then raise exception 'Temporary prerequisite state not restored after rollback.'; end if;
  if before_rows is distinct from after_rows or before_schema is distinct from after_schema then raise exception 'Existing Test records or schema differ after rollback: preservation NOT verified.'; end if;
  perform set_config('vb_brand_map.hosted_report',jsonb_build_object(
    'status','PASS','assertions',assertions,'tap',to_jsonb(tap),'project_expected','imvkhicfmidzbzsbhkzs',
    'fixture_namespace','03abbc4c-be77-4a0a-b800-e84a5c167a99','synthetic_data_rolled_back',true,'draft_schema_rolled_back',true,
    'existing_rows_and_rules_preserved',true,'prerequisite_state_restored',true,'temporary_prerequisites_used',false,'audit_sequence_gaps_possible',true,
    'concurrency_scenarios_run',0,'sign_in_api_checks_run',0)::text,true);
end;
$vb_hosted_run$;
select current_setting('vb_brand_map.hosted_report')::jsonb as brand_map_rollback_results;
rollback;
