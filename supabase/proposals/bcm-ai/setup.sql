-- One-time, additive BCM AI prototype. TEST ONLY. No jobs or readiness enabled here.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required'; end if;
end; $$;
create table vb_private.bcm_ai_config (
 singleton boolean primary key default true check(singleton), ready boolean not null default false,
 max_runs integer not null default 20 check(max_runs between 1 and 20)
);
alter table vb_private.bcm_ai_config enable row level security;
insert into vb_private.bcm_ai_config(singleton) values(true);
revoke all on vb_private.bcm_ai_config from public,anon,authenticated;
grant all on vb_private.bcm_ai_config to service_role;

create table public.vb_bcm_ai_runs (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.vb_clients(id),
 settings_version integer not null, requested_by uuid not null references auth.users(id), schedule_revision integer,
 domain text not null, status text not null default 'running' check(status in ('running','completed','failed','discarded')),
 started_at timestamptz not null default now(), finished_at timestamptz,
 observation_count integer not null default 0, consulted_urls jsonb not null default '[]',
 coverage_note text, usage jsonb, unique(id,client_id)
);
create index bcm_ai_run_client on public.vb_bcm_ai_runs(client_id,started_at desc);
create table public.vb_bcm_ai_observations (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.vb_clients(id),
 domain text not null, name_key text not null, name text not null, kind text not null, context text not null,
 passage text not null, source_url text not null, first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
 first_run uuid not null, last_run uuid not null, revision integer not null default 1,
 state text not null check(state in ('known','needs_review','approved','dismissed')),
 matched_mark uuid references public.vb_marks(id), alias_of uuid,
 unique(client_id,domain,name_key), unique(id,client_id), check(alias_of is distinct from id),
 foreign key(first_run,client_id) references public.vb_bcm_ai_runs(id,client_id),
 foreign key(last_run,client_id) references public.vb_bcm_ai_runs(id,client_id),
 foreign key(alias_of,client_id) references public.vb_bcm_ai_observations(id,client_id)
);
create table public.vb_bcm_ai_publications (
 finding_id uuid primary key, client_id uuid not null, name text not null, kind text not null, context text not null,
 passage text not null, source_url text not null, approved_at timestamptz not null default now(),
 approved_by uuid not null references auth.users(id), withdrawn_at timestamptz,
 foreign key(finding_id,client_id) references public.vb_bcm_ai_observations(id,client_id)
);
create table public.vb_bcm_ai_reviews (
 id uuid primary key default gen_random_uuid(), finding_id uuid not null, client_id uuid not null,
 actor uuid not null references auth.users(id), decision text not null check(decision in ('approve','dismiss','alias')),
 note text not null check(length(btrim(note)) between 1 and 1500), observed_revision integer not null,
 target_id uuid, created_at timestamptz not null default now(),
 foreign key(finding_id,client_id) references public.vb_bcm_ai_observations(id,client_id),
 foreign key(target_id,client_id) references public.vb_bcm_ai_observations(id,client_id)
);
alter table public.vb_bcm_ai_runs enable row level security;
alter table public.vb_bcm_ai_observations enable row level security;
alter table public.vb_bcm_ai_publications enable row level security;
alter table public.vb_bcm_ai_reviews enable row level security;
revoke all on public.vb_bcm_ai_runs,public.vb_bcm_ai_observations,public.vb_bcm_ai_publications,public.vb_bcm_ai_reviews from public,anon,authenticated;
grant select on public.vb_bcm_ai_runs,public.vb_bcm_ai_observations,public.vb_bcm_ai_publications,public.vb_bcm_ai_reviews to authenticated;
grant all on public.vb_bcm_ai_runs,public.vb_bcm_ai_observations,public.vb_bcm_ai_publications,public.vb_bcm_ai_reviews to service_role;
-- Raw names/evidence are attorney-only. Client run history exposes metadata, not observations.
create policy bcm_ai_runs_read on public.vb_bcm_ai_runs for select to authenticated using((select vb_private.is_staff()));
create policy bcm_ai_observations_read on public.vb_bcm_ai_observations for select to authenticated using((select vb_private.is_staff()));
create policy bcm_ai_reviews_read on public.vb_bcm_ai_reviews for select to authenticated using((select vb_private.is_staff()));
create policy bcm_ai_publications_read on public.vb_bcm_ai_publications for select to authenticated using((select vb_private.is_staff()) or (withdrawn_at is null and vb_private.is_client_member(client_id)));
create trigger bcm_ai_review_audit after insert on public.vb_bcm_ai_reviews for each row execute function vb_private.audit_record();
create trigger bcm_ai_publication_audit after insert or update on public.vb_bcm_ai_publications for each row execute function vb_private.audit_record();

