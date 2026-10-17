-- Test-only invitation lifecycle. No email is sent by this migration.
begin;
do $$ begin if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database';end if;end $$;
create table vb_private.engagement_invitations (
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null references vb_private.portal_engagement_drafts(id),
 draft_revision integer not null,
 client_id uuid not null references public.vb_clients(id),
 recipient_email text not null, contact_updated_at timestamptz not null,
 engagement_title text not null, matter_title text not null,
 state text not null check(state in ('sending','sent','failed','accepted','revoked')),
 requested_by uuid not null references auth.users(id), requested_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days', sent_at timestamptz,
 accepted_by uuid references auth.users(id),accepted_at timestamptz,
 engagement_id uuid references public.vb_engagements(id),matter_id uuid references public.vb_matters(id),
 check(expires_at>requested_at),
 check((state='accepted' and accepted_by is not null and accepted_at is not null and engagement_id is not null and matter_id is not null)
 or (state<>'accepted' and accepted_by is null and accepted_at is null and engagement_id is null and matter_id is null))
);
create unique index engagement_invitation_pending on vb_private.engagement_invitations(draft_id) where state in ('sending','sent');
create unique index engagement_invitation_accepted on vb_private.engagement_invitations(draft_id) where state='accepted';
alter table vb_private.engagement_invitations enable row level security;
revoke all on vb_private.engagement_invitations from public,anon,authenticated;
create trigger portal_lifecycle_audit after insert or update on vb_private.engagement_invitations for each row execute function vb_private.audit_portal_lifecycle();

-- Admin sees only legal-client contacts and explicit invitations, never Members.
create or replace function public.vb_test_engagement_admin() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501';end if;
 return jsonb_build_object(
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'contact_name',contact_name,'contact_email',contact_email,'updated_at',updated_at) order by name) from public.vb_clients where archived_at is null),'[]'::jsonb),
 'engagements',coalesce((select jsonb_agg(jsonb_build_object('id',id,'client_id',client_id,'title',title,'status',status) order by created_at desc) from public.vb_engagements),'[]'::jsonb),
 'drafts',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'client_id',d.client_id,'engagement_title',d.engagement_title,'matter_title',d.matter_title,'recipient_email',c.contact_email,'revision',d.revision) order by d.updated_at desc) from vb_private.portal_engagement_drafts d join public.vb_clients c on c.id=d.client_id where not exists(select 1 from vb_private.engagement_invitations i where i.draft_id=d.id and i.state='accepted')),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'draft_id',draft_id,'client_id',client_id,'recipient_email',recipient_email,'state',case when state in ('sent','sending') and expires_at<=now() then 'expired' else state end,'expires_at',expires_at,'engagement_id',engagement_id) order by requested_at desc) from vb_private.engagement_invitations),'[]'::jsonb));
end $$;

