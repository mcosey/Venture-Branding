-- SQL-only synthetic scenarios; include inside a transaction ending in ROLLBACK.
-- Uses existing Test identities; creates no Auth account and invokes no external worker/email.
create temporary table watch_compat_results(label text primary key) on commit drop;
create function pg_temp.wc_assert(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into watch_compat_results values(label);
end $$;
create function pg_temp.wc_denied(command text,expected text,label text) returns void language plpgsql as $$ declare actual text:='00000'; begin
 begin execute command; exception when others then get stacked diagnostics actual=returned_sqlstate; end;
 perform pg_temp.wc_assert(actual=expected,label||' ['||actual||']');
end $$;
create temporary table wc_ids(k text primary key,id uuid not null) on commit drop;
insert into wc_ids values
 ('a',(select id from auth.users where lower(email)='mithrilzeppelin117@gmail.com')),
 ('b',(select id from auth.users where lower(email)='mithrilzeppelin117+newclient@gmail.com')),
 ('staff',(select user_id from vb_private.staff_members where active order by user_id limit 1)),
 ('outsider',gen_random_uuid()),('client',gen_random_uuid()),('person',gen_random_uuid()),
 ('ea',gen_random_uuid()),('eb',gen_random_uuid()),('ep',gen_random_uuid()),
 ('ma',gen_random_uuid()),('mb',gen_random_uuid()),('mp',gen_random_uuid()),
 ('mark_a',gen_random_uuid()),('mark_b',gen_random_uuid()),('mark_p',gen_random_uuid()),
 ('finding_a',gen_random_uuid()),('finding_b',gen_random_uuid());
create function pg_temp.wc_id(key text) returns uuid language sql stable as $$select id from wc_ids where k=key$$;
create function pg_temp.wc_actor(key text,assurance text default 'aal1') returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.wc_id(key),'role','authenticated','aal',assurance)::text,true)::text::void;
$$;
-- Grant only temporary assertion/context access to the roles exercised below.
grant select on wc_ids to authenticated,service_role,anon;
grant select,insert on watch_compat_results to authenticated,service_role,anon;
do $$ begin execute format('grant usage on schema %I to authenticated,service_role,anon',(select nspname from pg_namespace where oid=pg_my_temp_schema())); end $$;
select pg_temp.wc_assert((select count(distinct id)=3 from wc_ids where k in('a','b','staff')),'Existing distinct Test identities available');
select set_config('request.jwt.claims','{}',true);
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 (pg_temp.wc_id('client'),'ROLLBACK WATCH COMPANY','business','Synthetic',true),
 (pg_temp.wc_id('person'),'ROLLBACK WATCH PERSON','individual','Synthetic',true);
insert into public.vb_engagements(id,client_id,title,status,activated_at) values
 (pg_temp.wc_id('ea'),pg_temp.wc_id('client'),'Synthetic Watch A','active',now()),
 (pg_temp.wc_id('eb'),pg_temp.wc_id('client'),'Synthetic Watch B','active',now()),
 (pg_temp.wc_id('ep'),pg_temp.wc_id('person'),'Synthetic Personal Watch','active',now());
insert into public.vb_matters(id,engagement_id,title) values
 (pg_temp.wc_id('ma'),pg_temp.wc_id('ea'),'Synthetic A'),(pg_temp.wc_id('mb'),pg_temp.wc_id('eb'),'Synthetic B'),(pg_temp.wc_id('mp'),pg_temp.wc_id('ep'),'Synthetic Personal');
insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label,enforcement_enabled) values
 (pg_temp.wc_id('client'),pg_temp.wc_id('ea'),pg_temp.wc_id('ma'),'Fictional Test mapping — October 16, 2026',true),
 (pg_temp.wc_id('person'),pg_temp.wc_id('ep'),pg_temp.wc_id('mp'),'Fictional Test mapping — October 16, 2026',true);
