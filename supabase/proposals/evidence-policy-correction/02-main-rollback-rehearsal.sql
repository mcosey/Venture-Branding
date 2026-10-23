-- PREPARED ONLY — separate action-time approval required before hosted execution.
-- Main Venture Branding only; no accounts, fixtures, file uploads or permanent writes.
-- A short table lock can briefly delay evidence access and mark writes.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='1s';
set local statement_timeout='10s';
do $target$
begin
 if current_database()<>'postgres' or current_user<>'postgres'
 or (select system_identifier::text from pg_control_system())<>'7690937621030482216'
 then raise exception 'Expected main Venture Branding database and postgres executor'; end if;
end;
$target$;
-- Evidence is locked before the baseline is captured. Marks cannot change while
-- their count/fingerprint is compared. Storage is read only and never written.
lock table public.vb_evidence in access exclusive mode;
lock table public.vb_marks in share mode;
create temporary table vb_evidence_rehearsal_baseline(value jsonb) on commit drop;
create function pg_temp.vb_evidence_rehearsal_snapshot() returns jsonb
language sql stable set search_path=pg_catalog,public as $snapshot$
 select jsonb_build_object(
 'policies',(select jsonb_agg(jsonb_build_object('oid',p.oid,'relation',p.polrelid,
  'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',p.polroles,
  'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.oid)
  from pg_policy p where p.polrelid in ('public.vb_evidence'::regclass,'public.vb_marks'::regclass,'storage.objects'::regclass)),
 'tables',(select jsonb_agg(jsonb_build_object('oid',c.oid,'rls',c.relrowsecurity,
  'force_rls',c.relforcerowsecurity,'owner',c.relowner,'acl',c.relacl) order by c.oid)
  from pg_class c where c.oid in ('public.vb_evidence'::regclass,'public.vb_marks'::regclass,'storage.objects'::regclass,'storage.buckets'::regclass)),
 'columns',(select jsonb_agg(jsonb_build_object('relation',a.attrelid,'number',a.attnum,
  'type',a.atttypid,'not_null',a.attnotnull,'acl',a.attacl) order by a.attrelid,a.attnum)
  from pg_attribute a where a.attnum>0 and not a.attisdropped and a.attrelid in
  ('public.vb_evidence'::regclass,'public.vb_marks'::regclass,'storage.objects'::regclass)),
 'helpers',(select jsonb_agg(jsonb_build_object('oid',p.oid,'definition',md5(pg_get_functiondef(p.oid)),
  'acl',p.proacl,'owner',p.proowner) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='vb_private' and p.proname in ('is_staff','is_client_member','can_read_evidence_object'))
  or (n.nspname='public' and p.proname in ('vb_session_role','vb_reserve_evidence','vb_finish_evidence','vb_remove_evidence'))),
 'constraints',(select jsonb_agg(jsonb_build_object('oid',c.oid,'definition',pg_get_constraintdef(c.oid)) order by c.oid)
  from pg_constraint c where c.conrelid in ('public.vb_evidence'::regclass,'public.vb_marks'::regclass,'storage.objects'::regclass)),
 'triggers',(select jsonb_agg(jsonb_build_object('oid',t.oid,'enabled',t.tgenabled,
  'definition',pg_get_triggerdef(t.oid)) order by t.oid) from pg_trigger t where t.tgrelid in
  ('public.vb_evidence'::regclass,'public.vb_marks'::regclass,'storage.objects'::regclass)),
 'bucket',(select jsonb_build_object('public',b.public,'size',b.file_size_limit,'mime',b.allowed_mime_types)
  from storage.buckets b where b.id='vb-evidence'),
 -- Only fingerprints/counts stay in a session-local temp table, never row details.
 'evidence',(select jsonb_build_object('count',count(*),'fingerprint',md5(coalesce(jsonb_agg(to_jsonb(e) order by e.id)::text,'[]'))) from public.vb_evidence e),
 'marks',(select jsonb_build_object('count',count(*),'fingerprint',md5(coalesce(jsonb_agg(to_jsonb(m) order by m.id)::text,'[]'))) from public.vb_marks m)
 );
$snapshot$;
do $posture$
declare h record; expected_count integer:=0;
begin
 if (select count(*) from pg_policy where polrelid='public.vb_evidence'::regclass)<>1
 or exists(select 1 from pg_class where oid in ('public.vb_evidence'::regclass,'public.vb_marks'::regclass,'storage.objects'::regclass) and not relrowsecurity)
 then raise exception 'Policy inventory or row security changed'; end if;
 if not exists(select 1 from storage.buckets where id='vb-evidence' and not public
  and file_size_limit=10485760 and allowed_mime_types=array['image/png','image/jpeg'])
 then raise exception 'Evidence bucket changed'; end if;
 if (select count(*) from pg_policy where polrelid='storage.objects'::regclass)<>1
 or not exists(select 1 from pg_policy where polrelid='storage.objects'::regclass
  and polname='evidence_objects_read' and polcmd='r' and polpermissive
  and polroles=array['authenticated'::regrole::oid] and polwithcheck is null
  and md5(pg_get_expr(polqual,polrelid))='cc0a360d447c0bec98d1d5cf1549648d')
 then raise exception 'Storage permission baseline changed'; end if;
 for h in select * from (values
  ('public.vb_finish_evidence(uuid,uuid)','7abd249c750b0b4d19d473d431a2467e'),
  ('public.vb_remove_evidence(uuid,uuid)','44f2f05f5c21af1d401be71f4a1fb505'),
  ('public.vb_reserve_evidence(uuid,uuid,uuid,jsonb)','6e27b06a2d9d44e815dc476c8476a837'),
  ('public.vb_session_role()','c4806152fb452db0274f35cabf407f79'),
  ('vb_private.can_read_evidence_object(text)','01b349f39b2ff28da70962c949c6dd1b'),
  ('vb_private.is_client_member(uuid)','059abfc600d5c5daeaceb0ff530a752a'),
  ('vb_private.is_staff()','1915518237df2b15289d6faf69174e5a')) v(signature,hash)
 loop
  if not exists(select 1 from pg_proc p where p.oid=to_regprocedure(h.signature)
   and md5(p.prosrc)=h.hash and p.prosecdef and p.proconfig=array['search_path=""'])
  then raise exception 'Reviewed helper changed'; end if;
  expected_count:=expected_count+1;
 end loop;
 if expected_count<>7 then raise exception 'Helper guard incomplete'; end if;
 if has_table_privilege('anon','public.vb_evidence','SELECT')
 or has_any_column_privilege('anon','public.vb_evidence','SELECT')
 or has_table_privilege('authenticated','public.vb_evidence','INSERT,UPDATE,DELETE,TRUNCATE')
 or has_any_column_privilege('authenticated','public.vb_evidence','INSERT,UPDATE')
 or has_function_privilege('anon','public.vb_finish_evidence(uuid,uuid)','EXECUTE')
 or has_function_privilege('authenticated','public.vb_finish_evidence(uuid,uuid)','EXECUTE')
 then raise exception 'Evidence write/completion grants changed'; end if;
 if exists(select 1 from public.vb_evidence e left join public.vb_marks m on m.id=e.mark_id
  where m.id is null or m.client_id is distinct from e.client_id)
 then raise exception 'Evidence relationship changed; stop without disclosing rows'; end if;
end;
$posture$;
insert into pg_temp.vb_evidence_rehearsal_baseline values(pg_temp.vb_evidence_rehearsal_snapshot());
savepoint evidence_correction;
-- BEGIN EXACT REVIEWED CORRECTION BODY (only outer BEGIN/COMMIT removed)
-- PREPARED ONLY. Hosted rehearsal/application requires separate approval.
-- Forward correction: preserve historical migrations and all other permissions.
set local search_path = pg_catalog, public;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.vb_evidence in access exclusive mode;

do $guard$
declare p record;
begin
 select * into p from pg_policy
 where polrelid='public.vb_evidence'::regclass and polname='evidence_read';
 if not found then raise exception 'Expected evidence_read policy is missing'; end if;
 if p.polcmd <> 'r' or not p.polpermissive
 or p.polroles is distinct from array['authenticated'::regrole::oid]
 or p.polwithcheck is not null
 then raise exception 'Evidence policy metadata changed; stop for review'; end if;
 if not (select relrowsecurity from pg_class where oid=p.polrelid)
 or not (select relrowsecurity from pg_class where oid='public.vb_marks'::regclass)
 then raise exception 'Expected evidence/mark row security is disabled'; end if;
 -- Compare the installed, parsed expression, not the ambiguous migration text.
 -- A repeat application or any intervening policy edit must stop for review.
 if regexp_replace(pg_get_expr(p.polqual,p.polrelid),'[[:space:]]','','g') is distinct from
 regexp_replace($expected$
 ((removed_at IS NULL) AND (uploaded_at IS NOT NULL) AND
 (( SELECT vb_private.is_staff() AS is_staff) OR
 (vb_private.is_client_member(client_id) AND (EXISTS
 ( SELECT 1 FROM vb_marks m WHERE ((m.id = vb_evidence.mark_id)
 AND (m.client_id = m.client_id) AND (m.archived_at IS NULL)))))))
 $expected$,'[[:space:]]','','g')
 then raise exception 'Evidence policy expression changed; stop for review'; end if;
end;
$guard$;

-- ALTER preserves the policy identity, role, permissive mode and SELECT command.
-- The staff/MFA branch, upload/removal checks and mark archive check are unchanged.
-- In Test, portal_scoped_read remains an additional restrictive requirement.
alter policy evidence_read on public.vb_evidence using (
 removed_at is null and uploaded_at is not null and (
 (select vb_private.is_staff()) or (
 vb_private.is_client_member(client_id) and exists (
 select 1 from public.vb_marks m
 where m.id=vb_evidence.mark_id
 and m.client_id=vb_evidence.client_id
 and m.archived_at is null))));
set local lock_timeout='1s';
set local statement_timeout='10s';
-- END EXACT REVIEWED CORRECTION BODY
do $preservation$
declare before_state jsonb; after_state jsonb; old_expression text; new_expression text; target_index integer;
begin
 select value into strict before_state from pg_temp.vb_evidence_rehearsal_baseline;
 after_state:=pg_temp.vb_evidence_rehearsal_snapshot();
 select (x.ordinality-1)::integer,x.value->>'using' into strict target_index,old_expression
 from jsonb_array_elements(before_state->'policies') with ordinality x(value,ordinality)
 where x.value->>'name'='evidence_read' and (x.value->>'relation')::oid='public.vb_evidence'::regclass;
 new_expression:=after_state#>>array['policies',target_index::text,'using'];
 if regexp_replace(new_expression,'[[:space:]]','','g') is distinct from
 regexp_replace($expected$((removed_at IS NULL) AND (uploaded_at IS NOT NULL) AND
 (( SELECT vb_private.is_staff() AS is_staff) OR (vb_private.is_client_member(client_id)
 AND (EXISTS ( SELECT 1 FROM vb_marks m WHERE ((m.id = vb_evidence.mark_id)
 AND (m.client_id = vb_evidence.client_id) AND (m.archived_at IS NULL)))))))$expected$,'[[:space:]]','','g')
 then raise exception 'Corrected predicate does not match the expected expression'; end if;
 after_state:=jsonb_set(after_state,array['policies',target_index::text,'using'],to_jsonb(old_expression));
 if after_state is distinct from before_state then raise exception 'Unexpected metadata or data drift; rollback required'; end if;
end;
$preservation$;
-- No real account is impersonated. This UUID must not exist or have a mapping.
-- This probes unaffiliated row denial only; it does not certify real sign-in.
do $unaffiliated$
declare probe uuid:='ae220000-0000-0000-0000-000000000001'; visible_rows bigint; visible_files bigint;
 old_claims text:=current_setting('request.jwt.claims',true);
 old_sub text:=current_setting('request.jwt.claim.sub',true);
begin
 if exists(select 1 from auth.users where id=probe)
 or exists(select 1 from vb_private.client_memberships where user_id=probe)
 or exists(select 1 from vb_private.staff_members where user_id=probe)
 then raise exception 'Unassigned probe identity is already present'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',probe,'role','authenticated','aal','aal1')::text,true);
 execute 'set local role authenticated';
 if auth.uid() is distinct from probe then raise exception 'Probe claims did not take effect'; end if;
 select count(*) into visible_rows from public.vb_evidence;
 select count(*) into visible_files from storage.objects where bucket_id='vb-evidence';
 execute 'reset role';
 perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
 perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 if visible_rows<>0 or visible_files<>0 then raise exception 'Unaffiliated evidence access was not denied'; end if;
exception when others then
 execute 'reset role';
 raise;
end;
$unaffiliated$;
rollback to savepoint evidence_correction;
do $rollback_check$
begin
 if pg_temp.vb_evidence_rehearsal_snapshot() is distinct from
 (select value from pg_temp.vb_evidence_rehearsal_baseline)
 then raise exception 'Rollback preservation check failed'; end if;
end;
$rollback_check$;
select jsonb_build_object('rehearsal_passed',true,'corrected_expression_checked',true,
 'only_target_expression_changed',true,'records_preserved',true,'helpers_and_storage_preserved',true,
 'unaffiliated_access_denied',true,'rollback_verified',true,'persistent_application',false) as evidence_rehearsal;
rollback;
