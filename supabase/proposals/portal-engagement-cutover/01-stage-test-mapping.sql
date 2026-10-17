-- Approved fictional Test mapping only. Does not cut over legacy authorization.
-- One-shot migration: do not rerun after successful application.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'Wrong Test database'; end if;
 if (select md5(coalesce(jsonb_agg(c order by id)::text,'')) from public.vb_clients c) <> '910249c562ca27860858146771e2fa6d'
 or (select md5(coalesce(jsonb_agg(m order by client_id,user_id)::text,'')) from vb_private.client_memberships m) <> 'fa3747007aff32f9e9f7558cff515963'
 then raise exception 'Legacy records changed: review mapping first'; end if;
 if exists(select 1 from public.vb_engagements) then raise exception 'Engagements already exist: review before mapping'; end if;
 if exists(select 1 from vb_private.client_memberships m join vb_private.staff_members s using(user_id))
 or exists(select 1 from vb_private.client_memberships m join vb_private.portal_accounts a using(user_id) where m.active and a.status<>'active')
 or exists(select 1 from vb_private.client_memberships m join auth.users u on u.id=m.user_id where m.active and u.email_confirmed_at is null)
 then raise exception 'Membership is not eligible for this approved mapping'; end if;
end $$;
create temporary table mapping_input(client_id uuid primary key,engagement_id uuid unique,matter_id uuid unique,expected_name text) on commit drop;
insert into mapping_input values
('7126efcc-9034-4cfc-964f-c2694d315526'::uuid,'f1700000-0000-0000-0000-000000000001'::uuid,'f1710000-0000-0000-0000-000000000001'::uuid,'WATCH TEST — Fictional Match Client'),
('b8566912-9e75-45c0-a85c-a7e2a3075f85'::uuid,'f1700000-0000-0000-0000-000000000002'::uuid,'f1710000-0000-0000-0000-000000000002'::uuid,'WATCH TEST — Fictional Isolation Client'),
('b9100000-0000-0000-0000-000000000001'::uuid,'f1700000-0000-0000-0000-000000000003'::uuid,'f1710000-0000-0000-0000-000000000003'::uuid,'Cotivate — FICTIONAL FILING TEST'),
('b9100000-0000-0000-0000-000000000002'::uuid,'f1700000-0000-0000-0000-000000000004'::uuid,'f1710000-0000-0000-0000-000000000004'::uuid,'Mithril Zeppelin — FICTIONAL FILING TEST');
do $$ begin
 if (select count(*) from mapping_input i join public.vb_clients c on c.id=i.client_id and c.name=i.expected_name and c.portal_enabled and c.archived_at is null)<>4
 or (select count(*) from vb_private.client_memberships where active)<>4
 then raise exception 'Expected four approved fictional relationships'; end if;
end $$;
-- Snapshot every original client-scoped table, Member data and legacy entry points.
-- No source-row contents are persisted in the mapping, only primary keys and hashes.
create temporary table mapping_preservation(resource text primary key,fingerprint text) on commit drop;
do $$ declare r text; fingerprint text; begin
 foreach r in array array['public.vb_bcm_ai_observations','public.vb_bcm_ai_publications','public.vb_bcm_ai_reviews','public.vb_bcm_ai_runs','public.vb_bcm_scans','public.vb_bcm_schedules','public.vb_bcm_settings','public.vb_client_references','public.vb_digest_preferences','public.vb_evidence','public.vb_filing_drafts','public.vb_inbox','public.vb_maintenance_publications','public.vb_marks','public.vb_service_preferences','vb_private.maintenance_drafts','vb_private.watch_findings','vb_private.watch_runs','vb_private.watch_settings','public.vb_clients','vb_private.client_memberships','public.vb_member_profiles','public.vb_member_companies','public.vb_member_progress','vb_private.portal_acceptances','vb_private.portal_test_onboarding'] loop
  execute format($hash$select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'')) from %s t$hash$,r::regclass) into fingerprint;
  insert into mapping_preservation values(r,fingerprint);
 end loop;
 insert into mapping_preservation values('legacy-functions',(select md5(string_agg(pg_get_functiondef(p.oid),'' order by p.oid)) from pg_proc p where p.oid in ('public.vb_session_role()'::regprocedure,'public.vb_portal_entry()'::regprocedure,'vb_private.is_client_member(uuid)'::regprocedure)));
end $$;

