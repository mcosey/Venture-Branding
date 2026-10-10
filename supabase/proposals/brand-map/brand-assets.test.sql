-- UNRUN. Synthetic fixtures; run only in an approved disposable database.
-- Apply the draft there first. All fixtures and assertions roll back.
begin;
do $$ begin
  if current_database() <> 'venture_brand_map_test'
    or current_setting('vb_brand_map.test_approved',true) is distinct from 'local-disposable' then
    raise exception 'Privacy tests require an explicitly approved disposable Brand Map test database.';
  end if;
end $$;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

create function pg_temp.fixture_id(kind integer, n integer) returns uuid
language sql immutable as $$ select ('f000000' || kind::text || '-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid $$;
create function pg_temp.business_fields(asset_name text, use_state text default 'in_use') returns jsonb
language sql immutable as $$ select jsonb_build_object('name',asset_name,'kind','product','description','','business_use',use_state) $$;
create function pg_temp.asset(n integer) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'assets') item
    where item->>'id' = pg_temp.fixture_id(3,n)::text
$$;
create function pg_temp.link(n integer) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'legal_links') item
    where item->>'asset_id' = pg_temp.fixture_id(3,n)::text
$$;
create function pg_temp.relationship(n integer) returns jsonb language sql as $$
  select item from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'relationships') item
    where item->>'child_asset_id' = pg_temp.fixture_id(3,n)::text
$$;
create function pg_temp.mark_identity(n integer) returns jsonb language sql as $$
  select jsonb_build_object('client_id',item->'client_id','name',item->'name','mark_type',item->'mark_type','record_owner',item->'record_owner')
    from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'marks') item
    where item->>'id' = pg_temp.fixture_id(4,n)::text
$$;
create function pg_temp.claims(n integer, assurance text default 'aal1') returns text language sql as $$
  select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.fixture_id(2,n),'role','authenticated','aal',assurance)::text,true)
$$;
do $$ declare temp_schema text; begin
  select nspname into temp_schema from pg_namespace where oid=pg_my_temp_schema();
  execute format('grant usage on schema %I to anon, authenticated',temp_schema);
  execute format('grant execute on all functions in schema %I to anon, authenticated',temp_schema);
end $$;

insert into auth.users(id,email) select pg_temp.fixture_id(2,n),'brand-map-fixture-' || n || '@example.invalid' from generate_series(1,4) n;
insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled)
  select pg_temp.fixture_id(1,n),'Brand Map test client ' || n,'business','Test contact',true from generate_series(1,3) n;
insert into vb_private.client_memberships(client_id,user_id) values
  (pg_temp.fixture_id(1,1),pg_temp.fixture_id(2,1)),
  (pg_temp.fixture_id(1,2),pg_temp.fixture_id(2,2)),
  (pg_temp.fixture_id(1,3),pg_temp.fixture_id(2,1)),
  (pg_temp.fixture_id(1,1),pg_temp.fixture_id(2,4));
insert into vb_private.staff_members(user_id) values(pg_temp.fixture_id(2,3)),(pg_temp.fixture_id(2,4));
insert into public.vb_brand_assets(id,client_id,name,kind,business_use,source_kind)
  select pg_temp.fixture_id(3,n),pg_temp.fixture_id(1,case when n=4 then 2 else 1 end),
    'Asset ' || n,'product','in_use','manual_client' from generate_series(1,4) n;
insert into public.vb_marks(id,client_id,name,mark_type,status,record_owner) values
  (pg_temp.fixture_id(4,1),pg_temp.fixture_id(1,1),'INACTIVE TEST MARK','word','inactive','Test Owner'),
  (pg_temp.fixture_id(4,2),pg_temp.fixture_id(1,1),'SECOND TEST MARK','logo','pending','Test Owner'),
  (pg_temp.fixture_id(4,3),pg_temp.fixture_id(1,2),'PRIVATE B MARK','word','registered','Private B Owner');

select ok((select bool_and(relrowsecurity) from pg_class where oid in
  ('public.vb_brand_assets'::regclass,'public.vb_brand_relationships'::regclass,'public.vb_brand_legal_links'::regclass)), 'RLS enabled on every new table');
select ok(not has_table_privilege('authenticated',table_name,permission),table_name || ' denies direct ' || permission)
  from unnest(array['public.vb_brand_assets','public.vb_brand_relationships','public.vb_brand_legal_links']) table_name
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) permission;
select is((select count(*) from public.vb_brand_relationships),4::bigint,'Every asset has a relationship slot');
select is((select count(*) from public.vb_brand_legal_links),4::bigint,'Every asset has a legal slot');
select ok(not has_function_privilege('anon',rpc,'EXECUTE'),'Anonymous execution denied for ' || rpc)
  from unnest(array['public.vb_read_brand_map(uuid)','public.vb_save_brand_asset(uuid,uuid,bigint,jsonb)',
    'public.vb_set_brand_parent(uuid,uuid,uuid,bigint)','public.vb_confirm_brand_relationship(uuid,uuid,bigint)',
    'public.vb_review_brand_legal_link(uuid,uuid,uuid,bigint,bigint,jsonb)']) rpc;

