-- LOCAL HARNESS ONLY. Synthetic legacy settings to exercise migration preservation.
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 ('f1a00000-0000-0000-0000-000000000001','LOCAL MIGRATION SCOPED','business','Synthetic',true),
 ('f1a00000-0000-0000-0000-000000000002','LOCAL MIGRATION LEGACY','business','Synthetic',true);
insert into public.vb_engagements(id,client_id,title,status,activated_at) values
 ('f1a10000-0000-0000-0000-000000000001','f1a00000-0000-0000-0000-000000000001','LOCAL MIGRATION','active',now());
insert into public.vb_matters(id,engagement_id,title) values('f1a20000-0000-0000-0000-000000000001','f1a10000-0000-0000-0000-000000000001','Synthetic');
insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label,enforcement_enabled) values
 ('f1a00000-0000-0000-0000-000000000001','f1a10000-0000-0000-0000-000000000001','f1a20000-0000-0000-0000-000000000001','Fictional Test mapping — October 16, 2026',true);
insert into vb_private.engagement_services values('f1a10000-0000-0000-0000-000000000001','trademark_watch',true),('f1a10000-0000-0000-0000-000000000001','portfolio',true);
insert into vb_private.portal_service_bindings values
 ('f1a00000-0000-0000-0000-000000000001','trademark_watch','f1a10000-0000-0000-0000-000000000001','f1a20000-0000-0000-0000-000000000001'),
 ('f1a00000-0000-0000-0000-000000000001','portfolio','f1a10000-0000-0000-0000-000000000001','f1a20000-0000-0000-0000-000000000001');
insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values
 ('f1a10000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','active',now());
insert into vb_private.client_memberships(client_id,user_id) values('f1a00000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000001');
insert into public.vb_marks(id,client_id,name,mark_type,status) values('f1a30000-0000-0000-0000-000000000001','f1a00000-0000-0000-0000-000000000001','LOCAL MIGRATION WORD','word','not_filed');
insert into vb_private.watch_settings(client_id,mark_ids,enabled,version,started_on,next_run_at,updated_at) values
 ('f1a00000-0000-0000-0000-000000000001',array['f1a30000-0000-0000-0000-000000000001'::uuid],true,7,current_date-5,now()+interval '3 days','2026-10-01T12:00:00Z'),
 ('f1a00000-0000-0000-0000-000000000002','{}',false,3,null,null,'2026-10-02T12:00:00Z');
insert into vb_private.watch_runs(id,client_id,coverage_from,coverage_to,status,settings_version) values
 ('f1a40000-0000-0000-0000-000000000001','f1a00000-0000-0000-0000-000000000001',current_date-6,current_date,'completed',7);

insert into vb_private.watch_findings(client_id,mark_id,serial,evidence,reason,private_note) values
 ('f1a00000-0000-0000-0000-000000000001','f1a30000-0000-0000-0000-000000000001','99170001','{"name":"LOCAL MIGRATION"}','Synthetic','LOCAL PRIVATE NOTE');