insert into vb_private.engagement_services(engagement_id,service,enabled)
 select e.id,s,true from public.vb_engagements e cross join unnest(array['portfolio','trademark_watch']) s where e.id in(pg_temp.wc_id('ea'),pg_temp.wc_id('eb'),pg_temp.wc_id('ep')) on conflict do nothing;
insert into vb_private.portal_service_bindings(client_id,service,engagement_id,matter_id)
 select m.client_id,s,m.engagement_id,m.matter_id from vb_private.legacy_test_mappings m cross join unnest(array['portfolio','trademark_watch']) s where m.client_id in(pg_temp.wc_id('client'),pg_temp.wc_id('person'));
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values
 (pg_temp.wc_id('ea'),pg_temp.wc_id('a'),'active',now()),(pg_temp.wc_id('eb'),pg_temp.wc_id('b'),'active',now()),(pg_temp.wc_id('ep'),pg_temp.wc_id('a'),'active',now());
insert into public.vb_marks(id,client_id,name,mark_type,status) values
 (pg_temp.wc_id('mark_a'),pg_temp.wc_id('client'),'ROLLBACK NEO ALPHA','word','not_filed'),
 (pg_temp.wc_id('mark_b'),pg_temp.wc_id('client'),'ROLLBACK NEO BETA','word','not_filed'),
 (pg_temp.wc_id('mark_p'),pg_temp.wc_id('person'),'ROLLBACK PERSONAL','word','not_filed');
