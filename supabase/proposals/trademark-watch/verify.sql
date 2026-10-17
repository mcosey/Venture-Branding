-- Run only in the approved Test project, inside the schema installation transaction.
-- Uses existing Auth identities; creates no login or real client data. Outer wrapper rolls back all changes.
create temporary table watch_test_ids(k text primary key,id uuid);
insert into watch_test_ids values ('staff',(select user_id from vb_private.staff_members where active limit 1)),
 ('client',(select id from auth.users where not exists(select 1 from vb_private.staff_members s where s.user_id=auth.users.id) limit 1)),
 ('a',gen_random_uuid()),('b',gen_random_uuid()),('mark',gen_random_uuid());
do $$ begin if exists(select 1 from watch_test_ids where id is null) then raise exception 'Existing Test staff and nonstaff Auth identities required; do not create accounts automatically'; end if; end $$;
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled)
 select id,'WATCH ROLLBACK FIXTURE','business','Synthetic',true from watch_test_ids where k in ('a','b');
insert into vb_private.client_memberships(client_id,user_id)
 select a.id,b.id from watch_test_ids a cross join watch_test_ids b where a.k='a' and b.k='client';
insert into public.vb_marks(id,client_id,name,mark_type,status,source)
 values((select id from watch_test_ids where k='mark'),(select id from watch_test_ids where k='a'),'EXAMPLE','word','not_filed','manual');
update vb_private.watch_config set enabled=true;
insert into vb_private.watch_files(filename,revision,manifest_revision,data_date,expected,completed_at)
 select 'apc'||to_char(current_date-n,'YYMMDD')||'.zip',repeat(n::text,64),repeat(n::text,64),current_date-n,0,now() from generate_series(1,7) n;
insert into vb_private.watch_applications(serial,name,filing_date,goods,classes,owners,status_code,file_id)
 values('01234567','EXAMPLIA',current_date-1,'[{"class":"041","text":"Synthetic education services"}]','["41"]','["Synthetic applicant"]','630',
 (select id from vb_private.watch_files where data_date=current_date-1));