set local role anon;
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Anonymous read denied');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''No''))','42501',null,'Anonymous write denied');
select throws_ok('select * from public.vb_brand_assets','42501',null,'Anonymous raw read denied');
reset role;

set local role authenticated;
select pg_temp.claims(1);
select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'assets')::integer,3,'Client A receives only its three assets');
select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'legal_records')::integer,2,'Client A legal count excludes Client B');
select is((public.vb_read_brand_map(pg_temp.fixture_id(1,3))->'counts'->>'assets')::integer,0,'Authorized empty map has zero assets');
select is(public.vb_read_brand_map(pg_temp.fixture_id(1,3))->'marks','[]'::jsonb,'Authorized empty portfolio has no fabricated marks');
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,2))','42501','Brand Map unavailable for this account.','Client A cannot read/count/search B');
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,99))','42501','Brand Map unavailable for this account.','Missing workspace returns same denial');
select throws_ok('select * from public.vb_brand_assets','42501',null,'Client cannot read raw asset table');
select throws_ok('select * from public.vb_brand_relationships','42501',null,'Client cannot read raw confirmation actors');
select throws_ok('select * from public.vb_brand_legal_links','42501',null,'Client cannot read raw legal reviewers/fingerprints');
select throws_ok('update public.vb_brand_assets set name=''Forged''','42501',null,'Direct update denied');
select throws_ok('delete from public.vb_brand_assets','42501',null,'Permanent deletion denied');
select throws_ok('select vb_private.brand_map_lock_write(pg_temp.fixture_id(1,1))','42501',null,'Private privileged helper not callable');
select is((select count(*) from vb_private.audit_events),0::bigint,'Client sees no protected audit history');
select ok(public.vb_read_brand_map(pg_temp.fixture_id(1,1))::text !~ 'confirmed_by"|reviewed_by"|reviewed_mark_fingerprint|previous_data|current_data','Response excludes actor IDs, fingerprint, and history');

select throws_ok(format('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,%L::jsonb)',
  (pg_temp.business_fields('Spoof') || jsonb_build_object(field,'forged'))::text),
  '22023','Invalid Brand Map business fields.','Asset form rejects forged ' || field)
  from unnest(array['client_id','mark_id','asset_id','source_reference','source_kind','actor_id','confirmed_by','state','reviewed_by','version','identity_revision']) field;
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,''[]''::jsonb)','22023',null,'Array payload rejected');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,''{"name":"Partial"}''::jsonb)','22023',null,'Incomplete form rejected');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''   ''))','22023',null,'Blank name rejected');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(repeat(''x'',201)))','22023',null,'Overlong name rejected');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Long'') || jsonb_build_object(''description'',repeat(''x'',2001)))','22023',null,'Overlong description rejected');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Wrong'') || ''{"kind":null}''::jsonb)','22023',null,'Null enum rejected');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,4),1,pg_temp.business_fields(''B overwrite''))','42501','Brand Map unavailable for this account.','Client A cannot edit B asset');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,2),null,null,pg_temp.business_fields(''B create''))','42501','Brand Map unavailable for this account.','Client A cannot create inside B');
select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''<script>alert(1)</script>''))','Script-like name stored as text, not executed by SQL');
select ok(exists(select 1 from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'assets') a
  where a->>'name'='<script>alert(1)</script>' and a->>'source_kind'='manual_client' and (a->>'version')::integer=1),'Created asset has authentic source and initial version');

select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),1,pg_temp.business_fields(''Asset 1'',''inactive''))','Business-use edit succeeds');
select is((pg_temp.asset(1)->>'version')::integer,2,'Every save advances version');
select is((pg_temp.asset(1)->>'identity_revision')::integer,1,'Business use alone preserves identity');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),1,pg_temp.business_fields(''Lost edit''))','40001',null,'Stale expected version denied');
select is(pg_temp.asset(1)->>'name','Asset 1','Stale save cannot overwrite name');
select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),2,pg_temp.business_fields(''Renamed asset''))','Identity edit succeeds');
select is((pg_temp.asset(1)->>'identity_revision')::integer,2,'Identity revision advances on name change');

