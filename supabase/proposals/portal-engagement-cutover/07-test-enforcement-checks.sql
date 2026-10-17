-- Prepared, NOT run. Real role/RLS/RPC/worker tests; all fixtures and lifecycle edits roll back.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
 if (select count(*) from vb_private.legacy_test_mappings where enforcement_enabled)<>4 then raise exception 'Apply complete cutover before these checks'; end if;
end $$;
create temporary table enforcement_results(label text,passed boolean) on commit drop;
grant insert,select on enforcement_results to authenticated,anon,service_role;
create function pg_temp.expect(ok boolean,label text) returns void language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 insert into enforcement_results values(label,true);
end $$;
create function pg_temp.expect_error(command text,code text,label text) returns void language plpgsql as $$
declare actual text:='00000'; begin
 begin execute command; exception when others then get stacked diagnostics actual=returned_sqlstate; end;
 perform pg_temp.expect(actual=code,label||' ['||actual||']');
end $$;
create temporary table enforcement_context as
 select m.*,g.user_id as actor,(select user_id from vb_private.staff_members where active order by user_id limit 1) as staff,
 (select o.user_id from vb_private.portal_test_onboarding o where not exists(select 1 from vb_private.client_memberships old where old.user_id=o.user_id) limit 1) as member,
 (select id from public.vb_marks where client_id=m.client_id order by id limit 1) as mark_a
 from vb_private.legacy_test_mappings m join vb_private.engagement_grants g using(engagement_id)
 where m.client_id='b9100000-0000-0000-0000-000000000001';
grant select on enforcement_context to authenticated,service_role;
select pg_temp.expect((select count(*)=1 and bool_and(actor is not null and staff is not null and member is not null and mark_a is not null) from enforcement_context),'Existing fictional identities and original mark available');
-- Ready flags/budget are changed only in this uncommitted transaction to make the
-- reservation-current check meaningful. No dispatcher, HTTP worker or research is invoked.
update vb_private.bcm_scheduler_config set ready=true where singleton;
update vb_private.bcm_ai_config set ready=true,max_runs=greatest(max_runs,(select count(*)::integer+10 from public.vb_bcm_ai_runs)) where singleton;
select pg_temp.expect((select vb_private.bcm_ai_valid(c) from public.vb_bcm_settings c where c.client_id=(select client_id from enforcement_context)),'Existing fictional BCM settings valid for current-reservation test');
-- Isolate this user's lifecycle scenario without affecting any committed grant.
update vb_private.engagement_grants set status='revoked' where user_id=(select actor from enforcement_context) and engagement_id<>(select engagement_id from enforcement_context);
insert into public.vb_engagements(id,client_id,title,status,activated_at)
 select 'f1740000-0000-0000-0000-000000000001',client_id,'ROLLBACK — engagement B','active',now() from enforcement_context;
insert into public.vb_matters(id,engagement_id,title) values('f1750000-0000-0000-0000-000000000001','f1740000-0000-0000-0000-000000000001','ROLLBACK — matter B');
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at)
 select 'f1740000-0000-0000-0000-000000000001',actor,'active',now() from enforcement_context;
insert into vb_private.engagement_services select 'f1740000-0000-0000-0000-000000000001',service,true from vb_private.engagement_services where engagement_id=(select engagement_id from enforcement_context) on conflict(engagement_id,service) do nothing;
insert into public.vb_marks(id,client_id,name,mark_type,status)
 select 'f1760000-0000-0000-0000-000000000001',client_id,'ROLLBACK SCOPE B','word','not_filed' from enforcement_context;
-- Trusted fixture explicitly assigns B; normal record creation cannot self-select a scope.
update vb_private.legacy_test_record_scopes set engagement_id='f1740000-0000-0000-0000-000000000001',matter_id='f1750000-0000-0000-0000-000000000001'
 where resource='public.vb_marks' and record_key=jsonb_build_object('id','f1760000-0000-0000-0000-000000000001'::uuid);