update vb_private.legacy_test_record_scopes set engagement_id=pg_temp.wc_id('eb'),matter_id=pg_temp.wc_id('mb') where resource='public.vb_marks' and record_key=jsonb_build_object('id',pg_temp.wc_id('mark_b'));
update vb_private.watch_config set enabled=true;
select pg_temp.wc_assert(not has_table_privilege('authenticated','vb_private.watch_scope_settings','select'),'Raw scoped settings denied');
select pg_temp.wc_assert(not has_table_privilege('authenticated','vb_private.watch_scope_settings','update'),'Direct scoped settings edits denied');
select pg_temp.wc_assert(not has_function_privilege('anon','public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean)','execute'),'Anonymous scoped save denied');
select pg_temp.wc_assert(not has_function_privilege('service_role','public.vb_watch_save_scoped(uuid,uuid,uuid,integer,uuid[],boolean)','execute'),'Worker has no client-save RPC grant');
select pg_temp.wc_assert(not has_function_privilege('authenticated','vb_private.watch_scope_active(uuid)','execute'),'Private worker helper denied');
set local role anon;
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Anonymous snapshot execution denied');
reset role;
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations')=1,'Returning B opens empty setup despite old A binding');
select pg_temp.wc_assert(position(pg_temp.wc_id('ea')::text in public.vb_watch_snapshot(pg_temp.wc_id('client'))::text)=0,'B snapshot hides A identity');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('eb'),null,0,array[pg_temp.wc_id('mark_b')],false);
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'version')::integer=1,'B first save creates independent configuration');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],false)','40001','Repeated first save cannot overwrite configuration');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''ea''),null,0,array[pg_temp.wc_id(''mark_a'')],false)','42501','B cannot forge A target');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''person''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],false)','42501','Company access does not imply personal-client access');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_a''),pg_temp.wc_id(''mark_b'')],false)','22023','Mixed-scope selection rejected atomically');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,null,array[pg_temp.wc_id(''mark_b'')],false)','22023','Null version rejected');
select pg_temp.wc_denied('select public.vb_watch_save(pg_temp.wc_id(''client''),0,array[pg_temp.wc_id(''mark_b'')],false)','22023','Old singleton API cannot modify converted client');
select pg_temp.wc_denied('select public.vb_watch_run_due()','42501','Client cannot execute worker RPC');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),pg_temp.wc_id(''outsider''),1,array[pg_temp.wc_id(''mark_b'')],false)','40001','Forged configuration identity rejected');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,1,array[pg_temp.wc_id(''mark_b'')],null)','22023','Null monitoring rejected');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,1,array[pg_temp.wc_id(''mark_b''),pg_temp.wc_id(''mark_b'')],false)','22023','Duplicate selected marks rejected');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),(public.vb_watch_snapshot(pg_temp.wc_id(''client''))->''configurations''->0->''settings''->>''id'')::uuid,1,''{}''::uuid[],true)','22023','Empty selection cannot start monitoring');
select pg_temp.wc_actor('a');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('ea'),null,0,array[pg_temp.wc_id('mark_a')],true);
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'enabled')::boolean,'Original A retains independent monitoring');
select public.vb_watch_save_scoped(pg_temp.wc_id('person'),pg_temp.wc_id('ep'),null,0,array[pg_temp.wc_id('mark_p')],false);
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('person'))->'configurations')=1,'Same login has a separate personal-client configuration');
select pg_temp.wc_actor('outsider');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Unregistered/Member identity cannot open Client Watch');
select pg_temp.wc_denied('select public.vb_watch_save(pg_temp.wc_id(''client''),0,''{}''::uuid[],false)','42501','Member old save API checks access before reporting configuration state');
select pg_temp.wc_actor('staff');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Staff snapshot requires MFA');
select pg_temp.wc_actor('staff','aal2');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations')=2,'MFA staff can review both configurations');
reset role;
select set_config('request.jwt.claims','{}',true);
insert into vb_private.watch_findings(id,client_id,mark_id,serial,evidence,reason,private_note) values
 (pg_temp.wc_id('finding_a'),pg_temp.wc_id('client'),pg_temp.wc_id('mark_a'),'99170101','{"name":"Synthetic A"}','Synthetic A','NEVER EXPOSE A'),
 (pg_temp.wc_id('finding_b'),pg_temp.wc_id('client'),pg_temp.wc_id('mark_b'),'99170102','{"name":"Synthetic B"}','Synthetic B','NEVER EXPOSE B');
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_watch_review(pg_temp.wc_id('client'),pg_temp.wc_id('finding_b'),1,'approved','NEVER EXPOSE B','Approved synthetic B');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=1,'B sees its approved finding only');
select pg_temp.wc_assert(position('NEVER EXPOSE' in public.vb_watch_snapshot(pg_temp.wc_id('client'))::text)=0,'Private review notes excluded');
select pg_temp.wc_actor('staff','aal2');
select public.vb_watch_review(pg_temp.wc_id('client'),pg_temp.wc_id('finding_b'),2,'dismissed','NEVER EXPOSE B','');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=0,'Withdrawal removes approved client copy');
reset role;
select set_config('request.jwt.claims','{}',true);
-- Both grants on one account must not trigger a silent newest-configuration choice.
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values(pg_temp.wc_id('eb'),pg_temp.wc_id('a'),'active',now());
set local role authenticated;
select pg_temp.wc_actor('a');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations')=2,'Both active grants return both authorized configurations');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.engagement_grants set status='revoked' where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('a');
-- A revoked account cannot edit or schedule a retained configuration.
-- Ten marks across active configurations, not ten per configuration.
create temporary table wc_more_marks(id uuid primary key) on commit drop;
insert into wc_more_marks select gen_random_uuid() from generate_series(1,9);
insert into public.vb_marks(id,client_id,name,mark_type,status) select id,pg_temp.wc_id('client'),'ROLLBACK CAP '||row_number() over(),'word','not_filed' from wc_more_marks;
grant select on wc_more_marks to authenticated;
set local role authenticated;
select pg_temp.wc_actor('a');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('ea'),(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'id')::uuid,1,array(select id from wc_more_marks),false);
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'version')::integer=2,'Nine A plus one B preserves client-wide ten-mark cap');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''ea''),(public.vb_watch_snapshot(pg_temp.wc_id(''client''))->''configurations''->0->''settings''->>''id'')::uuid,2,array(select id from wc_more_marks union all select pg_temp.wc_id(''mark_a'')),false)','22023','Additional configuration cannot multiply ten-mark limit');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('ea'),(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'id')::uuid,2,array[pg_temp.wc_id('mark_a')],true);
select pg_temp.wc_actor('b');
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'version')::integer=1,'A updates never overwrite B');
select public.vb_watch_save_scoped(pg_temp.wc_id('client'),pg_temp.wc_id('eb'),(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'id')::uuid,1,array[pg_temp.wc_id('mark_b')],true);
reset role;
select set_config('request.jwt.claims','{}',true);
-- Exercise actual matching SQL, not an external HTTP worker. Isolate due candidates only
-- inside this rollback transaction; do not persist schedule/source fixture changes.
select pg_advisory_xact_lock(73772131);
update vb_private.watch_scope_settings set next_run_at=now()+interval '1 year' where enabled and client_id<>pg_temp.wc_id('client');
update vb_private.watch_settings set next_run_at=now()+interval '1 year' where enabled;
insert into vb_private.watch_files(filename,revision,manifest_revision,data_date,expected,completed_at)
 select 'apc'||to_char(current_date-n,'YYMMDD')||'.zip',repeat('c',64),repeat('d',64),current_date-n,0,now() from generate_series(0,6) n
 on conflict(filename,revision) do update set completed_at=now();
