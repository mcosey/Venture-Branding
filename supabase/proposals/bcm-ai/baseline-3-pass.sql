-- Approved Test-only baseline improvement. Existing permissions/history preserved. No activation.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'BCM Test required';end if;
 if exists(select 1 from vb_private.bcm_ai_config where ready) or exists(select 1 from vb_private.bcm_scheduler_config where ready) then raise exception 'Keep Test paused during update';end if;
end; $$;
create or replace function public.vb_finish_bcm_ai_run(ticket uuid,payload jsonb,failure boolean) returns text
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
 -- The first three successful passes for this client/domain form the baseline.
 initial:=(select count(*) from public.vb_bcm_ai_runs where client_id=target and domain=r.domain and status='completed')<3;
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
     state=case when not initial and changed and state='known' and o->>'kind' in ('rename','identity') and kind is distinct from o->>'kind' then 'needs_review' else state end where id=item.id;
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
create or replace function public.vb_bcm_ai_baseline_progress(target_client uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare hostname text; passes integer;
begin
 if not (vb_private.is_staff() or vb_private.is_client_member(target_client)) then raise exception 'Client access required' using errcode='42501';end if;
 select vb_private.bcm_ai_domain(urls[1]) into hostname from public.vb_bcm_settings where client_id=target_client;
 select least(count(*),3)::integer into passes from public.vb_bcm_ai_runs where client_id=target_client and domain=hostname and status='completed';
 return jsonb_build_object('completed',passes,'remaining',3-passes);
end; $$;
revoke all on function public.vb_bcm_ai_baseline_progress(uuid) from public,anon;
grant execute on function public.vb_bcm_ai_baseline_progress(uuid) to authenticated;
create or replace function public.vb_set_bcm_ai_monitoring(target_client uuid,expected_settings_version integer,expected_revision integer,enabled boolean)
returns public.vb_bcm_schedules language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then raise exception 'Verify authenticator' using errcode='42501';end if;
 perform 1 from public.vb_clients where id=target_client for update;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if enabled and (((public.vb_bcm_ai_baseline_progress(target_client)->>'remaining')::integer)>0 or not public.vb_bcm_ai_ready() or not coalesce(vb_private.bcm_ai_valid(cfg),false)) then raise exception 'AI research unavailable for these settings';end if;
 return public.vb_set_bcm_monitoring(target_client,expected_settings_version,expected_revision,enabled);
end; $$;
notify pgrst,'reload schema';
commit;