insert into public.vb_evidence(id,client_id,mark_id,uploaded_by,kind,captured_on,notes,filename,mime_type,byte_size,content_sha256,object_path,uploaded_at)
 select 'f1770000-0000-0000-0000-000000000001'::uuid,client_id,mark_a,actor,'photo',current_date,'Synthetic A','scope-a.png','image/png',1,repeat('0',64),'rollback-scope/a.png',now() from enforcement_context
 union all select 'f1770000-0000-0000-0000-000000000002',client_id,'f1760000-0000-0000-0000-000000000001',actor,'photo',current_date,'Synthetic B','scope-b.png','image/png',1,repeat('0',64),'rollback-scope/b.png',now() from enforcement_context;
-- No file uploaded: transient metadata rows only, rolled back below.
insert into storage.objects(bucket_id,name,metadata) values('vb-evidence','rollback-scope/a.png','{"size":1,"mimetype":"image/png"}'),('vb-evidence','rollback-scope/b.png','{"size":1,"mimetype":"image/png"}');
insert into vb_private.maintenance_drafts(id,client_id,mark_id,description,window_start,window_end,deadline,next_step,status,verification_source,created_by,updated_by)
 select 'f1780000-0000-0000-0000-000000000001'::uuid,client_id,mark_a,'Synthetic A',current_date,current_date+10,current_date+10,'Test','Upcoming','Rollback fixture',staff,staff from enforcement_context
 union all select 'f1780000-0000-0000-0000-000000000002',client_id,'f1760000-0000-0000-0000-000000000001','Synthetic B',current_date,current_date+10,current_date+10,'Test','Upcoming','Rollback fixture',staff,staff from enforcement_context;
insert into public.vb_maintenance_publications(id,client_id,mark_id,description,window_start,window_end,deadline,next_step,status,draft_revision,verified_at)
 select 'f1780000-0000-0000-0000-000000000001'::uuid,client_id,mark_a,'Synthetic A',current_date,current_date+10,current_date+10,'Test','Upcoming',1,now() from enforcement_context
 union all select 'f1780000-0000-0000-0000-000000000002',client_id,'f1760000-0000-0000-0000-000000000001','Synthetic B',current_date,current_date+10,current_date+10,'Test','Upcoming',1,now() from enforcement_context;
insert into public.vb_inbox(id,recipient_id,client_id,kind,categories,frequency,period_start,source_items)
 select 'f1790000-0000-0000-0000-000000000001'::uuid,actor,client_id,'digest',array['use_history'],'weekly',now()-interval '1 week',jsonb_build_array(jsonb_build_object('source','use_history','id','f1770000-0000-0000-0000-000000000001')) from enforcement_context
 union all select 'f1790000-0000-0000-0000-000000000002',actor,client_id,'digest',array['use_history'],'weekly',now()-interval '1 week',jsonb_build_array(jsonb_build_object('source','use_history','id','f1770000-0000-0000-0000-000000000001'),jsonb_build_object('source','use_history','id','f1770000-0000-0000-0000-000000000002')) from enforcement_context;
update vb_private.legacy_test_record_scopes set engagement_id='f1740000-0000-0000-0000-000000000001',matter_id='f1750000-0000-0000-0000-000000000001'
 where resource='public.vb_inbox' and record_key=jsonb_build_object('id','f1790000-0000-0000-0000-000000000002'::uuid);
insert into public.vb_bcm_ai_runs(id,client_id,settings_version,requested_by,domain,status)
 select 'f17a0000-0000-0000-0000-000000000001',x.client_id,c.version,x.actor,vb_private.bcm_ai_domain(c.urls[1]),'running' from enforcement_context x join public.vb_bcm_settings c on c.client_id=x.client_id;
-- These settings exist only inside this rolled-back transaction; no external worker is called.
insert into vb_private.watch_settings(client_id,mark_ids,enabled,version,started_on,next_run_at)
 select client_id,array[mark_a],true,1,current_date,now() from enforcement_context
 on conflict(client_id) do update set enabled=true,next_run_at=now();
insert into public.vb_bcm_schedules(client_id,enabled,revision,settings_version,authorized_by,started_at,next_run_at)
 select x.client_id,true,1,c.version,x.actor,now(),now() from enforcement_context x join public.vb_bcm_settings c on c.client_id=x.client_id
 on conflict(client_id) do update set enabled=true,settings_version=excluded.settings_version,authorized_by=excluded.authorized_by,next_run_at=now();