create function vb_private.bcm_ai_name(value text) returns text language sql immutable set search_path='' as $$
 select btrim(regexp_replace(lower(normalize(regexp_replace(value,'[™®℠]','','g'),NFKC)),'[^[:alnum:]]+',' ','g'));
$$;
create function vb_private.bcm_ai_domain(value text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(lower(substring(value from '^https://([^/:?#]+)')),'^www\.','');
$$;
create function vb_private.bcm_ai_valid(cfg public.vb_bcm_settings) returns boolean language sql immutable set search_path='' as $$
 select cfg.access_mode='public' and cardinality(cfg.urls)=1 and cfg.discovery_mode='site'
 and cardinality(cfg.categories)>0 and cfg.categories <@ array['product_names','feature_names','slogans','sub_brands','renames','presentation']::text[]
 and cfg.urls[1] ~ '^https://[A-Za-z0-9.-]+(/[^?#[:space:]@]*)?$'
 and vb_private.bcm_ai_domain(cfg.urls[1]) like '%.%'
 and vb_private.bcm_ai_domain(cfg.urls[1]) !~ '^[0-9.]+$'
 and vb_private.bcm_ai_domain(cfg.urls[1]) !~ '(^|\.)(localhost|local|internal|test|invalid|example|lan|home\.arpa)$';
$$;
create function public.vb_bcm_ai_ready() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null and auth.role() is distinct from 'service_role' then raise exception 'Sign in' using errcode='42501'; end if;
 return coalesce((select ready from vb_private.bcm_ai_config where singleton),false) and public.vb_bcm_scheduler_ready();
end; $$;
create function vb_private.reserve_bcm_ai(target uuid,actor uuid,schedule_rev integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; ticket uuid; domain_name text; names jsonb; cap integer;
begin
 -- Lock order is global budget, then client, then schedule/run/finding.
 select max_runs into cap from vb_private.bcm_ai_config where singleton and ready for update;
 if cap is null or not public.vb_bcm_ai_ready() then raise exception 'Test not connected'; end if;
 if (select count(*) from public.vb_bcm_ai_runs)>=cap then raise exception 'Test run limit reached'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 if not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,actor) then raise exception 'Access or settings unavailable'; end if;
 if exists(select 1 from public.vb_bcm_ai_runs where client_id=target and status='running' and started_at>now()-interval '5 minutes') then raise exception 'Research already running'; end if;
 update public.vb_bcm_ai_runs set status='failed',finished_at=now() where client_id=target and status='running';
 domain_name:=vb_private.bcm_ai_domain(cfg.urls[1]);
 insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,schedule_revision,domain)
 values(target,cfg.version,actor,schedule_rev,domain_name) returning id into ticket;
 select coalesce(jsonb_agg(name),'[]') into names from
 (select name from public.vb_bcm_ai_observations where client_id=target and domain=domain_name order by last_seen desc limit 50) n;
 return jsonb_build_object('ticket',ticket,'settings',to_jsonb(cfg),'known_names',names);
