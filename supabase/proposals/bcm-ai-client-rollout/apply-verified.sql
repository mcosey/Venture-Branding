rollback;
-- Approved general-client Production rollout; atomic, preserves schedules and records.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
 if to_regprocedure('vb_private.dispatch_bcm_ai_tick()') is null then raise exception 'Existing verified dispatcher required';end if;
 if exists(select 1 from public.vb_bcm_ai_runs where status='running') then raise exception 'Wait for current research before applying';end if;
 if exists(select 1 from cron.job where jobname='vb-bcm-due-tick' and active) then raise exception 'Legacy crawler must stay off';end if;
end;$$;
alter table vb_private.bcm_ai_config add column client_month_limit integer not null default 8 check(client_month_limit>0),add column global_month_limit integer not null default 200 check(global_month_limit>0);
create index bcm_ai_run_month on public.vb_bcm_ai_runs(started_at);
create function vb_private.bcm_ai_month_start() returns timestamptz language sql stable set search_path='' as $$
 select date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
$$;
create or replace function public.vb_bcm_ai_ready() returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null and auth.role() is distinct from 'service_role' then raise exception 'Sign in' using errcode='42501';end if;
 return coalesce((select ready from vb_private.bcm_ai_config where singleton),false) and public.vb_bcm_scheduler_ready();
end;$$;
create function vb_private.bcm_ai_allowance(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cfg vb_private.bcm_ai_config; used integer; shared integer; active boolean; connected boolean; reason text; month_start timestamptz:=vb_private.bcm_ai_month_start();
begin
 select * into cfg from vb_private.bcm_ai_config where singleton;
 select count(*),count(*) filter(where client_id=target) into shared,used from public.vb_bcm_ai_runs where started_at>=month_start;
 active:=exists(select 1 from public.vb_clients where id=target and portal_enabled and archived_at is null);
 connected:=coalesce(cfg.ready,false) and coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false);
 reason:=case when not active then 'client_unavailable' when not connected then 'paused' when shared>=cfg.global_month_limit then 'global_limit' when used>=cfg.client_month_limit then 'client_limit' else 'available' end;
 return jsonb_build_object('limit',cfg.client_month_limit,'used',used,'remaining',greatest(cfg.client_month_limit-used,0),'resets_at',((month_start at time zone 'UTC')+interval '1 month') at time zone 'UTC','available',reason='available','reason',reason);
end;$$;
create function public.vb_bcm_ai_allowance(target_client uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not (vb_private.is_staff() or vb_private.is_client_member(target_client)) then raise exception 'Client access required' using errcode='42501';end if;
 return vb_private.bcm_ai_allowance(target_client);
end;$$;
revoke all on function vb_private.bcm_ai_month_start(),vb_private.bcm_ai_allowance(uuid),public.vb_bcm_ai_allowance(uuid) from public,anon,authenticated;
grant execute on function public.vb_bcm_ai_allowance(uuid) to authenticated;
create or replace function vb_private.reserve_bcm_ai(target uuid,actor uuid,schedule_rev integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings; ticket uuid; domain_name text; names jsonb; allowance jsonb;
begin
 -- Every reservation takes the same global row lock before checking either monthly counter.
 perform 1 from vb_private.bcm_ai_config where singleton for update;
 if not public.vb_bcm_ai_ready() then raise exception 'Research is paused';end if;
 perform 1 from public.vb_clients where id=target for update;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 if not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,actor) then raise exception 'Access or settings unavailable';end if;
 allowance:=vb_private.bcm_ai_allowance(target);
 if not (allowance->>'available')::boolean then raise exception 'Monthly research allowance reached';end if;
 if exists(select 1 from public.vb_bcm_ai_runs where client_id=target and status='running' and started_at>now()-interval '5 minutes') then raise exception 'Research already running';end if;
 update public.vb_bcm_ai_runs set status='failed',finished_at=now() where client_id=target and status='running';
 domain_name:=vb_private.bcm_ai_domain(cfg.urls[1]);
 insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,schedule_revision,domain) values(target,cfg.version,actor,schedule_rev,domain_name) returning id into ticket;
 select coalesce(jsonb_agg(name),'[]') into names from (select name from public.vb_bcm_ai_observations where client_id=target and domain=domain_name order by last_seen desc limit 50) n;
 return jsonb_build_object('ticket',ticket,'settings',to_jsonb(cfg),'known_names',names);
