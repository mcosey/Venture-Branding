-- Run AFTER approved Test setup. Uses two existing client identities and existing MFA staff.
-- All synthetic observations/settings/reviews are rolled back, including their audit rows.
-- No API calls, new accounts, passwords or external website requests.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required'; end if;
end; $$;
do $$
<<verify>>
declare a uuid; b uuid; ua uuid; ub uuid; staff uuid; cfg public.vb_bcm_settings; job jsonb; p jsonb;
 finding uuid; alias_id uuid; revision integer; count_before bigint; checks integer:=0;
begin
 select m.client_id,m.user_id into a,ua from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id
 where m.active and c.portal_enabled and c.archived_at is null and not exists(select 1 from vb_private.staff_members where user_id=m.user_id) order by m.client_id,m.user_id limit 1;
 select m.client_id,m.user_id into b,ub from vb_private.client_memberships m join public.vb_clients c on c.id=m.client_id
 where m.active and c.portal_enabled and c.archived_at is null and m.client_id<>a and m.user_id<>ua
 and not exists(select 1 from vb_private.staff_members where user_id=m.user_id) order by m.client_id,m.user_id limit 1;
 select user_id into staff from vb_private.staff_members where active limit 1;
 if a is null or b is null or staff is null then raise exception 'Two existing Test clients and one existing active staff identity required'; end if;
 if not has_function_privilege('service_role','public.vb_finish_bcm_ai_run(uuid,jsonb,boolean)','EXECUTE')
 or has_function_privilege('authenticated','public.vb_finish_bcm_ai_run(uuid,jsonb,boolean)','EXECUTE')
 or has_function_privilege('anon','public.vb_begin_bcm_ai_run(uuid,integer)','EXECUTE') then raise exception 'Worker privilege failure'; end if; checks:=checks+1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 begin perform public.vb_bcm_ai_client_history(b);raise exception 'Cross-client history allowed';exception when insufficient_privilege then checks:=checks+1;end;
 select * into cfg from public.vb_bcm_settings where client_id=a;
 perform public.vb_save_bcm_settings(a,coalesce(cfg.version,0),jsonb_build_object('urls',jsonb_build_array('https://example.com/'),'exclusions','[]'::jsonb,'access_mode','public','frequency','weekly','categories',jsonb_build_array('product_names','feature_names'),'discovery_mode','site'),true);
 select * into cfg from public.vb_bcm_settings where client_id=a;
 update vb_private.bcm_ai_config set ready=false;
 begin perform public.vb_begin_bcm_ai_run(a,cfg.version);raise exception 'Disabled research allowed';exception when raise_exception then if SQLERRM<>'Test not connected' then raise;end if;checks:=checks+1;end;
 update vb_private.bcm_ai_config set ready=true,max_runs=20;
 update vb_private.bcm_scheduler_config set ready=true;
 -- Allow only this transaction's small synthetic matrix, below the configured production-independent Test ceiling.
 if (select count(*) from public.vb_bcm_ai_runs)>12 then raise exception 'Insufficient remaining Test attempts for this rollback matrix'; end if;
 job:=public.vb_begin_bcm_ai_run(a,cfg.version);
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 p:=jsonb_build_object('source','openai-observations-v1','model','gpt-6-luna','domain','example.com','coverage','limited','coverage_note','Synthetic rollback evidence','consulted_urls',jsonb_build_array('https://example.com/'),'usage','{}'::jsonb,'observations',jsonb_build_array(jsonb_build_object('name','BCM Test Anchor','name_key','bcm test anchor','kind','product','context','Synthetic baseline','passage','BCM Test Anchor exists.','url','https://example.com/')));
 if public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false)<>'completed' then raise exception 'Baseline failure';end if;
 if not exists(select 1 from public.vb_bcm_ai_observations where client_id=a and name_key='bcm test anchor' and state='known') then raise exception 'Baseline mislabeled new';end if;checks:=checks+1;
 -- Complete the two remaining baseline passes before testing later discoveries.
 for revision in 1..2 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
  job:=public.vb_begin_bcm_ai_run(a,cfg.version);
  perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
  perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,jsonb_set(p,'{observations}','[]'::jsonb),false);
 end loop;
 -- Repeated finalization must neither write another finding nor consume another reservation.
 if public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false)<>'completed' then raise exception 'Non-idempotent finish';end if;checks:=checks+1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 job:=public.vb_begin_bcm_ai_run(a,cfg.version);
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 p:=jsonb_set(p,'{observations}',jsonb_build_array(jsonb_build_object('name','BCM Test Focus','name_key','bcm test focus','kind','feature','context','First observation after baseline','passage','BCM Test Focus is available.','url','https://example.com/')));
 perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false);
 select id,o.revision into finding,revision from public.vb_bcm_ai_observations o where client_id=a and name_key='bcm test focus' and state='needs_review';
 if finding is null then raise exception 'New observation missing';end if;checks:=checks+1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 begin perform public.vb_review_bcm_ai_finding(finding,revision,'approve','Unauthorized client');raise exception 'Client approved finding';exception when insufficient_privilege then checks:=checks+1;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal1')::text,true);
 begin perform public.vb_review_bcm_ai_finding(finding,revision,'approve','Missing MFA');raise exception 'Non-MFA approval allowed';exception when insufficient_privilege then checks:=checks+1;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true);
 perform public.vb_review_bcm_ai_finding(finding,revision,'approve','Synthetic reviewed update');
 if not exists(select 1 from public.vb_bcm_ai_publications where finding_id=finding and withdrawn_at is null) then raise exception 'Publication missing';end if;checks:=checks+1;
 begin perform public.vb_review_bcm_ai_finding(finding,revision,'dismiss','Stale review');raise exception 'Stale review allowed';exception when serialization_failure then checks:=checks+1;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 job:=public.vb_begin_bcm_ai_run(a,cfg.version);
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 p:=jsonb_set(p,'{observations,0,passage}','"BCM Test Focus has a different supporting sentence."');
 perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false);
 if (select count(*) from public.vb_bcm_ai_observations where client_id=a and name_key='bcm test focus')<>1
 or (select passage from public.vb_bcm_ai_publications where finding_id=verify.finding) is distinct from 'BCM Test Focus is available.' then raise exception 'Duplicate or silent publication rewrite';end if;checks:=checks+1;
 -- Reject off-domain evidence without committing anything from the malformed payload.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 job:=public.vb_begin_bcm_ai_run(a,cfg.version);
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 begin
  perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,jsonb_set(p,'{observations,0,url}','"https://elsewhere.com/"'),false);
  raise exception 'Off-domain evidence saved';
 exception when raise_exception then if SQLERRM<>'Evidence outside saved scope' then raise;end if;checks:=checks+1;end;
 p:=jsonb_set(p,'{observations}',jsonb_build_array(jsonb_build_object('name','BCM Test Focus Alias','name_key','bcm test focus alias','kind','feature','context','Synthetic name variation','passage','BCM Test Focus Alias is another spelling.','url','https://example.com/')));
 perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false);
 select id,o.revision into alias_id,revision from public.vb_bcm_ai_observations o where client_id=a and name_key='bcm test focus alias';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true);
 begin perform public.vb_review_bcm_ai_finding(alias_id,revision,'alias','Self-link blocked',alias_id);raise exception 'Self alias allowed';
 exception when raise_exception then if SQLERRM<>'Choose another canonical finding for the same client and website' then raise;end if;checks:=checks+1;end;
 perform public.vb_review_bcm_ai_finding(alias_id,revision,'alias','Same synthetic asset',finding);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 job:=public.vb_begin_bcm_ai_run(a,cfg.version);
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false);
 if (select count(*) from public.vb_bcm_ai_observations where client_id=a and name_key='bcm test focus alias')<>1
 or not exists(select 1 from public.vb_bcm_ai_observations where id=alias_id and alias_of=verify.finding and state='dismissed') then raise exception 'Alias forgotten';end if;checks:=checks+1;
 -- Exact portfolio names remain known rather than creating duplicate alerts.
 insert into public.vb_marks(client_id,name,mark_type,status) values(a,'BCM Test Registered','word','pending');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 job:=public.vb_begin_bcm_ai_run(a,cfg.version);
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 p:=jsonb_set(p,'{observations}',jsonb_build_array(jsonb_build_object('name','BCM Test Registered','name_key','bcm test registered','kind','product','context','Synthetic portfolio match','passage','BCM Test Registered is available.','url','https://example.com/')));
 perform public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false);
 if not exists(select 1 from public.vb_bcm_ai_observations where client_id=a and name_key='bcm test registered' and state='known' and matched_mark is not null) then raise exception 'Portfolio match duplicated';end if;checks:=checks+1;
 -- Changed settings discard an in-flight result.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ua,'role','authenticated','aal','aal2')::text,true);
 job:=public.vb_begin_bcm_ai_run(a,cfg.version);
 perform public.vb_save_bcm_settings(a,cfg.version,jsonb_build_object('urls',jsonb_build_array('https://example.com/'),'exclusions','[]'::jsonb,'access_mode','public','frequency','monthly','categories',jsonb_build_array('feature_names'),'discovery_mode','site'),true);
 perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
 if public.vb_finish_bcm_ai_run((job->>'ticket')::uuid,p,false)<>'discarded' then raise exception 'Stale settings result persisted';end if;checks:=checks+1;
 raise notice '% rollback checks passed; no fixture changes will persist',checks;
end; $$;
-- Actual RLS assertions with a restricted database role, not a security-definer simulation.
create temporary table bcm_ai_rls_context as select m.client_id,m.user_id from vb_private.client_memberships m
 join public.vb_clients c on c.id=m.client_id where m.active and c.portal_enabled and c.archived_at is null
 and not exists(select 1 from vb_private.staff_members where user_id=m.user_id) order by m.client_id limit 1;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated','aal','aal1')::text,true) from bcm_ai_rls_context;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.vb_bcm_ai_observations) or exists(select 1 from public.vb_bcm_ai_reviews) or exists(select 1 from public.vb_bcm_ai_runs) then raise exception 'Raw AI data visible to client';end if;
 if exists(select 1 from public.vb_bcm_ai_publications where not vb_private.is_client_member(client_id) or withdrawn_at is not null) then raise exception 'Cross-client publication visible';end if;
 raise notice 'Client raw-data and publication RLS checks passed';
end; $$;
reset role;
rollback;