insert into public.vb_digest_preferences(user_id,client_id,categories,frequency,delivery,next_due_at)
 select actor,client_id,array['use_history'],'weekly','account',now() from enforcement_context
 on conflict(user_id,client_id) do update set next_due_at=now();
select pg_temp.expect((select engagement_id from vb_private.legacy_test_record_scopes where resource='public.vb_evidence' and record_key=jsonb_build_object('id','f1770000-0000-0000-0000-000000000002'::uuid))='f1740000-0000-0000-0000-000000000001','New evidence inherits its mark matter B');
select pg_temp.expect((select count(*) from vb_private.legacy_test_mappings where enforcement_enabled)=4,'All four reviewed clients use engagement enforcement');
set local role anon;
select pg_temp.expect_error('select * from public.vb_marks','42501','Anonymous cannot read marks');
select pg_temp.expect_error('select public.vb_close_test_engagement(null,''active'')','42501','Anonymous cannot close engagements');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='member','Free Member routing preserved');
select pg_temp.expect((select count(*) from public.vb_clients)=0,'Free Member sees no clients');
select pg_temp.expect((select count(*) from public.vb_marks)=0,'Free Member sees no marks');
select pg_temp.expect((select count(*) from public.vb_inbox)=0,'Free Member sees no client inbox');
select pg_temp.expect((select count(*) from public.vb_member_companies)>0,'Free Member company remains available');
select pg_temp.expect_error('select public.vb_bcm_ai_client_history(''b9100000-0000-0000-0000-000000000001'')','42501','Member direct BCM RPC denied');
select pg_temp.expect_error('select public.vb_watch_snapshot(''b9100000-0000-0000-0000-000000000001'')','42501','Member direct Watch RPC denied');
select pg_temp.expect_error('select * from vb_private.portal_service_bindings','42501','Member cannot inspect service bindings');
select pg_temp.expect_error('select public.vb_close_test_engagement(null,''active'')','42501','Member cannot close engagements');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='client','Accepted engagement routes Client');
select pg_temp.expect((select count(*) from public.vb_evidence where id::text like 'f1770000-%')=2,'Both active engagement evidence rows visible');
select pg_temp.expect((select count(*) from storage.objects where bucket_id='vb-evidence' and name like 'rollback-scope/%')=2,'Both active evidence objects readable');
select pg_temp.expect_error('update vb_private.legacy_test_record_scopes set engagement_id=null','42501','Client cannot reassign record scope');
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.expect(public.vb_bcm_ai_run_is_current('f17a0000-0000-0000-0000-000000000001'),'Synthetic reservation is genuinely current before closure');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect_error('select public.vb_close_test_engagement((select engagement_id from enforcement_context),''active'')','42501','Staff closure requires MFA');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect_error('select public.vb_close_test_engagement((select engagement_id from enforcement_context),''closed'')','40001','Stale lifecycle update rejected');
select public.vb_close_test_engagement(engagement_id,'active') from enforcement_context;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='client','Same-client engagement B keeps Client routing');
select pg_temp.expect(not exists(select 1 from public.vb_marks where id=(select mark_a from enforcement_context)),'Closed A mark hidden despite active B');
select pg_temp.expect(exists(select 1 from public.vb_marks where id='f1760000-0000-0000-0000-000000000001'),'B mark remains visible');
select pg_temp.expect(not exists(select 1 from public.vb_evidence where id='f1770000-0000-0000-0000-000000000001'),'Closed A evidence metadata hidden');
select pg_temp.expect(exists(select 1 from public.vb_evidence where id='f1770000-0000-0000-0000-000000000002'),'B evidence remains visible');
select pg_temp.expect(not exists(select 1 from storage.objects where bucket_id='vb-evidence' and name='rollback-scope/a.png'),'Closed A evidence download authorization denied');
select pg_temp.expect(exists(select 1 from storage.objects where bucket_id='vb-evidence' and name='rollback-scope/b.png'),'B evidence download authorization preserved');
select pg_temp.expect(not exists(select 1 from public.vb_maintenance_publications where id='f1780000-0000-0000-0000-000000000001'),'Closed A maintenance hidden');
select pg_temp.expect(exists(select 1 from public.vb_maintenance_publications where id='f1780000-0000-0000-0000-000000000002'),'B maintenance preserved');
select pg_temp.expect(not exists(select 1 from public.vb_inbox where id='f1790000-0000-0000-0000-000000000001'),'Closed A saved message hidden');
select pg_temp.expect_error('select public.vb_open_inbox((select client_id from enforcement_context),''f1790000-0000-0000-0000-000000000001'')','42501','Closed A message direct RPC denied');
select pg_temp.expect(jsonb_array_length(public.vb_open_inbox((select client_id from enforcement_context),'f1790000-0000-0000-0000-000000000002')->'items')=1,'Mixed saved snapshot returns only authorized B content');
select pg_temp.expect_error('select public.vb_bcm_ai_client_history((select client_id from enforcement_context))','42501','Closed A BCM does not inherit B entitlement');
select pg_temp.expect_error('select public.vb_watch_snapshot((select client_id from enforcement_context))','42501','Closed A Watch does not inherit B entitlement');
select pg_temp.expect_error('select public.vb_generate_digest_sample((select client_id from enforcement_context),1)','42501','Closed A digest generation denied');
select pg_temp.expect_error('select public.vb_reserve_evidence(''f1770000-0000-0000-0000-000000000003'',(select client_id from enforcement_context),(select mark_a from enforcement_context),''{}''::jsonb)','42501','Closed A upload reservation denied before validation');
reset role;
select pg_temp.expect((select count(*) from public.vb_engagements e join vb_private.legacy_test_mappings m on m.engagement_id=e.id where e.client_id<>(select client_id from enforcement_context) and e.status='active')=3,'Other three client engagements remain active');
select pg_temp.expect(not exists(select 1 from public.vb_bcm_schedules where client_id=(select client_id from enforcement_context) and enabled),'Closure disables its BCM schedule');
select pg_temp.expect(not exists(select 1 from vb_private.watch_settings where client_id=(select client_id from enforcement_context) and enabled),'Closure disables its Watch schedule');
select pg_temp.expect(not exists(select 1 from public.vb_digest_preferences where client_id=(select client_id from enforcement_context) and next_due_at <> 'infinity'::timestamptz),'Closure removes its future digest due times');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select pg_temp.expect(not public.vb_bcm_ai_run_is_current('f17a0000-0000-0000-0000-000000000001'),'In-flight AI reservation invalid after closure');
select pg_temp.expect(public.vb_finish_bcm_ai_run('f17a0000-0000-0000-0000-000000000001',null,false)='failed','Late AI completion cannot publish closed A work');
select pg_temp.expect_error('select public.vb_finish_evidence(''f1770000-0000-0000-0000-000000000001'',(select actor from enforcement_context))','42501','Late upload completion denied after closure');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(exists(select 1 from public.vb_marks where id=(select mark_a from enforcement_context)),'MFA attorney retains closed A mark');
select pg_temp.expect(exists(select 1 from public.vb_evidence where id='f1770000-0000-0000-0000-000000000001'),'MFA attorney retains closed A evidence');
reset role;
update vb_private.portal_accounts set status='suspended' where user_id=(select actor from enforcement_context);
select pg_temp.expect((select status from public.vb_engagements where id='f1740000-0000-0000-0000-000000000001')='active','Suspension does not terminate engagement B');
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_portal_entry()='denied','Suspension blocks portal entry');
select pg_temp.expect(not exists(select 1 from public.vb_marks where id='f1760000-0000-0000-0000-000000000001'),'Suspension blocks direct B mark read');
reset role;
update vb_private.portal_accounts set status='active' where user_id=(select actor from enforcement_context);
select set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true) from enforcement_context;
set local role authenticated;
select public.vb_close_test_engagement('f1740000-0000-0000-0000-000000000001','active');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from enforcement_context;
set local role authenticated;
select pg_temp.expect(public.vb_account_access()='alumni','Final engagement closure produces Alumni');
select pg_temp.expect(public.vb_portal_entry()='member','Alumni routes to Member experience');
select pg_temp.expect(public.vb_session_role()='denied','Alumni cannot reuse old Client role');
select pg_temp.expect((select count(*) from public.vb_marks)=0,'Legacy membership cannot expose marks after final closure');
reset role;
select count(*) as passed_checks,bool_and(passed) as all_passed from enforcement_results;
rollback;