end;$$;
create or replace function public.vb_claim_bcm_ai_due_run() returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; cfg public.vb_bcm_settings; s public.vb_bcm_schedules; result jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501';end if;
 perform 1 from vb_private.bcm_ai_config where singleton for update;
 if not public.vb_bcm_ai_ready() then return null;end if;
 -- Exhausted clients are skipped, so they cannot block another client's due work.
 for target in select c.id from public.vb_clients c join public.vb_bcm_schedules due_schedule on due_schedule.client_id=c.id
 where c.portal_enabled and c.archived_at is null and due_schedule.enabled and due_schedule.next_run_at<=now()
 and (vb_private.bcm_ai_allowance(c.id)->>'available')::boolean
 and not exists(select 1 from public.vb_bcm_ai_runs r where r.client_id=c.id and r.status='running' and r.started_at>now()-interval '5 minutes')
 order by due_schedule.next_run_at,c.id for update of c skip locked loop
  select * into cfg from public.vb_bcm_settings where client_id=target;
  select * into s from public.vb_bcm_schedules where client_id=target for update;
  if cfg.version is distinct from s.settings_version or not coalesce(vb_private.bcm_ai_valid(cfg),false) or not vb_private.bcm_actor_has_access(target,s.authorized_by)
  or (select count(*) from public.vb_bcm_ai_runs where client_id=target and domain=vb_private.bcm_ai_domain(cfg.urls[1]) and status='completed')<3 then
   update public.vb_bcm_schedules set enabled=false,next_run_at=null,revision=revision+1,last_status='access_unavailable',updated_at=now() where client_id=target;
   continue;
  end if;
  result:=vb_private.reserve_bcm_ai(target,s.authorized_by,s.revision);
  update public.vb_bcm_schedules set next_run_at=case cfg.frequency when 'weekly' then now()+interval '168 hours' else ((now() at time zone 'UTC')+interval '1 month') at time zone 'UTC' end,last_status='running',updated_at=now() where client_id=target;
  return result;
 end loop;
 return null;
