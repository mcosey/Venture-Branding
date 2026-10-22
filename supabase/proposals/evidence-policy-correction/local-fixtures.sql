-- ISOLATED LOCAL TEST DATABASE ONLY. Not a hosted fixture/setup script.
-- The runner loads the maintained foundation/evidence SQL before these fixtures.
insert into auth.users(id,email) values
 ('ae210000-0000-0000-0000-000000000001','one@example.test'),
 ('ae210000-0000-0000-0000-000000000002','two@example.test'),
 ('ae210000-0000-0000-0000-000000000003','both@example.test'),
 ('ae210000-0000-0000-0000-000000000004','staff@example.test');
insert into vb_private.staff_members(user_id) values('ae210000-0000-0000-0000-000000000004');
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled) values
 ('be210000-0000-0000-0000-000000000001','Fictional company','business','Fixture',true),
 ('be210000-0000-0000-0000-000000000002','Fictional individual','individual','Fixture',true);
insert into vb_private.client_memberships(client_id,user_id)
select c.id,u.id from public.vb_clients c cross join auth.users u
where right(u.id::text,1) in ('3','4') or right(u.id::text,1)=right(c.id::text,1);
insert into public.vb_marks(id,client_id,name,archived_at) values
 ('ce210000-0000-0000-0000-000000000001','be210000-0000-0000-0000-000000000001','ACTIVE ONE',null),
 ('ce210000-0000-0000-0000-000000000002','be210000-0000-0000-0000-000000000002','ACTIVE TWO',null),
 ('ce210000-0000-0000-0000-000000000003','be210000-0000-0000-0000-000000000001','ARCHIVED',now());
-- Deliberately inconsistent legacy rows are inserted as the local owner. Browser
-- users cannot write these rows. The regression must not rely on mark RLS alone:
-- the dual-client user can see both marks, but must not see the mismatched row.
insert into public.vb_evidence(id,client_id,mark_id,uploaded_by,kind,captured_on,
 filename,mime_type,byte_size,content_sha256,object_path,uploaded_at,removed_at,removed_by)
select ('ee210000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
 ('be210000-0000-0000-0000-'||lpad((case when n=2 then 2 else 1 end)::text,12,'0'))::uuid,
 ('ce210000-0000-0000-0000-'||lpad((case when n in (2,3) then 2 when n=6 then 3 else 1 end)::text,12,'0'))::uuid,
 'ae210000-0000-0000-0000-000000000001','photo',current_date,
 'fixture.png','image/png',68,repeat('a',64),'fixture/'||n||'.png',
 case when n=5 then null else now() end,
 case when n=4 then now() else null end,
 case when n=4 then 'ae210000-0000-0000-0000-000000000001'::uuid else null end
from generate_series(1,7) n;
insert into storage.objects(bucket_id,name,metadata)
select 'vb-evidence',object_path,'{"size":68,"mimetype":"image/png"}'::jsonb from public.vb_evidence;
