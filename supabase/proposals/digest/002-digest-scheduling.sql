-- Test only: database-owned inbox delivery. No HTTP requests or email.
begin;
alter table public.vb_digest_preferences add column period_start timestamptz not null default now(),add column next_due_at timestamptz;
create function vb_private.digest_next_due(start_time timestamptz,frequency text) returns timestamptz language sql immutable set search_path='' as $$
 select (start_time at time zone 'UTC' + case frequency when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '1 month' end) at time zone 'UTC';
$$;
revoke all on function vb_private.digest_next_due(timestamptz,text) from public,anon,authenticated;
update public.vb_digest_preferences set next_due_at=vb_private.digest_next_due(period_start,frequency);
alter table public.vb_digest_preferences alter column next_due_at set not null;
create function vb_private.digest_schedule_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then new.period_start:=now();new.next_due_at:=vb_private.digest_next_due(now(),new.frequency);
 elsif new.frequency<>old.frequency then new.next_due_at:=vb_private.digest_next_due(now(),new.frequency);
 end if;
 return new;
end;$$;
revoke all on function vb_private.digest_schedule_changed() from public,anon,authenticated;
create trigger digest_schedule_changed before insert or update of frequency on public.vb_digest_preferences for each row execute function vb_private.digest_schedule_changed();
alter table public.vb_inbox drop constraint vb_inbox_kind_check;
alter table public.vb_inbox add constraint vb_inbox_kind_check check(kind in ('digest_sample','digest'));
alter table public.vb_inbox add column scheduled_for timestamptz;
create unique index vb_inbox_scheduled_once on public.vb_inbox(recipient_id,client_id,scheduled_for) where kind='digest';
create function vb_private.deliver_due_digests() returns integer language plpgsql security definer set search_path='' as $$
declare candidate record;p public.vb_digest_preferences;delivered integer:=0;
begin
 -- One transaction owns the batch; a retry either rolls back or sees advanced due times.
 if not pg_try_advisory_xact_lock(hashtextextended('vb-digest-scheduler',0)) then return 0;end if;
 for candidate in select d.user_id,d.client_id from public.vb_digest_preferences d join public.vb_clients c on c.id=d.client_id join vb_private.client_memberships m on m.client_id=d.client_id and m.user_id=d.user_id where d.next_due_at<=now() and c.portal_enabled and c.archived_at is null and m.active and not exists(select 1 from vb_private.staff_members s where s.user_id=d.user_id) order by d.next_due_at,d.user_id,d.client_id limit 100 loop
  -- Match client/membership revocation locks before preference locks.
  perform 1 from public.vb_clients where id=candidate.client_id and portal_enabled and archived_at is null for share;
  if not found then continue;end if;
  perform 1 from vb_private.client_memberships where client_id=candidate.client_id and user_id=candidate.user_id and active for share;
  if not found or exists(select 1 from vb_private.staff_members where user_id=candidate.user_id) then continue;end if;
  select * into p from public.vb_digest_preferences where user_id=candidate.user_id and client_id=candidate.client_id for update;
  if p.next_due_at>now() then continue;end if;
  insert into public.vb_inbox(recipient_id,client_id,kind,categories,frequency,period_start,scheduled_for,source_items)
  values(p.user_id,p.client_id,'digest',p.categories,p.frequency,p.period_start,p.next_due_at,vb_private.digest_items(p.client_id,p.categories,p.period_start))
  on conflict(recipient_id,client_id,scheduled_for) where kind='digest' do nothing;
  if found then delivered:=delivered+1;end if;
  -- Overdue periods are combined in one digest, avoiding a backlog flood.
  update public.vb_digest_preferences set period_start=now(),next_due_at=vb_private.digest_next_due(now(),p.frequency) where user_id=p.user_id and client_id=p.client_id;
 end loop;
 return delivered;
end;$$;
revoke all on function vb_private.deliver_due_digests() from public,anon,authenticated,service_role;
-- Add the message kind to the existing protected reader response.
create or replace function public.vb_open_inbox(target_client uuid,target_message uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare msg public.vb_inbox;items jsonb;
begin
 perform vb_private.digest_scope(target_client);
 select * into msg from public.vb_inbox where id=target_message and client_id=target_client and recipient_id=auth.uid();
 if msg.id is null then raise exception 'Message unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc),'[]'::jsonb) into items from (
 select 'bcm'::text source,s.id,'Completed BCM comparison — review possible changes'::text title,s.finished_at occurred_at from public.vb_bcm_scans s where s.client_id=target_client and s.status='completed' and s.scan_type='comparison' and exists(select 1 from jsonb_array_elements(msg.source_items) j where j->>'source'='bcm' and j->>'id'=s.id::text)
 union all
 select 'use_history',e.id,'Upload available in Use History',e.uploaded_at from public.vb_evidence e join public.vb_marks m on m.id=e.mark_id and m.client_id=e.client_id where e.client_id=target_client and e.removed_at is null and e.uploaded_at is not null and m.archived_at is null and exists(select 1 from jsonb_array_elements(msg.source_items) j where j->>'source'='use_history' and j->>'id'=e.id::text)
 union all
 select 'maintenance',p.id,p.description||' — due '||p.deadline::text,p.updated_at from public.vb_maintenance_publications p join public.vb_marks m on m.id=p.mark_id and m.client_id=p.client_id where p.client_id=target_client and p.withdrawn_at is null and m.archived_at is null and exists(select 1 from jsonb_array_elements(msg.source_items) j where j->>'source'='maintenance' and j->>'id'=p.id::text)
 ) x;
 update public.vb_inbox set read_at=coalesce(read_at,now()) where id=msg.id returning * into msg;
 return jsonb_build_object('kind',msg.kind,'id',msg.id,'client_id',msg.client_id,'created_at',msg.created_at,'period_start',msg.period_start,'frequency',msg.frequency,'read_at',msg.read_at,'items',items);
end;$$;
commit;