alter table public.vb_engagements add constraint vb_engagement_client_pair unique(id,client_id);
alter table public.vb_matters add constraint vb_matter_engagement_pair unique(id,engagement_id);
create table vb_private.legacy_test_mappings (
 client_id uuid primary key references public.vb_clients(id),
 engagement_id uuid not null unique,
 matter_id uuid not null unique,
 label text not null check(label='Fictional Test mapping — October 16, 2026'),
 enforcement_enabled boolean not null default false check(enforcement_enabled=false),
 mapped_at timestamptz not null default now(),
 unique(client_id,engagement_id,matter_id),
 foreign key(engagement_id,client_id) references public.vb_engagements(id,client_id),
 foreign key(matter_id,engagement_id) references public.vb_matters(id,engagement_id)
);
-- Preparatory scope inventory. Not an access policy or an automatically maintained ledger.
-- New rows created after this snapshot require explicit mapping during final cutover.
create table vb_private.legacy_test_record_scopes (
 resource text not null check(resource in ('public.vb_bcm_ai_observations','public.vb_bcm_ai_publications','public.vb_bcm_ai_reviews','public.vb_bcm_ai_runs','public.vb_bcm_scans','public.vb_bcm_schedules','public.vb_bcm_settings','public.vb_client_references','public.vb_digest_preferences','public.vb_evidence','public.vb_filing_drafts','public.vb_inbox','public.vb_maintenance_publications','public.vb_marks','public.vb_service_preferences','vb_private.maintenance_drafts','vb_private.watch_findings','vb_private.watch_runs','vb_private.watch_settings')),
 record_key jsonb not null check(jsonb_typeof(record_key)='object' and record_key<>'{}'::jsonb),
 client_id uuid not null,
 engagement_id uuid not null,
 matter_id uuid not null,
 source_fingerprint text not null check(source_fingerprint ~ '^[0-9a-f]{32}$'),
 primary key(resource,record_key),
 foreign key(client_id,engagement_id,matter_id) references vb_private.legacy_test_mappings(client_id,engagement_id,matter_id)
);
alter table vb_private.legacy_test_mappings enable row level security;
alter table vb_private.legacy_test_record_scopes enable row level security;
revoke all on vb_private.legacy_test_mappings,vb_private.legacy_test_record_scopes from public,anon,authenticated;

-- Use protected existing user IDs only. No Auth user, Member company or policy acceptance is created.
insert into vb_private.portal_accounts(user_id)
 select distinct m.user_id from vb_private.client_memberships m join mapping_input i using(client_id) where m.active
 on conflict(user_id) do nothing;
insert into public.vb_engagements(id,client_id,title,status,activated_at)
 select engagement_id,client_id,'FICTIONAL TEST — existing portal dry run','active',now() from mapping_input;
insert into public.vb_matters(id,engagement_id,title)
 select matter_id,engagement_id,'FICTIONAL TEST — existing records' from mapping_input;
-- This records the authorized migration of existing Test relationships, not a new invitation,
-- agreement signing event, policy acceptance, or real-world representation start date.
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at)
 select i.engagement_id,m.user_id,'active',now() from mapping_input i join vb_private.client_memberships m using(client_id) where m.active;
-- Existing portal tool entitlements; this never enables a preference, job, scheduler or paid research.
insert into vb_private.engagement_services(engagement_id,service,enabled)
 select engagement_id,service,true from mapping_input cross join unnest(array['brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest']) service;
insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label)
 select client_id,engagement_id,matter_id,'Fictional Test mapping — October 16, 2026' from mapping_input;

-- Primary keys are discovered from PostgreSQL, including composite and non-UUID keys.
-- Resource names come from the reviewed fixed allowlist; none are browser-provided.
do $$ declare r text; keys text[]; begin
 foreach r in array array['public.vb_bcm_ai_observations','public.vb_bcm_ai_publications','public.vb_bcm_ai_reviews','public.vb_bcm_ai_runs','public.vb_bcm_scans','public.vb_bcm_schedules','public.vb_bcm_settings','public.vb_client_references','public.vb_digest_preferences','public.vb_evidence','public.vb_filing_drafts','public.vb_inbox','public.vb_maintenance_publications','public.vb_marks','public.vb_service_preferences','vb_private.maintenance_drafts','vb_private.watch_findings','vb_private.watch_runs','vb_private.watch_settings'] loop
  select array_agg(a.attname::text order by k.n) into keys
  from pg_index x cross join lateral unnest(x.indkey) with ordinality k(attnum,n)
  join pg_attribute a on a.attrelid=x.indrelid and a.attnum=k.attnum
  where x.indrelid=r::regclass and x.indisprimary;
  if keys is null then raise exception 'Missing primary key on %',r; end if;
  execute format($q$
   insert into vb_private.legacy_test_record_scopes(resource,record_key,client_id,engagement_id,matter_id,source_fingerprint)
   select $1,(select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(t)) where key=any($2)),t.client_id,i.engagement_id,i.matter_id,md5(to_jsonb(t)::text)
   from %s t join mapping_input i on i.client_id=t.client_id
  $q$,r::regclass) using r,keys;
 end loop;
end $$;

do $$ declare row record; actual text; begin
 for row in select * from mapping_preservation where resource<>'legacy-functions' loop
  execute format($hash$select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'')) from %s t$hash$,row.resource::regclass) into actual;
  if actual is distinct from row.fingerprint then raise exception 'Original data changed: %',row.resource; end if;
 end loop;
 select md5(string_agg(pg_get_functiondef(p.oid),'' order by p.oid)) into actual from pg_proc p where p.oid in ('public.vb_session_role()'::regprocedure,'public.vb_portal_entry()'::regprocedure,'vb_private.is_client_member(uuid)'::regprocedure);
 if actual is distinct from (select fingerprint from mapping_preservation where resource='legacy-functions') then raise exception 'Legacy access definitions changed'; end if;
end $$;
select (select count(*) from vb_private.legacy_test_mappings) as mapped_clients,
 (select count(*) from public.vb_engagements where id in (select engagement_id from mapping_input)) as test_engagements,
 (select count(*) from vb_private.engagement_grants where engagement_id in (select engagement_id from mapping_input)) as mapped_existing_users,
 (select count(*) from vb_private.legacy_test_record_scopes) as mapped_records,
 (select count(*) from mapping_preservation) as original_data_and_function_snapshots_unchanged,
 false as legacy_cutover_enabled;
commit;