create function public.vb_prepare_test_engagement_invite(target_draft uuid,expected_revision integer,expected_email text,expected_contact_updated_at timestamptz,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare d vb_private.portal_engagement_drafts;c public.vb_clients;cid uuid;ticket uuid;email_value text;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501';end if;
 if confirmed is distinct from true then raise exception 'Recipient review required' using errcode='22023';end if;
 select client_id into cid from vb_private.portal_engagement_drafts where id=target_draft;
 select * into c from public.vb_clients where id=cid for update;
 select * into d from vb_private.portal_engagement_drafts where id=target_draft for update;
 if c.id is null or c.archived_at is not null or d.id is null then raise exception 'Client or draft unavailable' using errcode='42501';end if;
 email_value:=lower(btrim(c.contact_email));
 if email_value is null or length(email_value)>254 or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Save a valid client contact email in Client Settings first' using errcode='22023';end if;
 if d.revision is distinct from expected_revision or email_value is distinct from lower(btrim(expected_email)) or c.updated_at is distinct from expected_contact_updated_at then raise exception 'Recipient or draft changed. Review again.' using errcode='40001';end if;
 if exists(select 1 from vb_private.engagement_invitations where draft_id=d.id and state='accepted') then raise exception 'Engagement already activated' using errcode='40001';end if;
 if exists(select 1 from vb_private.engagement_invitations where draft_id=d.id and requested_at>now()-interval '60 seconds') then raise exception 'Wait one minute before resending' using errcode='40001';end if;
 update vb_private.engagement_invitations set state='revoked' where draft_id=d.id and state in ('sending','sent');
 insert into vb_private.engagement_invitations(draft_id,draft_revision,client_id,recipient_email,contact_updated_at,engagement_title,matter_title,state,requested_by)
 values(d.id,d.revision,c.id,email_value,c.updated_at,d.engagement_title,d.matter_title,'sending',auth.uid()) returning id into ticket;
 return ticket;
end $$;
-- Only the delivery worker can inspect account presence, and it never returns it
-- to the attorney. The browser submits an invitation ID, never an email/URL.
create function public.vb_test_invite_delivery(ticket uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i vb_private.engagement_invitations;
begin
 select * into i from vb_private.engagement_invitations where id=ticket and state='sending' and expires_at>now();
 if i.id is null then raise exception 'Delivery unavailable' using errcode='42501';end if;
 if exists(select 1 from auth.users u join vb_private.staff_members st on st.user_id=u.id where lower(u.email)=i.recipient_email)
 or exists(select 1 from auth.users u join vb_private.portal_accounts a on a.user_id=u.id where lower(u.email)=i.recipient_email and a.status<>'active') then raise exception 'Delivery unavailable' using errcode='42501';end if;
 return jsonb_build_object('email',i.recipient_email,'existing',exists(select 1 from auth.users where lower(email)=i.recipient_email));
end $$;
create function public.vb_complete_test_invite_delivery(ticket uuid,succeeded boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 update vb_private.engagement_invitations set state=case when succeeded then 'sent' else 'failed' end,sent_at=case when succeeded then now() end where id=ticket and state='sending' and expires_at>now();
 if not found then raise exception 'Invitation changed' using errcode='40001';end if;
end $$;
create function public.vb_revoke_test_engagement_invite(invitation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501';end if;
 select client_id into cid from vb_private.engagement_invitations where id=invitation_id;
 perform 1 from public.vb_clients where id=cid for update;
 update vb_private.engagement_invitations set state='revoked' where id=invitation_id and state in ('sending','sent','failed');
 if not found then raise exception 'Invitation unavailable or already accepted' using errcode='40001';end if;
end $$;
create function vb_private.test_invite_recipient(i vb_private.engagement_invitations) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from vb_private.staff_members where user_id=auth.uid())
 and not exists(select 1 from vb_private.portal_accounts where user_id=auth.uid() and status<>'active')
 and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and lower(email)=(i).recipient_email)
 and (i).state='sent' and (i).expires_at>now()
 and exists(select 1 from public.vb_clients c where c.id=(i).client_id and c.archived_at is null and lower(btrim(c.contact_email))=(i).recipient_email)
 and exists(select 1 from vb_private.portal_engagement_drafts d where d.id=(i).draft_id and d.client_id=(i).client_id and d.revision=(i).draft_revision);
$$;
create function public.vb_read_test_engagement_invite(invitation_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i vb_private.engagement_invitations;
begin
 select * into i from vb_private.engagement_invitations where id=invitation_id;
 if not coalesce(vb_private.test_invite_recipient(i),false) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 return jsonb_build_object('id',i.id,'client_name',(select name from public.vb_clients where id=i.client_id),'engagement_title',i.engagement_title,'matter_title',i.matter_title,'expires_at',i.expires_at);
end $$;
-- Acceptance is the only recipient operation that creates engagement access.
create function public.vb_accept_test_engagement_invite(invitation_id uuid,confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare i vb_private.engagement_invitations;cid uuid;eid uuid;mid uuid;
begin
 if confirmed is distinct from true then raise exception 'Explicit acceptance required' using errcode='22023';end if;
 select client_id into cid from vb_private.engagement_invitations where id=invitation_id;
 perform 1 from public.vb_clients where id=cid for update;
 -- Match the same client -> draft -> invitation ordering used by send/revoke.
 perform 1 from vb_private.portal_engagement_drafts where id=(select draft_id from vb_private.engagement_invitations where id=invitation_id) for update;
 select * into i from vb_private.engagement_invitations where id=invitation_id for update;
 perform 1 from auth.users where id=auth.uid() for share;
 perform 1 from vb_private.portal_accounts where user_id=auth.uid() for share;
 if not coalesce(vb_private.test_invite_recipient(i),false) or not vb_private.portal_member_active()
 or (not exists(select 1 from vb_private.portal_test_onboarding where user_id=auth.uid()) and not exists(select 1 from vb_private.engagement_grants where user_id=auth.uid() and accepted_at is not null)) then raise exception 'Invitation unavailable or account setup required' using errcode='42501';end if;
 insert into public.vb_engagements(client_id,title,status,activated_at) values(cid,i.engagement_title,'active',now()) returning id into eid;
 insert into public.vb_matters(engagement_id,title) values(eid,i.matter_title) returning id into mid;
 insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values(eid,auth.uid(),'active',now());
 -- New client relationship: bind future records to the first engagement. Do not
 -- remap retained records or service configuration belonging to an earlier one.
 if not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid) then
  if exists(select 1 from public.vb_marks where client_id=cid) or exists(select 1 from vb_private.client_memberships where client_id=cid) then raise exception 'Existing records require scope review' using errcode='42501';end if;
  insert into vb_private.legacy_test_mappings(client_id,engagement_id,matter_id,label,enforcement_enabled) values(cid,eid,mid,'Fictional Test mapping — October 16, 2026',true);
  insert into vb_private.portal_service_bindings(client_id,service,engagement_id,matter_id) select cid,service,eid,mid from vb_private.engagement_services where engagement_id=eid;
 end if;
 update public.vb_clients set portal_enabled=true where id=cid and not portal_enabled;
 update vb_private.engagement_invitations set state='accepted',accepted_by=auth.uid(),accepted_at=now(),engagement_id=eid,matter_id=mid where id=i.id;
 return eid;
end $$;
revoke all on function vb_private.test_invite_recipient(vb_private.engagement_invitations) from public,anon,authenticated;
revoke all on function public.vb_test_invite_delivery(uuid),public.vb_complete_test_invite_delivery(uuid,boolean) from public,anon,authenticated;
grant execute on function public.vb_test_invite_delivery(uuid),public.vb_complete_test_invite_delivery(uuid,boolean) to service_role;
revoke all on function public.vb_prepare_test_engagement_invite(uuid,integer,text,timestamptz,boolean),public.vb_revoke_test_engagement_invite(uuid),public.vb_read_test_engagement_invite(uuid),public.vb_accept_test_engagement_invite(uuid,boolean) from public,anon;
grant execute on function public.vb_prepare_test_engagement_invite(uuid,integer,text,timestamptz,boolean),public.vb_revoke_test_engagement_invite(uuid),public.vb_read_test_engagement_invite(uuid),public.vb_accept_test_engagement_invite(uuid,boolean) to authenticated;
create or replace function public.vb_save_test_engagement_draft(draft_id uuid,expected_revision integer,details jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d vb_private.portal_engagement_drafts; cid uuid; email_value text:=lower(btrim(details->>'recipient_email')); title_value text:=btrim(details->>'engagement_title'); matter_value text:=btrim(details->>'matter_title');
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 -- Recipient is always derived from this legal client's saved contact.
 cid:=nullif(details->>'client_id','')::uuid;
 if cid is null then raise exception 'Choose an existing legal client first' using errcode='22023';end if;
 select lower(btrim(contact_email)) into email_value from public.vb_clients where id=cid and archived_at is null for update;
 if details ? 'recipient_email' and lower(btrim(details->>'recipient_email')) is distinct from email_value then raise exception 'Client contact changed. Review again.' using errcode='40001';end if;
 if draft_id is null or expected_revision is null or expected_revision<0 or jsonb_typeof(details)<>'object' or details is null then raise exception 'Draft and revision required' using errcode='22023'; end if;
 if details - array['client_id','new_client_name','client_type','contact_name','engagement_title','matter_title','recipient_email'] <> '{}'::jsonb then raise exception 'Unexpected draft fields' using errcode='22023'; end if;
 if title_value is null or length(title_value) not between 1 and 200 or matter_value is null or length(matter_value) not between 1 and 200
 or email_value is null or length(email_value)>254 or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Check engagement, matter and email' using errcode='22023'; end if;
 cid:=nullif(details->>'client_id','')::uuid;
 if cid is not null then
  perform 1 from public.vb_clients where id=cid and archived_at is null for update;
  if not found then raise exception 'Client unavailable' using errcode='42501'; end if;
 else
  if length(btrim(coalesce(details->>'new_client_name',''))) not between 1 and 200 or details->>'client_type' not in ('business','individual') or details->>'client_type' is null or length(btrim(coalesce(details->>'contact_name',''))) not between 1 and 200 then raise exception 'New legal client details required' using errcode='22023'; end if;
 end if;
 -- Request UUID makes retrying an identical save safe; conflicting saves fail.
 perform pg_advisory_xact_lock(hashtextextended(draft_id::text,0));
 select * into d from vb_private.portal_engagement_drafts where id=draft_id for update;
 if d.id is not null and (d.revision<>expected_revision) then
  if d.revision=expected_revision+1 and d.client_id is not distinct from cid and d.recipient_email=email_value and d.engagement_title=title_value and d.matter_title=matter_value
   and d.new_client_name is not distinct from (case when cid is null then btrim(details->>'new_client_name') end)
   and d.client_type is not distinct from (case when cid is null then details->>'client_type' end)
   and d.contact_name is not distinct from (case when cid is null then btrim(details->>'contact_name') end) then
   return jsonb_build_object('id',d.id,'revision',d.revision);
  end if;
  raise exception 'Draft changed. Reload before saving.' using errcode='40001';
 end if;
 if d.id is null and expected_revision<>0 then raise exception 'Draft changed. Reload before saving.' using errcode='40001'; end if;
 insert into vb_private.portal_engagement_drafts(id,client_id,new_client_name,client_type,contact_name,engagement_title,matter_title,recipient_email,created_by)
 values(draft_id,cid,case when cid is null then btrim(details->>'new_client_name') end,case when cid is null then details->>'client_type' end,case when cid is null then btrim(details->>'contact_name') end,title_value,matter_value,email_value,auth.uid())
 on conflict(id) do update set client_id=excluded.client_id,new_client_name=excluded.new_client_name,client_type=excluded.client_type,contact_name=excluded.contact_name,engagement_title=excluded.engagement_title,matter_title=excluded.matter_title,recipient_email=excluded.recipient_email,revision=portal_engagement_drafts.revision+1,updated_at=now()
 returning * into d;
 return jsonb_build_object('id',d.id,'revision',d.revision);
end $$;
notify pgrst,'reload schema';
-- Real roles and authorization. No email/HTTP/dispatcher is called. All rollback.

create temporary table invitation_results(label text,passed boolean) on commit drop;
grant select,insert on invitation_results to authenticated,anon,service_role;
create function pg_temp.check_invite(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;insert into invitation_results values(label,true);end $$;
create function pg_temp.invite_error(command text,code text,label text) returns void language plpgsql as $$declare actual text:='00000';begin begin execute command;exception when others then get stacked diagnostics actual=returned_sqlstate;end;perform pg_temp.check_invite(actual=code,label||' ['||actual||']');end $$;
create temporary table invite_context as select
 (select user_id from vb_private.staff_members where active limit 1) as staff,
 (select o.user_id from vb_private.portal_test_onboarding o where not exists(select 1 from vb_private.engagement_grants g where g.user_id=o.user_id) limit 1) as member,
 (select g.user_id from vb_private.engagement_grants g where g.engagement_id='f1700000-0000-0000-0000-000000000003' limit 1) as wrong_user,
 'b9100000-0000-0000-0000-000000000001'::uuid as client_id,
 null::text as email,null::timestamptz as contact_updated_at,null::uuid as ticket,null::uuid as accepted_engagement,
 (select count(*) from auth.users) as auth_count,
 (select md5(coalesce(jsonb_agg(p order by company_id)::text,'')) from public.vb_member_progress p) as kit_hash;
update invite_context set email=(select email from auth.users where id=invite_context.member);
select pg_temp.check_invite((select staff is not null and member is not null and wrong_user is not null and email is not null from invite_context),'Approved existing identities available');
grant select,update on invite_context to authenticated,service_role;
update public.vb_clients set contact_email=(select email from invite_context) where id=(select client_id from invite_context);
update invite_context set contact_updated_at=(select updated_at from public.vb_clients where id=invite_context.client_id);
set local role anon;
select pg_temp.invite_error($q$select public.vb_read_test_engagement_invite('f1910000-0000-0000-0000-000000000001')$q$,'42501','Anonymous invitation read denied');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select member from invite_context),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
select pg_temp.invite_error('select * from vb_private.engagement_invitations','42501','Member cannot list private invitation recipients');
select pg_temp.invite_error($q$select public.vb_test_invite_delivery('f1910000-0000-0000-0000-000000000001')$q$,'42501','Member cannot inspect internal account-presence decision');
select pg_temp.invite_error($q$select public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000001',1,'x@example.test',now(),true)$q$,'42501','Member cannot send invitations');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff from invite_context),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
select pg_temp.invite_error($q$select public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000001',1,'x@example.test',now(),true)$q$,'42501','Staff without MFA cannot send');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff from invite_context),'role','authenticated','aal','aal2')::text,true);
set local role authenticated;
select pg_temp.check_invite((public.vb_save_test_engagement_draft('f1900000-0000-0000-0000-000000000001',0,jsonb_build_object('client_id',(select client_id from invite_context),'engagement_title','Rollback invitation','matter_title','Rollback matter'))->>'revision')::integer=1,'Draft recipient automatically comes from saved contact');
select pg_temp.invite_error($q$select public.vb_save_test_engagement_draft('f1900000-0000-0000-0000-000000000002',0,jsonb_build_object('client_id',(select client_id from invite_context),'engagement_title','Wrong recipient','matter_title','Rollback matter','recipient_email','someone-else@example.test'))$q$,'40001','Browser cannot override saved contact email');
select pg_temp.invite_error($q$select public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000001',1,(select email from invite_context),(select contact_updated_at from invite_context),false)$q$,'22023','Explicit send review required');
select pg_temp.invite_error($q$select public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000001',1,'wrong@example.test',(select contact_updated_at from invite_context),true)$q$,'40001','Changed email snapshot rejected');
select pg_temp.invite_error($q$select public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000001',2,(select email from invite_context),(select contact_updated_at from invite_context),true)$q$,'40001','Changed draft revision rejected');
update invite_context set ticket=public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000001',1,email,contact_updated_at,true);
select pg_temp.invite_error($q$select public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000001',1,(select email from invite_context),(select contact_updated_at from invite_context),true)$q$,'40001','Rapid resend blocked');
reset role;
select pg_temp.check_invite(not exists(select 1 from vb_private.engagement_grants where user_id=(select member from invite_context)),'Sending grants no access');
select set_config('request.jwt.claims','{"role":"service_role"}',true);set local role service_role;
select pg_temp.check_invite((public.vb_test_invite_delivery((select ticket from invite_context))->>'email')=(select email from invite_context),'Worker uses saved contact address');
select public.vb_complete_test_invite_delivery((select ticket from invite_context),true);
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select wrong_user from invite_context),'role','authenticated','aal','aal1')::text,true);set local role authenticated;
select pg_temp.invite_error('select public.vb_read_test_engagement_invite((select ticket from invite_context))','42501','Wrong-email user cannot read invitation details');
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Wrong-email user cannot accept');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select member from invite_context),'role','authenticated','aal','aal1')::text,true);set local role authenticated;
select pg_temp.check_invite(public.vb_read_test_engagement_invite((select ticket from invite_context))->>'engagement_title'='Rollback invitation','Verified matching Member can review');
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),false)','22023','Acceptance cannot be implicit');
reset role;
update vb_private.engagement_invitations set requested_at=now()-interval '9 days',expires_at=now()-interval '1 day' where id=(select ticket from invite_context);
set local role authenticated;
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Expired invitation denied');
reset role;
update vb_private.engagement_invitations set requested_at=now()-interval '2 minutes',expires_at=now()+interval '7 days',state='revoked' where id=(select ticket from invite_context);
set local role authenticated;
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Revoked invitation denied');
reset role;
update vb_private.engagement_invitations set state='sent' where id=(select ticket from invite_context);
update vb_private.portal_accounts set status='suspended' where user_id=(select member from invite_context);
set local role authenticated;
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Suspended account cannot accept');
reset role;
update vb_private.portal_accounts set status='active' where user_id=(select member from invite_context);
update public.vb_clients set contact_email='changed-contact@example.test' where id=(select client_id from invite_context);
set local role authenticated;
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Changed client contact invalidates old invitation');
reset role;
update public.vb_clients set contact_email=(select email from invite_context) where id=(select client_id from invite_context);
update vb_private.portal_engagement_drafts set revision=revision+1 where id='f1900000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Edited draft invalidates the previously reviewed invitation');
reset role;
update vb_private.portal_engagement_drafts set revision=revision-1 where id='f1900000-0000-0000-0000-000000000001';
set local role authenticated;
update invite_context set accepted_engagement=public.vb_accept_test_engagement_invite(ticket,true);
select pg_temp.check_invite(public.vb_account_access()='client','Acceptance gives matching Member Client status');
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Accepted invitation cannot be reused');
select pg_temp.check_invite((select count(*)=1 from public.vb_engagements where id=(select accepted_engagement from invite_context)),'New engagement visible to intended recipient');
select pg_temp.check_invite(not exists(select 1 from public.vb_marks where client_id=(select client_id from invite_context)),'New engagement does not inherit old engagement marks');
reset role;
select pg_temp.check_invite((select count(*)=8 and bool_and(enabled) from vb_private.engagement_services where engagement_id=(select accepted_engagement from invite_context)),'Accepted engagement includes all Client features');
select pg_temp.check_invite((select md5(coalesce(jsonb_agg(p order by company_id)::text,'')) from public.vb_member_progress p)=(select kit_hash from invite_context),'Private Kit progress preserved');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff from invite_context),'role','authenticated','aal','aal2')::text,true);set local role authenticated;
select pg_temp.invite_error('select public.vb_revoke_test_engagement_invite((select ticket from invite_context))','40001','Accepted invitation cannot be used to revoke representation');
select public.vb_close_test_engagement((select accepted_engagement from invite_context),'active');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select member from invite_context),'role','authenticated','aal','aal1')::text,true);set local role authenticated;
select pg_temp.check_invite(public.vb_portal_entry()='member','Final closure returns invited account to Member');
reset role;
select pg_temp.check_invite((select count(*) from auth.users)=(select auth_count from invite_context),'Database lifecycle creates no Auth account');
-- A genuinely new identity fixture: no credentials, session or email is created.
-- It exists only inside this rollback transaction, to test verified onboarding.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff from invite_context),'role','authenticated','aal','aal2')::text,true);
insert into auth.users(id,aud,role,email,created_at,updated_at) values('f1930000-0000-0000-0000-000000000001','authenticated','authenticated','new-invite-rollback@example.test',now(),now());
insert into public.vb_clients(id,name,client_type,contact_name,contact_email) values('f1940000-0000-0000-0000-000000000001','FICTIONAL ROLLBACK new client','business','Rollback founder','new-invite-rollback@example.test');
set local role authenticated;
select public.vb_save_test_engagement_draft('f1900000-0000-0000-0000-000000000003',0,'{"client_id":"f1940000-0000-0000-0000-000000000001","engagement_title":"New-user rollback","matter_title":"Initial matter"}');
reset role;
-- Read the exact contact revision rather than relying on list order.
update invite_context set contact_updated_at=(select updated_at from public.vb_clients where id='f1940000-0000-0000-0000-000000000001');
set local role authenticated;
update invite_context set ticket=public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000003',1,'new-invite-rollback@example.test',contact_updated_at,true);
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);set local role service_role;
select pg_temp.check_invite((public.vb_test_invite_delivery((select ticket from invite_context))->>'existing')::boolean,'Pending identity stays internal to delivery worker');
select public.vb_complete_test_invite_delivery((select ticket from invite_context),true);
reset role;
select set_config('request.jwt.claims','{"sub":"f1930000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);set local role authenticated;
select pg_temp.invite_error('select public.vb_read_test_engagement_invite((select ticket from invite_context))','42501','Unverified new identity cannot review invitation');
reset role;
update auth.users set email_confirmed_at=now() where id='f1930000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.check_invite(public.vb_portal_entry()='onboarding','Verified new identity must complete registration');
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select ticket from invite_context),true)','42501','Verified email alone does not skip account setup');
select public.vb_onboard_test_member('{"full_name":"Rollback founder","name":"Rollback business","industry":"Test"}','member-signup-test-2026-10-16',true);
select pg_temp.check_invite(public.vb_portal_entry()='member','Onboarding alone grants only Member access');
update invite_context set accepted_engagement=public.vb_accept_test_engagement_invite(ticket,true);
select pg_temp.check_invite(public.vb_portal_entry()='client','New user becomes Client only after explicit acceptance');
select pg_temp.check_invite((select count(*)=1 from public.vb_clients where id='f1940000-0000-0000-0000-000000000001'),'New client relationship is visible');
reset role;
select pg_temp.check_invite(not exists(select 1 from vb_private.client_memberships where user_id='f1930000-0000-0000-0000-000000000001'),'New access does not create a legacy membership bypass');
select pg_temp.check_invite((select count(*)=8 from vb_private.portal_service_bindings where client_id='f1940000-0000-0000-0000-000000000001'),'New relationship has all eight scoped service bindings');
-- Revoke and resend use a new invitation ID: an old link cannot accept it.
alter table invite_context add column previous_ticket uuid;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff from invite_context),'role','authenticated','aal','aal2')::text,true);
update invite_context set contact_updated_at=(select updated_at from public.vb_clients where id=invite_context.client_id);
set local role authenticated;
select public.vb_save_test_engagement_draft('f1900000-0000-0000-0000-000000000004',0,jsonb_build_object('client_id',(select client_id from invite_context),'engagement_title','Resend rollback','matter_title','Initial matter'));
update invite_context set ticket=public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000004',1,email,contact_updated_at,true);
select public.vb_revoke_test_engagement_invite((select ticket from invite_context));
reset role;
select pg_temp.check_invite((select state='revoked' from vb_private.engagement_invitations where id=(select ticket from invite_context)),'Staff can revoke an unused invitation');
update vb_private.engagement_invitations set requested_at=now()-interval '2 minutes' where id=(select ticket from invite_context);
update invite_context set previous_ticket=ticket;
set local role authenticated;
update invite_context set ticket=public.vb_prepare_test_engagement_invite('f1900000-0000-0000-0000-000000000004',1,email,contact_updated_at,true);
select pg_temp.check_invite((select ticket<>previous_ticket from invite_context),'Resend has a distinct invitation ID');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select member from invite_context),'role','authenticated','aal','aal1')::text,true);set local role authenticated;
select pg_temp.invite_error('select public.vb_accept_test_engagement_invite((select previous_ticket from invite_context),true)','42501','Old link remains unusable after a resend');
reset role;
select count(*) as passed_checks,bool_and(passed) as all_passed from invitation_results;
rollback;