insert into vb_private.watch_applications(serial,name,filing_date,goods,classes,owners,status_code,file_id) values
 ('99170201','ROLLBACK NEO ALPHA',current_date,'[]','[]','[]','630',(select id from vb_private.watch_files where data_date=current_date and revision=repeat('c',64))),
 ('99170202','ROLLBACK NEO BETA',current_date,'[]','[]','[]','630',(select id from vb_private.watch_files where data_date=current_date and revision=repeat('c',64)));
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=1,'Worker processes one bounded scoped configuration');
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=1,'Worker processes second scope independently');
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=0,'Unchanged due state does not run twice');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert((select count(*) from vb_private.watch_runs where client_id=pg_temp.wc_id('client'))=2,'Each scoped configuration has its own run');
select pg_temp.wc_assert((select count(*) from vb_private.watch_findings where client_id=pg_temp.wc_id('client') and serial in('99170201','99170202'))=2,'Matching preserves mark-specific findings');
select pg_temp.wc_denied('update vb_private.watch_scope_settings set engagement_id=pg_temp.wc_id(''eb'') where engagement_id=pg_temp.wc_id(''ea'')','42501','Configuration cannot be rebound');
select pg_temp.wc_denied('update vb_private.watch_runs set configuration_id=(select id from vb_private.watch_scope_settings where engagement_id=pg_temp.wc_id(''ea'')) where configuration_id=(select id from vb_private.watch_scope_settings where engagement_id=pg_temp.wc_id(''eb''))','42501','Run identity cannot be reassigned');