end; $$;
create function public.vb_begin_bcm_ai_run(target_client uuid,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not vb_private.is_client_member(target_client) or public.vb_session_role()<>'client' then raise exception 'Client access required' using errcode='42501'; end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then raise exception 'Verify authenticator' using errcode='42501';end if;
 -- Reserve first under the global lock; mismatch raises and rolls back the reservation.
 result:=vb_private.reserve_bcm_ai(target_client,auth.uid(),null);
 if (result->'settings'->>'version')::integer is distinct from expected_version then raise exception 'Reload settings' using errcode='40001'; end if;
 return result;
end; $$;
create function public.vb_claim_bcm_ai_due_run() returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; cfg public.vb_bcm_settings; s public.vb_bcm_schedules; result jsonb; cap integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501'; end if;
 select max_runs into cap from vb_private.bcm_ai_config where singleton and ready for update;
 if cap is null or not public.vb_bcm_ai_ready() or (select count(*) from public.vb_bcm_ai_runs)>=cap then return null; end if;
 select c.id into target from public.vb_clients c join public.vb_bcm_schedules due_schedule on due_schedule.client_id=c.id
 where due_schedule.enabled and due_schedule.next_run_at<=now() and not exists(select 1 from public.vb_bcm_ai_runs r where r.client_id=c.id and r.status='running' and r.started_at>now()-interval '5 minutes')
 order by due_schedule.next_run_at,c.id for update of c skip locked limit 1;
 if target is null then return null; end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 select * into s from public.vb_bcm_schedules where client_id=target for update;
 if cfg.version is distinct from s.settings_version or not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,s.authorized_by) then
  update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,last_status='access_unavailable',updated_at=now() where client_id=target;
  return null;
 end if;
 result:=vb_private.reserve_bcm_ai(target,s.authorized_by,s.revision);
 update public.vb_bcm_schedules set next_run_at=case cfg.frequency when 'weekly' then now()+interval '168 hours' else ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' end,last_status='running',updated_at=now() where client_id=target;
 return result;