end;$$;
create or replace function public.vb_bcm_ai_run_is_current(ticket uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Worker required' using errcode='42501';end if;
 -- A reservation that uses the final allowance remains valid for completion.
 return public.vb_bcm_ai_ready() and exists(select 1 from public.vb_bcm_ai_runs r join public.vb_bcm_settings c on c.client_id=r.client_id
 left join public.vb_bcm_schedules s on s.client_id=r.client_id where r.id=ticket and r.status='running' and r.started_at>now()-interval '5 minutes'
 and c.version=r.settings_version and vb_private.bcm_ai_valid(c) and vb_private.bcm_ai_domain(c.urls[1])=r.domain and vb_private.bcm_actor_has_access(r.client_id,r.requested_by)
 and (r.schedule_revision is null or (s.enabled and s.revision=r.schedule_revision and s.authorized_by=r.requested_by and s.settings_version=c.version)));
end;$$;
create or replace function public.vb_set_bcm_ai_monitoring(target_client uuid,expected_settings_version integer,expected_revision integer,enabled boolean) returns public.vb_bcm_schedules language plpgsql security definer set search_path='' as $$
declare cfg public.vb_bcm_settings;
begin
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified') then raise exception 'Verify authenticator' using errcode='42501';end if;
 perform 1 from public.vb_clients where id=target_client for update;
 select * into cfg from public.vb_bcm_settings where client_id=target_client;
 if enabled and (((public.vb_bcm_ai_baseline_progress(target_client)->>'remaining')::integer)>0 or not (vb_private.bcm_ai_allowance(target_client)->>'available')::boolean or not coalesce(vb_private.bcm_ai_valid(cfg),false)) then raise exception 'Research unavailable, allowance reached, or baseline incomplete';end if;
 return public.vb_set_bcm_monitoring(target_client,expected_settings_version,expected_revision,enabled);
end;$$;
create or replace function vb_private.dispatch_bcm_ai_tick() returns bigint language plpgsql security definer set search_path='' as $$
declare endpoint text; credential text;
begin
 if not coalesce((select ready from vb_private.bcm_ai_config where singleton),false) or not coalesce((select ready from vb_private.bcm_scheduler_config where singleton),false)
 or not exists(select 1 from public.vb_bcm_schedules s join public.vb_clients c on c.id=s.client_id where s.enabled and s.next_run_at<=now() and c.portal_enabled and c.archived_at is null
 and (vb_private.bcm_ai_allowance(c.id)->>'available')::boolean and not exists(select 1 from public.vb_bcm_ai_runs r where r.client_id=c.id and r.status='running' and r.started_at>now()-interval '5 minutes')) then return null;end if;
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='bcm_scheduler_project_url';
 select decrypted_secret into credential from vault.decrypted_secrets where name='bcm_scheduler_secret_v2';
 if endpoint is distinct from 'https://omvkwiosonatswocbdgx.supabase.co' or credential is null or length(credential)<32 or credential ~ '[[:space:]]' then raise exception 'Private scheduler unavailable';end if;
 return net.http_post(url:=endpoint||'/functions/v1/bcm-ai-schedule',body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','x-bcm-scheduler-secret',credential),timeout_milliseconds:=110000);
end;$$;
-- Old pilot fields remain as historical metadata; active functions no longer use them.
update vb_private.bcm_ai_config set pilot_client_id=null where singleton;
notify pgrst,'reload schema';

savepoint budget_fixture;
do $$ declare target uuid:='10000000-0000-0000-0000-000000000001'; second uuid:='b9200000-0000-0000-0000-000000000001'; actor uuid; cfg public.vb_bcm_settings; job jsonb; payload jsonb; used integer; total integer; i integer; decision public.vb_bcm_schedules;
begin
 if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'Production required';end if;
 select user_id into actor from vb_private.client_memberships where client_id=target and active limit 1;
 if actor is null or exists(select 1 from public.vb_clients where id=second) then raise exception 'Existing actor or clean fixture required';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 if (public.vb_bcm_ai_allowance(target)->>'limit')::integer<>8 then raise exception 'Wrong client default';end if;
 begin perform public.vb_bcm_ai_allowance(second);raise exception 'Foreign-client usage exposed';exception when insufficient_privilege then null;end;
 if public.vb_bcm_ai_allowance(target) ? 'global_used' then raise exception 'Shared usage exposed';end if;
 select (public.vb_bcm_ai_allowance(target)->>'used')::integer into used;
 if used<1 then raise exception 'Existing month usage required for boundary fixture';end if;
 update vb_private.bcm_ai_config set client_month_limit=used where singleton;
 if (public.vb_bcm_ai_allowance(target)->>'reason')<>'client_limit' then raise exception 'Client cap not enforced';end if;
 select * into cfg from public.vb_bcm_settings where client_id=target;
 begin perform public.vb_begin_bcm_ai_run(target,cfg.version);raise exception 'Extra reservation accepted';exception when raise_exception then if sqlerrm<>'Monthly research allowance reached' then raise;end if;end;
 insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values(second,'ROLLBACK BCM fixture','business','Fictional fixture',true);
 insert into vb_private.client_memberships(client_id,user_id) values(second,actor);
 insert into public.vb_bcm_settings(client_id,urls,frequency,categories,exclusions,access_mode,discovery_mode,version,authorized_by,authorized_at)
 values(second,array['https://rollout-fixture.example.com/'],'weekly',array['product_names'],array[]::text[],'public','site',1,actor,now());
 update public.vb_bcm_schedules set enabled=true,revision=1,settings_version=1,authorized_by=actor,started_at=now(),next_run_at=now()-interval '1 hour' where client_id=second;
 -- Completed baseline in the previous month is retained but does not spend this month's checks.
 for i in 1..3 loop
  insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,domain,status,started_at,finished_at)
  values(second,1,actor,'rollout-fixture.example.com','completed',vb_private.bcm_ai_month_start()-interval '1 hour',vb_private.bcm_ai_month_start()-interval '30 minutes');
 end loop;
 if (public.vb_bcm_ai_allowance(second)->>'used')::integer<>0 or (public.vb_bcm_ai_baseline_progress(second)->>'completed')::integer<>3 then raise exception 'Monthly reset or baseline retention failed';end if;
 -- The exhausted original client is earlier in the due queue; the second must still run.
 update public.vb_bcm_schedules set next_run_at=now()-interval '2 hours' where client_id=target;
 update vb_private.bcm_ai_config set client_month_limit=1 where singleton;
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 job:=public.vb_claim_bcm_ai_due_run();
 if (job->'settings'->>'client_id')::uuid is distinct from second then raise exception 'Exhausted client blocked the queue';end if;
 if not public.vb_bcm_ai_run_is_current((job->>'ticket')::uuid) then raise exception 'Last permitted reservation invalid at cap';end if;
 payload:=jsonb_build_object('source','openai-observations-v1','model','gpt-6-luna','domain','rollout-fixture.example.com','coverage','limited','coverage_note','Rollback only; no provider call','consulted_urls',jsonb_build_array('https://rollout-fixture.example.com/'),'observations','[]'::jsonb,'usage','{}'::jsonb);
 if public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,payload,false)<>'completed' then raise exception 'Final permitted run discarded';end if;
 if public.vb_claim_bcm_ai_due_run() is not null then raise exception 'Unexpected additional queue reservation';end if;
 if (vb_private.bcm_ai_allowance(second)->>'used')::integer<>1 then raise exception 'New month count wrong';end if;
 -- A failed attempt also counts, without a provider request or automatic retry.
 insert into public.vb_bcm_ai_runs(client_id,settings_version,requested_by,domain,status,finished_at) values(second,1,actor,'rollout-fixture.example.com','failed',now());
 if (vb_private.bcm_ai_allowance(second)->>'used')::integer<>2 then raise exception 'Failure bypassed budget';end if;
 select count(*) into total from public.vb_bcm_ai_runs where started_at>=vb_private.bcm_ai_month_start();
 update vb_private.bcm_ai_config set global_month_limit=total,client_month_limit=8 where singleton;
 if (vb_private.bcm_ai_allowance(second)->>'reason')<>'global_limit' or public.vb_claim_bcm_ai_due_run() is not null then raise exception 'Shared cap not enforced';end if;
 update vb_private.bcm_ai_config set global_month_limit=200,ready=false where singleton;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 if (public.vb_bcm_ai_allowance(second)->>'reason')<>'paused' then raise exception 'Global pause ignored';end if;
 decision:=public.vb_set_bcm_ai_monitoring(second,1,1,false);
 if decision.enabled then raise exception 'Cannot pause without research';end if;
 -- Archived workspaces cannot spend remaining allowance.
 update vb_private.bcm_ai_config set ready=true where singleton;
 update public.vb_clients set archived_at=now() where id=second;
 if (vb_private.bcm_ai_allowance(second)->>'reason')<>'client_unavailable' then raise exception 'Archived client enabled';end if;