select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,4),1)','42501','Brand Map unavailable for this account.','Foreign parent denied');
select throws_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,4),1)','42501','Brand Map unavailable for this account.','Foreign confirmation denied');
select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,1),1)','22023',null,'Self-parent denied');
select throws_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),1)','22023',null,'Root cannot be confirmed as an edge');
select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,2),1)','First parent creates proposed edge');
select is(pg_temp.relationship(1)->>'state','proposed','New edge is proposed');
select lives_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),2)','Exact current edge can be confirmed');
select is(pg_temp.relationship(1)->>'confirmed_by_role','client','Business confirmation has client label');
select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,3),3)','Parent change succeeds');
select is(pg_temp.relationship(1)->>'state','proposed','Parent change resets confirmation');
select is(pg_temp.relationship(1)->'confirmed_at','null'::jsonb,'Old confirmation absent from current edge');
select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,4)','Parent can be cleared');
select is(pg_temp.relationship(1)->'state','null'::jsonb,'Cleared edge has no confirmation state');
select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(3,2),5)','First edge of longer chain');
select lives_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,2),pg_temp.fixture_id(3,3),1)','Second edge of longer chain');
select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,3),pg_temp.fixture_id(3,1),1)','22023',null,'Three-node proposed cycle denied');
select throws_ok('select public.vb_set_brand_parent(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,5)','40001',null,'Stale parent edit denied');
select throws_ok('select public.vb_confirm_brand_relationship(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),5)','40001',null,'Stale confirmation denied');

select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,pg_temp.mark_identity(1))','42501','Brand Map unavailable for this account.','Client cannot review legal links');
select pg_temp.claims(3);
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Staff without MFA cannot read map');
select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,null)','42501',null,'Staff without MFA cannot review link');
select pg_temp.claims(4);
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Dual membership cannot bypass staff MFA');
select pg_temp.claims(3,'aal2');
select lives_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,2))','MFA staff can read other authorized workspace');
select throws_ok('select * from public.vb_brand_legal_links','42501',null,'MFA staff also uses projected reads');
select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,3),1,2,null)','42501','Brand Map unavailable for this account.','Staff cannot create cross-client legal link');
select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,4),pg_temp.fixture_id(4,1),1,1,null)','42501',null,'Staff cannot mismatch asset workspace');
select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,1,pg_temp.mark_identity(1))','40001',null,'Stale asset identity cannot be approved');
select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,pg_temp.mark_identity(1) || ''{"name":"Old name"}''::jsonb)','40001',null,'Stale mark identity cannot be approved');
select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),1,2,pg_temp.mark_identity(1))','Inactive legal record may be associated without inventing protection');
select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,2),pg_temp.fixture_id(4,1),1,1,pg_temp.mark_identity(1))','Second asset can reference same mark');
select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'linked_legal_records')::integer,1,'Repeated links count one distinct mark');
select is(pg_temp.link(1)->>'linked_record_status','inactive','Linked inactive record status stays factual');
select is(pg_temp.link(1)->>'review_state','current','Link review separate from inactive legal status');
select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,1,2,null)','40001',null,'Stale legal-link edit denied');

select pg_temp.claims(1);
select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),3,pg_temp.business_fields(''Renamed asset'',''inactive''))','Business inactivity save allowed');
select is(pg_temp.link(1)->>'review_state','current','Business inactivity does not invalidate legal identity');
select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),4,pg_temp.business_fields(''Renamed asset'',''inactive'') || ''{"description":"Changed identity"}''::jsonb)','Substantive description edit allowed');
select is(pg_temp.link(1)->>'review_state','needs_attorney_review','Substantive asset change invalidates old review');
select is(pg_temp.link(1)->>'linked_record_status','inactive','Identity change preserves factual legal status');
select pg_temp.claims(3,'aal2');
select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),2,3,pg_temp.mark_identity(1))','Staff can reconfirm current identity');
reset role;
update public.vb_marks set status='pending',uspto_status_text='Synthetic status update' where id=pg_temp.fixture_id(4,1);
set local role authenticated;
select pg_temp.claims(1);
select is(pg_temp.link(1)->>'review_state','current','Status update alone does not invalidate identity review');
select is(pg_temp.link(1)->>'linked_record_status','pending','Linked status reflects latest legal facts');
reset role;
update public.vb_marks set record_owner='Changed owner' where id=pg_temp.fixture_id(4,1);
set local role authenticated;
select pg_temp.claims(1);
select is(pg_temp.link(1)->>'review_state','needs_attorney_review','Legal owner identity change requires review');
select is(pg_temp.link(2)->>'review_state','needs_attorney_review','All associations detect changed mark identity');
reset role;
update public.vb_marks set archived_at=now() where id=pg_temp.fixture_id(4,1);
set local role authenticated;
select pg_temp.claims(3,'aal2');
select throws_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),pg_temp.fixture_id(4,1),3,3,null)','42501',null,'Archived mark unavailable for a new/reconfirmed link');
select is(pg_temp.link(1)->'linked_record_available','false'::jsonb,'Archived linked record flagged unavailable');
select is(pg_temp.link(1)->'linked_record_status','null'::jsonb,'Archived record facts withheld');
select is((public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'counts'->>'linked_legal_records')::integer,0,'Archived mark excluded from visible linked count');
select lives_ok('select public.vb_review_brand_legal_link(pg_temp.fixture_id(1,1),pg_temp.fixture_id(3,1),null,3,3,null)','Current legal link can be cleared');
select is(pg_temp.link(1)->>'review_state','not_linked','Clearing association gives accurate unlinked state');
reset role;
select is((select count(*) from public.vb_marks where id=pg_temp.fixture_id(4,1)),1::bigint,'Clearing link does not delete mark');
select ok(exists(select 1 from vb_private.audit_events where table_name='vb_brand_relationships'
  and current_data->>'child_asset_id'=pg_temp.fixture_id(3,1)::text and current_data->>'state'='confirmed'
  and actor_id=pg_temp.fixture_id(2,1)),'Protected history retains actual relationship confirmer');