end; $$;
create function public.vb_bcm_ai_run_is_current(ticket uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501'; end if;
 return public.vb_bcm_ai_ready() and exists(select 1 from public.vb_bcm_ai_runs r join public.vb_bcm_settings c on c.client_id=r.client_id
 left join public.vb_bcm_schedules s on s.client_id=r.client_id where r.id=ticket and r.status='running' and r.started_at>now()-interval '5 minutes'
 and c.version=r.settings_version and vb_private.bcm_ai_valid(c) and vb_private.bcm_ai_domain(c.urls[1])=r.domain
 and vb_private.bcm_actor_has_access(r.client_id,r.requested_by)
 and (r.schedule_revision is null or (s.enabled and s.revision=r.schedule_revision and s.authorized_by=r.requested_by and s.settings_version=c.version)));
end; $$;
create function public.vb_finish_bcm_ai_run(ticket uuid,payload jsonb,failure boolean) returns text
language plpgsql security definer set search_path='' as $$
declare r public.vb_bcm_ai_runs; cfg public.vb_bcm_settings; target uuid; o jsonb; item public.vb_bcm_ai_observations;
 k text; mark uuid; initial boolean; category text; host text; path text; changed boolean;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501'; end if;
 select client_id into target from public.vb_bcm_ai_runs where id=ticket;
 if target is null then raise exception 'Unknown run'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into r from public.vb_bcm_ai_runs where id=ticket for update;
 if r.status<>'running' then return r.status; end if;
 if failure is distinct from false or not public.vb_bcm_ai_run_is_current(ticket) then
  update public.vb_bcm_ai_runs set status=case when failure then 'failed' else 'discarded' end,finished_at=now() where id=ticket;
  update public.vb_bcm_schedules set last_status='failed',updated_at=now() where client_id=target and revision=r.schedule_revision;
  return case when failure then 'failed' else 'discarded' end;
 end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>60000
 or payload->>'source' is distinct from 'openai-observations-v1' or payload->>'model' is distinct from 'gpt-6-luna'
 or payload->>'domain' is distinct from r.domain or payload->>'coverage' is distinct from 'limited'
 or jsonb_typeof(payload->'observations') is distinct from 'array' or jsonb_array_length(payload->'observations')>12
 or jsonb_typeof(payload->'consulted_urls') is distinct from 'array' or jsonb_array_length(payload->'consulted_urls') not between 1 and 60
 or jsonb_typeof(payload->'coverage_note') is distinct from 'string' or length(payload->>'coverage_note')>2000
 or jsonb_typeof(payload->'usage') is distinct from 'object' then raise exception 'Invalid research payload'; end if;
 initial:=not exists(select 1 from public.vb_bcm_ai_runs where client_id=target and domain=r.domain and status='completed');
 for o in select value from jsonb_array_elements(payload->'observations') loop
  if jsonb_typeof(o)<>'object' or exists(select 1 from unnest(array['name','kind','context','passage','url','name_key']) f where jsonb_typeof(o->f) is distinct from 'string')
  or length(btrim(o->>'name')) not between 1 and 150 or length(btrim(o->>'context')) not between 1 and 300
  or length(btrim(o->>'passage')) not between 1 and 400 or length(o->>'url')>2048 then raise exception 'Invalid observation'; end if;
  category:=case o->>'kind' when 'product' then 'product_names' when 'service' then 'product_names' when 'feature' then 'feature_names' when 'slogan' then 'slogans' when 'sub_brand' then 'sub_brands' when 'rename' then 'renames' when 'identity' then 'presentation' end;
  k:=vb_private.bcm_ai_name(o->>'name');host:=lower(substring(o->>'url' from '^https://([^/:?#]+)'));path:=coalesce(substring(o->>'url' from '^https://[^/]+(/[^?#]*)'),'/');
  if k='' or k is distinct from o->>'name_key' or category is null or not (category=any(cfg.categories))
  or host is null or (host<>r.domain and right(host,length(r.domain)+1)<>'.'||r.domain)
  or o->>'url' !~ '^https://[A-Za-z0-9.-]+(/[^[:space:]@]*)?$'
  or not (payload->'consulted_urls' @> jsonb_build_array(o->>'url'))
  or exists(select 1 from unnest(cfg.exclusions) e where left(path,length(e))=e)
  then raise exception 'Evidence outside saved scope'; end if;
  select * into item from public.vb_bcm_ai_observations where client_id=target and domain=r.domain and name_key=k for update;
  if found then
   -- Remember aliases without overwriting the canonical asset's evidence with an alias's wording.
   if item.alias_of is not null then
    update public.vb_bcm_ai_observations set last_seen=now(),last_run=ticket where id=item.id;
    update public.vb_bcm_ai_observations set last_seen=now() where id=item.alias_of;
   else
    changed:=vb_private.bcm_ai_name(item.passage) is distinct from vb_private.bcm_ai_name(o->>'passage');
    update public.vb_bcm_ai_observations set last_seen=now(),last_run=ticket,
     kind=o->>'kind',context=o->>'context',passage=o->>'passage',source_url=o->>'url',revision=revision+1,
     state=case when changed and state='known' and o->>'kind' in ('rename','identity') and kind is distinct from o->>'kind' then 'needs_review' else state end where id=item.id;
    -- Approval/dismissal persists. Changed evidence remains available to the attorney;
    -- it never silently edits a previously approved client-facing snapshot.
   end if;
  else
   select id into mark from public.vb_marks where client_id=target and archived_at is null and mark_type is distinct from 'logo' and vb_private.bcm_ai_name(name)=k order by id limit 1;
   insert into public.vb_bcm_ai_observations(client_id,domain,name_key,name,kind,context,passage,source_url,first_run,last_run,state,matched_mark)
   values(target,r.domain,k,o->>'name',o->>'kind',o->>'context',o->>'passage',o->>'url',ticket,ticket,case when initial or mark is not null then 'known' else 'needs_review' end,mark);
  end if;
 end loop;
 update public.vb_bcm_ai_runs set status='completed',finished_at=now(),observation_count=jsonb_array_length(payload->'observations'),
 consulted_urls=payload->'consulted_urls',coverage_note=payload->>'coverage_note',usage=payload->'usage' where id=ticket;
 update public.vb_bcm_schedules set last_status='completed',updated_at=now() where client_id=target and revision=r.schedule_revision;
 return 'completed';
end; $$;
create function public.vb_review_bcm_ai_finding(finding uuid,expected_revision integer,decision text,note text,alias_target uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare o public.vb_bcm_ai_observations; other public.vb_bcm_ai_observations; target uuid;
begin
 if not vb_private.is_staff() then raise exception 'Attorney access required' using errcode='42501'; end if;
 if decision is null or decision not in ('approve','dismiss','alias') or note is null or length(btrim(note)) not between 1 and 1500 then raise exception 'Decision and review note required'; end if;
 select client_id into target from public.vb_bcm_ai_observations where id=finding;
 if target is null then raise exception 'Unknown finding'; end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into o from public.vb_bcm_ai_observations where id=finding for update;
 if o.revision is distinct from expected_revision or o.alias_of is not null then raise exception 'Finding changed; reload' using errcode='40001'; end if;
 if decision='alias' then
  select * into other from public.vb_bcm_ai_observations where id=alias_target;
  if not found or other.id=o.id or other.client_id<>o.client_id or other.domain<>o.domain or other.alias_of is not null
  or exists(select 1 from public.vb_bcm_ai_observations where alias_of=o.id) then raise exception 'Choose another canonical finding for the same client and website'; end if;
  update public.vb_bcm_ai_observations set alias_of=other.id,state='dismissed',revision=revision+1 where id=finding;
 else
  if alias_target is not null then raise exception 'Unexpected alias target'; end if;
  update public.vb_bcm_ai_observations set state=case decision when 'approve' then 'approved' else 'dismissed' end,revision=revision+1 where id=finding;
 end if;
 insert into public.vb_bcm_ai_reviews(finding_id,client_id,actor,decision,note,observed_revision,target_id)
 values(finding,target,auth.uid(),decision,btrim(note),o.revision,alias_target);
 if decision='approve' then
  insert into public.vb_bcm_ai_publications as existing(finding_id,client_id,name,kind,context,passage,source_url,approved_by)
  values(finding,target,o.name,o.kind,o.context,o.passage,o.source_url,auth.uid())
  on conflict(finding_id) do update set name=excluded.name,kind=excluded.kind,context=excluded.context,passage=excluded.passage,
  source_url=excluded.source_url,approved_by=excluded.approved_by,approved_at=now(),withdrawn_at=null;
 else
  update public.vb_bcm_ai_publications set withdrawn_at=now() where finding_id=finding and withdrawn_at is null;
 end if;
end; $$;
-- Client-visible history is deliberately limited to statuses and counts. AI coverage text can contain unreviewed names.
create function public.vb_bcm_ai_client_history(target_client uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select id,status,started_at,finished_at,observation_count from public.vb_bcm_ai_runs where client_id=target_client order by started_at desc limit 20) r),'[]');
end; $$;
create function public.vb_set_bcm_ai_monitoring(target_client uuid,expected_settings_version integer,expected_revision integer,enabled boolean)
returns public.vb_bcm_schedules language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then raise exception 'Verify authenticator' using errcode='42501';end if;
 perform 1 from public.vb_clients where id=target_client for update;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if enabled and (not public.vb_bcm_ai_ready() or not coalesce(vb_private.bcm_ai_valid(cfg),false)) then raise exception 'AI research unavailable for these settings';end if;
 return public.vb_set_bcm_monitoring(target_client,expected_settings_version,expected_revision,enabled);
