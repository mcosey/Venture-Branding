-- Test only. Engagement draft review; does not send email or grant access.
begin;
do $$ begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database'; end if;
 if not exists(select 1 from vb_private.legacy_test_mappings where enforcement_enabled) then raise exception 'Engagement cutover required'; end if;
end $$;
-- Every engagement includes every Client feature. Service bindings still identify
-- which engagement owns a configured service and its retained records.
create or replace function vb_private.can_use_engagement_service(target uuid,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select feature=any(array['brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest'])
 and vb_private.can_access_engagement(target);
$$;
create or replace function vb_private.portal_actor_scope(eid uuid,actor uuid,feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select feature=any(array['brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest'])
 and exists(select 1 from public.vb_engagements e
 join public.vb_clients c on c.id=e.client_id
 join vb_private.portal_accounts a on a.user_id=actor and a.status='active'
 join vb_private.engagement_grants g on g.engagement_id=e.id and g.user_id=actor and g.status='active' and g.accepted_at is not null
 where e.id=eid and e.status='active' and c.portal_enabled and c.archived_at is null)
 and not exists(select 1 from vb_private.staff_members where user_id=actor);
$$;
create function vb_private.portal_full_feature_row() returns trigger language plpgsql set search_path='' as $$
begin new.enabled:=true;return new;end $$;
create trigger portal_full_feature_row before insert or update on vb_private.engagement_services for each row execute function vb_private.portal_full_feature_row();
create function vb_private.portal_include_all_features() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into vb_private.engagement_services(engagement_id,service,enabled)
 select new.id,s,true from unnest(array['brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest']) s
 on conflict(engagement_id,service) do update set enabled=true;
 return new;
end $$;
create trigger portal_include_all_features after insert on public.vb_engagements for each row execute function vb_private.portal_include_all_features();
insert into vb_private.engagement_services(engagement_id,service,enabled)
 select e.id,s,true from public.vb_engagements e cross join unnest(array['brand_map','portfolio','brand_change_monitor','trademark_watch','use_history','messages','maintenance_reminder','activity_digest']) s
 on conflict(engagement_id,service) do update set enabled=true;
revoke all on function vb_private.portal_full_feature_row(),vb_private.portal_include_all_features() from public,anon,authenticated;

-- Planning drafts have no effect on legal-client records, identity or access.
-- A new-client draft stays here until separately reviewed invitation activation.
create table vb_private.portal_engagement_drafts (
 id uuid primary key, client_id uuid references public.vb_clients(id),
 new_client_name text, client_type text, contact_name text,
 engagement_title text not null check(length(btrim(engagement_title)) between 1 and 200),
 matter_title text not null check(length(btrim(matter_title)) between 1 and 200),
 recipient_email text not null check(length(recipient_email)<=254 and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 revision integer not null default 1 check(revision>0),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((client_id is not null and new_client_name is null and client_type is null and contact_name is null)
 or (client_id is null and length(btrim(new_client_name)) between 1 and 200 and client_type in ('business','individual') and length(btrim(contact_name)) between 1 and 200))
);
alter table vb_private.portal_engagement_drafts enable row level security;
revoke all on vb_private.portal_engagement_drafts from public,anon,authenticated;
create trigger portal_lifecycle_audit after insert or update on vb_private.portal_engagement_drafts for each row execute function vb_private.audit_portal_lifecycle();

create function public.vb_test_engagement_admin() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 return jsonb_build_object(
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.vb_clients where archived_at is null),'[]'::jsonb),
 'engagements',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'client_id',e.client_id,'title',e.title,'status',e.status) order by e.created_at desc) from public.vb_engagements e),'[]'::jsonb),
 'drafts',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'client_id',d.client_id,'new_client_name',d.new_client_name,'client_type',d.client_type,'contact_name',d.contact_name,'engagement_title',d.engagement_title,'matter_title',d.matter_title,'recipient_email',d.recipient_email,'revision',d.revision) order by updated_at desc) from vb_private.portal_engagement_drafts d),'[]'::jsonb));
end $$;
create function public.vb_save_test_engagement_draft(draft_id uuid,expected_revision integer,details jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d vb_private.portal_engagement_drafts; cid uuid; email_value text:=lower(btrim(details->>'recipient_email')); title_value text:=btrim(details->>'engagement_title'); matter_value text:=btrim(details->>'matter_title');
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
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
revoke all on function public.vb_test_engagement_admin(),public.vb_save_test_engagement_draft(uuid,integer,jsonb) from public,anon;
grant execute on function public.vb_test_engagement_admin(),public.vb_save_test_engagement_draft(uuid,integer,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