set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'runs')=1,'B history excludes A runs');
reset role;
select set_config('request.jwt.claims','{}',true);
-- Incomplete sources must not be reported as a completed weekly check.
create temporary table wc_source_restore as select id,completed_at from vb_private.watch_files where data_date=current_date-3;
update vb_private.watch_files set completed_at=null where data_date=current_date-3;
update vb_private.watch_scope_settings set next_run_at=now() where engagement_id=pg_temp.wc_id('eb');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=0,'Incomplete source never reports a completed check');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_runs r join vb_private.watch_scope_settings s on s.id=r.configuration_id where s.engagement_id=pg_temp.wc_id('eb') and r.status='incomplete'),'Incomplete attempt belongs to B configuration');
select pg_temp.wc_assert((select count(*) from vb_private.watch_findings where client_id=pg_temp.wc_id('client'))=4,'Incomplete check creates no fabricated findings');
update vb_private.watch_files f set completed_at=r.completed_at from wc_source_restore r where f.id=r.id;
-- A source revision withdraws only the affected scope's published evidence.
insert into wc_ids select 'worker_b',id from vb_private.watch_findings where client_id=pg_temp.wc_id('client') and serial='99170202';
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_watch_review(pg_temp.wc_id('client'),pg_temp.wc_id('worker_b'),1,'approved','NEVER EXPOSE WORKER B','Synthetic match reviewed');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=1,'Reviewed worker match is published to its authorized scope');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.watch_applications set name='ROLLBACK NEO BETA!' where serial='99170202';
update vb_private.watch_scope_settings set next_run_at=now() where engagement_id=pg_temp.wc_id('eb');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.wc_assert((public.vb_watch_run_due()->>'completed_clients')::integer=1,'Revised source rechecks only its due scoped configuration');
reset role;
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'findings')=0,'Source revision withdraws the prior approved copy');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.watch_scope_settings set next_run_at=now() where engagement_id=pg_temp.wc_id('eb');
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'B is genuinely due before access revocation tests');
update vb_private.portal_accounts set status='suspended' where user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Suspended account cannot authorize a queued worker');
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Suspension blocks snapshot');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],true)','42501','Suspension blocks saving before touching settings');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.portal_accounts set status='active' where user_id=pg_temp.wc_id('b');
update vb_private.engagement_grants set status='revoked' where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Revoked last grant removes B from the queue');
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Revoked grant blocks snapshot');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.engagement_grants set status='invited',accepted_at=null where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Unaccepted grant cannot authorize the worker');
set local role authenticated;
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Unaccepted grant blocks snapshot');
reset role;
select set_config('request.jwt.claims','{}',true);
update vb_private.engagement_grants set status='active',accepted_at=now() where engagement_id=pg_temp.wc_id('eb') and user_id=pg_temp.wc_id('b');
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_due_configurations() where engagement_id=pg_temp.wc_id('eb')),'Restored accepted grant restores only B worker eligibility');
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_close_test_engagement(pg_temp.wc_id('ea'),'active');
select pg_temp.wc_actor('a');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Closed A cannot inherit B configuration');
select pg_temp.wc_actor('b');
select pg_temp.wc_assert((public.vb_watch_snapshot(pg_temp.wc_id('client'))->'configurations'->0->'settings'->>'enabled')::boolean,'Closing A leaves B monitoring enabled');
select pg_temp.wc_assert(jsonb_array_length(public.vb_watch_snapshot(pg_temp.wc_id('client'))->'runs')=3,'Closing A preserves B history');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert(exists(select 1 from vb_private.watch_scope_settings where engagement_id=pg_temp.wc_id('ea') and not enabled and next_run_at is null),'Closing A stops only its new scoped schedule');
select pg_temp.wc_assert((select count(*) from vb_private.watch_runs where client_id=pg_temp.wc_id('client'))=4,'Closed history retained');
select pg_temp.wc_assert((select count(*) from vb_private.watch_findings where client_id=pg_temp.wc_id('client'))=4,'Closed findings retained');
set local role authenticated;
select pg_temp.wc_actor('staff','aal2');
select public.vb_close_test_engagement(pg_temp.wc_id('eb'),'active');
select pg_temp.wc_actor('b');
select pg_temp.wc_denied('select public.vb_watch_snapshot(pg_temp.wc_id(''client''))','42501','Final fixture closure removes Client Watch access');
select pg_temp.wc_denied('select public.vb_watch_save_scoped(pg_temp.wc_id(''client''),pg_temp.wc_id(''eb''),null,0,array[pg_temp.wc_id(''mark_b'')],true)','42501','A late save cannot restart closed Watch');
reset role;
select set_config('request.jwt.claims','{}',true);
select pg_temp.wc_assert(not exists(select 1 from vb_private.watch_due_configurations() where client_id=pg_temp.wc_id('client')),'Closed configurations cannot enter the worker queue');
select count(*) as passed_checks from watch_compat_results;