select ok(exists(select 1 from vb_private.audit_events where table_name='vb_brand_legal_links'
  and previous_data->>'mark_id'=pg_temp.fixture_id(4,1)::text and current_data->>'mark_id' is null
  and actor_id=pg_temp.fixture_id(2,3)),'Protected history retains cleared link and authentic reviewer');
select throws_ok('update public.vb_brand_assets set client_id=pg_temp.fixture_id(1,2) where id=pg_temp.fixture_id(3,1)','23514',null,'Asset ownership immutable even in privileged updates');
select throws_ok('update public.vb_brand_assets set source_kind=''manual_staff'' where id=pg_temp.fixture_id(3,1)','23514',null,'Original source immutable');
select throws_ok('update public.vb_brand_relationships set parent_asset_id=pg_temp.fixture_id(3,4) where child_asset_id=pg_temp.fixture_id(3,1)','23503',null,'Composite foreign key rejects cross-client edge');
select throws_ok('update public.vb_brand_legal_links set mark_id=pg_temp.fixture_id(4,3) where asset_id=pg_temp.fixture_id(3,2)','23503',null,'Composite foreign key rejects cross-client legal association');

update vb_private.client_memberships set active=false where client_id=pg_temp.fixture_id(1,1) and user_id=pg_temp.fixture_id(2,1);
set local role authenticated;
select pg_temp.claims(1);
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Revoked membership denies read');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Revoked''))','42501',null,'Revoked membership denies write');
reset role;
update vb_private.client_memberships set active=true where client_id=pg_temp.fixture_id(1,1) and user_id=pg_temp.fixture_id(2,1);
update public.vb_clients set portal_enabled=false where id=pg_temp.fixture_id(1,1);
set local role authenticated;
select pg_temp.claims(1);
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Disabled portal denies client read');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Disabled''))','42501',null,'Disabled portal denies client write');
select pg_temp.claims(3,'aal2');
select lives_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Staff preparation''))','MFA staff can prepare active client with portal disabled');
select ok(exists(select 1 from jsonb_array_elements(public.vb_read_brand_map(pg_temp.fixture_id(1,1))->'assets') a
  where a->>'name'='Staff preparation' and a->>'source_kind'='manual_staff'),'Staff source is server assigned');
reset role;
update public.vb_clients set archived_at=now() where id=pg_temp.fixture_id(1,1);
set local role authenticated;
select pg_temp.claims(3,'aal2');
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,1))','42501',null,'Archived client unavailable to map read');
select throws_ok('select public.vb_save_brand_asset(pg_temp.fixture_id(1,1),null,null,pg_temp.business_fields(''Archived''))','42501',null,'Archived client rejects staff writes');
reset role;
update vb_private.staff_members set active=false where user_id=pg_temp.fixture_id(2,3);
set local role authenticated;
select pg_temp.claims(3,'aal2');
select throws_ok('select public.vb_read_brand_map(pg_temp.fixture_id(1,2))','42501',null,'Deactivated staff loses access despite MFA claim');
select pg_temp.claims(2);
select is((public.vb_read_brand_map(pg_temp.fixture_id(1,2))->'counts'->>'assets')::integer,1,'Client B remains isolated and untouched');
select is((public.vb_read_brand_map(pg_temp.fixture_id(1,2))->'marks'->0->>'name'),'PRIVATE B MARK','B mark remains unchanged');
reset role;
select * from finish();
rollback;