grant select on watch_test_ids to authenticated;
create function pg_temp.watch_assert(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'Watch check failed: %',label; end if; end $$;
create function pg_temp.watch_denied(sql_text text,expected_code text) returns void language plpgsql as $$
begin begin execute sql_text; exception when others then if sqlstate=expected_code then return; else raise; end if; end; raise exception 'Expected rejection did not occur'; end $$;
do $$ begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema())); end $$;
grant execute on function pg_temp.watch_assert(boolean,text),pg_temp.watch_denied(text,text) to authenticated;
select pg_temp.watch_assert(vb_private.watch_reason('EXAMPLE','EXAMPLIA') is not null,'close name');
select pg_temp.watch_assert(vb_private.watch_reason('EX AMPLE!','example') is not null,'normalized exact');
select pg_temp.watch_assert(vb_private.watch_reason('CAFÉ','CAFE') is null,'non-ASCII not assessed');
select pg_temp.watch_assert(vb_private.watch_reason('AB','AC') is null,'short names not fuzzy matched');
select pg_temp.watch_assert(vb_private.watch_reason('EXAMPLE','UNRELATED') is null,'unrelated excluded');
select pg_temp.watch_assert(not has_function_privilege('anon','public.vb_watch_snapshot(uuid)','execute'),'anonymous has no snapshot grant');
select pg_temp.watch_assert(not has_function_privilege('authenticated','public.vb_watch_ingest(jsonb)','execute'),'users have no ingest grant');
select pg_temp.watch_assert(not has_table_privilege('authenticated','vb_private.watch_findings','select'),'raw findings unavailable');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='client'),'role','authenticated','aal','aal1')::text,true);
select pg_temp.watch_denied(format('select public.vb_watch_snapshot(%L)',(select id from watch_test_ids where k='b')),'42501');
select public.vb_watch_save((select id from watch_test_ids where k='a'),0,array[(select id from watch_test_ids where k='mark')],true);
select pg_temp.watch_denied(format('select public.vb_watch_save(%L,0,array[%L::uuid],true)',(select id from watch_test_ids where k='a'),(select id from watch_test_ids where k='mark')),'40001');
reset role;
select public.vb_watch_run_due();
select pg_temp.watch_assert((select count(*)=1 from vb_private.watch_findings where client_id=(select id from watch_test_ids where k='a')),'one potential finding');
select pg_temp.watch_assert((select status='completed' from vb_private.watch_runs where client_id=(select id from watch_test_ids where k='a') order by checked_at desc limit 1),'complete source window');
insert into watch_test_ids select 'finding',id from vb_private.watch_findings where client_id=(select id from watch_test_ids where k='a');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='client'),'role','authenticated','aal','aal1')::text,true);
select pg_temp.watch_assert(jsonb_array_length(public.vb_watch_snapshot((select id from watch_test_ids where k='a'))->'findings')=0,'client sees no unreviewed finding');
select pg_temp.watch_denied(format('select public.vb_watch_review(%L,%L,1,''approved'',''PRIVATE'',''summary'')',(select id from watch_test_ids where k='a'),(select id from watch_test_ids where k='finding')),'42501');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='staff'),'role','authenticated','aal','aal1')::text,true);
select pg_temp.watch_denied(format('select public.vb_watch_snapshot(%L)',(select id from watch_test_ids where k='a')),'42501');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='staff'),'role','authenticated','aal','aal2')::text,true);
select public.vb_watch_review((select id from watch_test_ids where k='a'),(select id from watch_test_ids where k='finding'),1,'approved','PRIVATE NEVER CLIENT','Public summary');
select pg_temp.watch_denied(format('select public.vb_watch_review(%L,%L,1,''approved'',''PRIVATE'',''stale'')',(select id from watch_test_ids where k='a'),(select id from watch_test_ids where k='finding')),'40001');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='client'),'role','authenticated','aal','aal1')::text,true);
select pg_temp.watch_assert(jsonb_array_length(public.vb_watch_snapshot((select id from watch_test_ids where k='a'))->'findings')=1,'approved publication visible');
select pg_temp.watch_assert(position('PRIVATE' in public.vb_watch_snapshot((select id from watch_test_ids where k='a'))::text)=0,'private note excluded');
select pg_temp.watch_assert(position('version' in (public.vb_watch_snapshot((select id from watch_test_ids where k='a'))->'findings')::text)=0,'raw revision excluded');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='staff'),'role','authenticated','aal','aal2')::text,true);
select public.vb_watch_review((select id from watch_test_ids where k='a'),(select id from watch_test_ids where k='finding'),2,'dismissed','PRIVATE','');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='client'),'role','authenticated','aal','aal1')::text,true);
select pg_temp.watch_assert(jsonb_array_length(public.vb_watch_snapshot((select id from watch_test_ids where k='a'))->'findings')=0,'withdrawal removes client copy');
reset role;
-- Atomic file completion and idempotent replay.
create temporary table watch_file_test as select public.vb_watch_ingest(jsonb_build_object('action','begin','filename','apc'||to_char(current_date,'YYMMDD')||'.zip','revision',repeat('a',64),'manifest_revision',repeat('b',64),'expected',1)) manifest;
select pg_temp.watch_denied(format('select public.vb_watch_ingest(%L::jsonb)',jsonb_build_object('action','complete','file_id',(select manifest->>'id' from watch_file_test))::text),'P0001');
select public.vb_watch_ingest(jsonb_build_object('action','batch','file_id',(select manifest->>'id' from watch_file_test),'number',0,'records',jsonb_build_array(jsonb_build_object('serial','02345678','name','PUBLIC SYNTHETIC','filing_date',current_date,'goods','[]'::jsonb,'classes','[]'::jsonb,'owners','[]'::jsonb,'status_code','630'))));
select public.vb_watch_ingest(jsonb_build_object('action','batch','file_id',(select manifest->>'id' from watch_file_test),'number',0,'records',jsonb_build_array(jsonb_build_object('serial','02345678','name','PUBLIC SYNTHETIC','filing_date',current_date,'goods','[]'::jsonb,'classes','[]'::jsonb,'owners','[]'::jsonb,'status_code','630'))));
select pg_temp.watch_assert((select received=1 from vb_private.watch_files where id=(select (manifest->>'id')::uuid from watch_file_test)),'duplicate batch counted once');
select pg_temp.watch_assert(not exists(select 1 from vb_private.watch_applications where serial='02345678'),'staged file invisible before completion');
select public.vb_watch_ingest(jsonb_build_object('action','complete','file_id',(select manifest->>'id' from watch_file_test)));
select public.vb_watch_ingest(jsonb_build_object('action','complete','file_id',(select manifest->>'id' from watch_file_test)));
select pg_temp.watch_assert((select count(*)=1 from vb_private.watch_applications where serial='02345678'),'completed file replay deduplicated');

-- Deduplication, missing-source handling and source changes.
update vb_private.watch_settings set next_run_at=now() where client_id=(select id from watch_test_ids where k='a');
select public.vb_watch_run_due();
select pg_temp.watch_assert((select count(*)=1 from vb_private.watch_findings where client_id=(select id from watch_test_ids where k='a')),'repeat check deduplicated');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='staff'),'role','authenticated','aal','aal2')::text,true);
select public.vb_watch_review((select id from watch_test_ids where k='a'),(select id from watch_test_ids where k='finding'),3,'approved','PRIVATE','Current public snapshot');
reset role;
update vb_private.watch_applications set name='UNRELATED' where serial='01234567';
update vb_private.watch_settings set next_run_at=now() where client_id=(select id from watch_test_ids where k='a');
select public.vb_watch_run_due();
select pg_temp.watch_assert((select review_status='unreviewed' and evidence->>'name'='UNRELATED' and publication is null from vb_private.watch_findings where id=(select id from watch_test_ids where k='finding')),'changed source resets review even when no longer matches');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from watch_test_ids where k='client'),'role','authenticated','aal','aal1')::text,true);
select pg_temp.watch_assert(jsonb_array_length(public.vb_watch_snapshot((select id from watch_test_ids where k='a'))->'findings')=0,'source change withdraws an approved client snapshot');
reset role;
update vb_private.watch_files set completed_at=null where data_date=current_date-3;
update vb_private.watch_settings set next_run_at=now() where client_id=(select id from watch_test_ids where k='a');
select public.vb_watch_run_due();
select pg_temp.watch_assert((select status='incomplete' from vb_private.watch_runs where client_id=(select id from watch_test_ids where k='a') order by checked_at desc,id desc limit 1),'missing date never completed');
select 'Watch verification reached end; outer wrapper must ROLLBACK' as result;