end; $$;
revoke all on function public.vb_set_bcm_ai_monitoring(uuid,integer,integer,boolean) from public,anon;
grant execute on function public.vb_set_bcm_ai_monitoring(uuid,integer,integer,boolean) to authenticated;
-- Explicit allowlist: every private helper is inaccessible to browser roles.
revoke all on function vb_private.bcm_ai_name(text),vb_private.bcm_ai_domain(text),vb_private.bcm_ai_valid(public.vb_bcm_settings),vb_private.reserve_bcm_ai(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.vb_bcm_ai_ready(),public.vb_begin_bcm_ai_run(uuid,integer),public.vb_claim_bcm_ai_due_run(),public.vb_bcm_ai_run_is_current(uuid),public.vb_finish_bcm_ai_run(uuid,jsonb,boolean),public.vb_review_bcm_ai_finding(uuid,integer,text,text,uuid),public.vb_bcm_ai_client_history(uuid) from public,anon,authenticated;
grant execute on function public.vb_bcm_ai_ready() to authenticated,service_role;
grant execute on function public.vb_begin_bcm_ai_run(uuid,integer),public.vb_bcm_ai_client_history(uuid),public.vb_review_bcm_ai_finding(uuid,integer,text,text,uuid) to authenticated;
grant execute on function public.vb_claim_bcm_ai_due_run(),public.vb_bcm_ai_run_is_current(uuid),public.vb_finish_bcm_ai_run(uuid,jsonb,boolean) to service_role;
notify pgrst,'reload schema';
commit;