end;$$;
set local role authenticated;
do $$ begin if exists(select 1 from public.vb_bcm_ai_observations) or exists(select 1 from public.vb_bcm_ai_reviews) then raise exception 'Private findings or notes exposed';end if;end;$$;
reset role;
rollback to savepoint budget_fixture;
savepoint review_fixture;
do $$ begin if (select system_identifier::text from pg_control_system())<>'7690937621030482216' then raise exception 'BCM Production required';end if;end;$$;
do $verify$
declare target uuid:='10000000-0000-0000-0000-000000000001'; actor uuid; reviewer uuid; finding uuid; cfg public.vb_bcm_settings; job jsonb; p jsonb; i integer; total integer; before_count integer; payloads jsonb:= $saved$[{"source": "openai-observations-v1", "model": "gpt-6-luna", "domain": "baseline-replay.example.com", "coverage": "limited", "coverage_note": "Saved OpenAI benchmark replay; no API request", "consulted_urls": ["https://baseline-replay.example.com/evidence"], "usage": {}, "observations": [{"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "ChatGPT", "passage": "ChatGPT — the main consumer-facing product", "name_key": "chatgpt", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "ChatGPT Work", "passage": "ChatGPT Work — presented as an agent for ambitious work", "name_key": "chatgpt work", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "Codex", "passage": "Codex — a distinct product name for coding and software-development work.", "name_key": "codex", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "Dots", "passage": "Dots — branded as “always-on agents built to handle everything.”", "name_key": "dots", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "API Platform", "passage": "API Platform — developer-facing platform positioned with the headline “Build leading AI products on OpenAI’s platform.”", "name_key": "api platform", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "slogan", "name": "“Frontier intelligence everywhere you work”", "passage": "“Frontier intelligence everywhere you work” — business-facing positioning.", "name_key": "frontier intelligence everywhere you work", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "slogan", "name": "“Pioneering research on the path to AGI”", "passage": "“Pioneering research on the path to AGI” — research positioning.", "name_key": "pioneering research on the path to agi", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "slogan", "name": "“Build leading AI products on OpenAI’s platform”", "passage": "“Build leading AI products on OpenAI’s platform”", "name_key": "build leading ai products on openai s platform", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "sub_brand", "name": "ChatGPT Business, ChatGPT Enterprise, and ChatGPT for Education", "passage": "ChatGPT Business, ChatGPT Enterprise, and ChatGPT for Education", "name_key": "chatgpt business chatgpt enterprise and chatgpt for education", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "identity", "name": "OpenAI parent identity", "passage": "a consistent OpenAI parent identity", "name_key": "openai parent identity", "context": "Saved benchmark candidate; replay only."}]}, {"source": "openai-observations-v1", "model": "gpt-6-luna", "domain": "baseline-replay.example.com", "coverage": "limited", "coverage_note": "Saved OpenAI benchmark replay; no API request", "consulted_urls": ["https://baseline-replay.example.com/evidence"], "usage": {}, "observations": [{"url": "https://baseline-replay.example.com/evidence", "kind": "feature", "name": "Deep research", "passage": "Presented as a ChatGPT capability for “complex questions.”", "name_key": "deep research", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "slogan", "name": "AI Platforms to Accelerate your Business", "passage": "Business-page headline positioning OpenAI’s business offerings.", "name_key": "ai platforms to accelerate your business", "context": "Saved benchmark candidate; replay only."}]}, {"source": "openai-observations-v1", "model": "gpt-6-luna", "domain": "baseline-replay.example.com", "coverage": "limited", "coverage_note": "Saved OpenAI benchmark replay; no API request", "consulted_urls": ["https://baseline-replay.example.com/evidence"], "usage": {}, "observations": [{"url": "https://baseline-replay.example.com/evidence", "kind": "feature", "name": "Intelligent UI", "passage": "GPT-6 and Intelligent UI for everyone.", "name_key": "intelligent ui", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "GPT-6", "passage": "GPT-6 and Intelligent UI for everyone.", "name_key": "gpt 6", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "GPT-6.1 Sol", "passage": "GPT-6.1 Sol", "name_key": "gpt 6 1 sol", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "GPT-6 Astra", "passage": "GPT-6 Astra", "name_key": "gpt 6 astra", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "GPT-5.6", "passage": "GPT-5.6", "name_key": "gpt 5 6", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "GPT-5.5", "passage": "GPT-5.5", "name_key": "gpt 5 5", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "sub_brand", "name": "OpenAI Academy", "passage": "OpenAI Academy", "name_key": "openai academy", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "sub_brand", "name": "Supply Co.", "passage": "Supply Co.", "name_key": "supply co", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "Apps SDK", "passage": "Apps SDK", "name_key": "apps sdk", "context": "Saved benchmark candidate; replay only."}, {"url": "https://baseline-replay.example.com/evidence", "kind": "product", "name": "Open Models", "passage": "Open Models", "name_key": "open models", "context": "Saved benchmark candidate; replay only."}]}]$saved$::jsonb;
begin
 select user_id into actor from vb_private.client_memberships where client_id=target and active limit 1;
 if actor is null then raise exception 'Existing Test client required';end if;
 select count(*) into before_count from public.vb_bcm_ai_observations;
 update vb_private.bcm_ai_config set ready=true,pilot_client_id=target,client_month_limit=50 where singleton;
 update vb_private.bcm_scheduler_config set ready=true where singleton;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 select * into cfg from public.vb_bcm_settings where client_id=target;
 perform public.vb_save_bcm_settings(target,cfg.version,jsonb_build_object('urls',jsonb_build_array('https://baseline-replay.example.com/'),'exclusions','[]'::jsonb,'access_mode','public','frequency','weekly','categories',jsonb_build_array('product_names','feature_names','slogans','sub_brands','renames','presentation'),'discovery_mode','site'),true);
 select * into cfg from public.vb_bcm_settings where client_id=target;
 if not vb_private.bcm_ai_valid(cfg) or not vb_private.bcm_actor_has_access(target,actor) then raise exception 'Fixture prerequisite failed before reservation';end if;
 if (public.vb_bcm_ai_baseline_progress(target)->>'completed')::integer<>0 then raise exception 'New website did not reset baseline';end if;
 begin
  perform public.vb_bcm_ai_baseline_progress('ffffffff-ffff-ffff-ffff-ffffffffffff');raise exception 'Other-client progress exposed';
 exception when insufficient_privilege then null;end;
 for i in 0..2 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
  if i=0 then
   job:=public.vb_begin_bcm_ai_run(target,cfg.version);
   perform set_config('request.jwt.claims','{"role":"service_role"}',true);
   perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,null,true);
   perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
   if (public.vb_bcm_ai_baseline_progress(target)->>'completed')::integer<>0 then raise exception 'Failed pass counted';end if;
  end if;
  job:=public.vb_begin_bcm_ai_run(target,cfg.version);
  p:=payloads->i;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  if public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false)<>'completed' then raise exception 'Replay failed';end if;
  perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false);
  if exists(select 1 from public.vb_bcm_ai_observations where client_id=target and domain='baseline-replay.example.com' and state<>'known') then raise exception 'Baseline generated an alert';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
  if (public.vb_bcm_ai_baseline_progress(target)->>'completed')::integer<>i+1 then raise exception 'Progress/idempotence failed';end if;
  if i<2 then
   begin perform public.vb_set_bcm_ai_monitoring(target,cfg.version,(select revision from public.vb_bcm_schedules where client_id=target),true);raise exception 'Monitoring started before baseline';
   exception when raise_exception then if sqlerrm<>'Research unavailable, allowance reached, or baseline incomplete' then raise;end if;end;
  end if;
 end loop;
 select count(*) into total from public.vb_bcm_ai_observations where client_id=target and domain='baseline-replay.example.com';
 if total<>22 then raise exception 'Expected 22 combined saved candidates';end if;
 job:=public.vb_begin_bcm_ai_run(target,cfg.version);
 p:=jsonb_set(payloads->0,'{observations}',jsonb_build_array((payloads->0->'observations'->3),jsonb_build_object('name','BCM Replay Fresh Offering','name_key','bcm replay fresh offering','kind','product','context','Synthetic later observation','passage','BCM Replay Fresh Offering','url','https://baseline-replay.example.com/evidence')));
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false);
 if not exists(select 1 from public.vb_bcm_ai_observations where client_id=target and domain='baseline-replay.example.com' and name_key='bcm replay fresh offering' and state='needs_review') then raise exception 'Later unfamiliar name not queued';end if;
 if (select count(*) from public.vb_bcm_ai_observations where client_id=target and domain='baseline-replay.example.com' and name_key='dots')<>1 or not exists(select 1 from public.vb_bcm_ai_observations where client_id=target and domain='baseline-replay.example.com' and name_key='dots' and state='known') then raise exception 'Repeated baseline name duplicated/alerted';end if;
 if exists(select 1 from public.vb_bcm_ai_publications where client_id=target) then raise exception 'Expected no prior publications; inspect before this fixture';end if;
 select user_id into reviewer from vb_private.staff_members where active limit 1;
 if reviewer is null then raise exception 'Existing reviewer required';end if;
 select id into finding from public.vb_bcm_ai_observations where client_id=target and domain='baseline-replay.example.com' and name_key='dots';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated','aal','aal2')::text,true);
 perform public.vb_review_bcm_ai_finding(finding,(select revision from public.vb_bcm_ai_observations where id=finding),'approve','ROLLBACK FIXTURE ONLY',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
end;$verify$;
set local role authenticated;
do $$ begin
 if (select count(*) from public.vb_bcm_ai_publications where client_id='10000000-0000-0000-0000-000000000001' and name='Dots')<>1 then raise exception 'Approved snapshot not client-readable';end if;
 if exists(select 1 from public.vb_bcm_ai_observations) then raise exception 'Raw findings exposed to client';end if;
end;$$;
reset role;
do $$ declare reviewer uuid; actor uuid; finding uuid; rev integer; begin
 select user_id into reviewer from vb_private.staff_members where active limit 1;
 select user_id into actor from vb_private.client_memberships where client_id='10000000-0000-0000-0000-000000000001' and active limit 1;
 select id,revision into finding,rev from public.vb_bcm_ai_observations where client_id='10000000-0000-0000-0000-000000000001' and domain='baseline-replay.example.com' and name_key='dots';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated','aal','aal2')::text,true);
 perform public.vb_review_bcm_ai_finding(finding,rev,'dismiss','WITHDRAW ROLLBACK FIXTURE ONLY',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
end;$$;
set local role authenticated;
do $$ begin if exists(select 1 from public.vb_bcm_ai_publications where client_id='10000000-0000-0000-0000-000000000001') then raise exception 'Withdrawn snapshot still client-visible';end if;end;$$;
reset role;
rollback to savepoint review_fixture;
commit;
select true as rollout_applied,true as monthly_budget_verified,true as approved_snapshot_verified,true as fixtures_rolled_back,true as no_api_calls;
