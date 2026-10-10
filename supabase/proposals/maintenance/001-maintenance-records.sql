-- DRAFT ONLY: not applied. Requires existing VB foundation/access migrations.
-- No users, client memberships, jobs, messages, or account settings are changed.
begin;
create table vb_private.maintenance_drafts (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.vb_clients(id),
 mark_id uuid not null references public.vb_marks(id),
 description text not null check(length(btrim(description)) between 1 and 200),
 window_start date not null,
 window_end date not null check(window_end>=window_start),
 deadline date not null,
 next_step text not null check(length(btrim(next_step)) between 1 and 2000),
 status text not null check(status in ('Upcoming','Needs attention','Completed')),
 verification_source text not null check(length(btrim(verification_source)) between 1 and 2000),
 version integer not null default 1 check(version>0),
 draft_revision integer not null default 1 check(draft_revision>0),
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index maintenance_drafts_scope on vb_private.maintenance_drafts(client_id,mark_id);
create table public.vb_maintenance_publications (
 id uuid primary key references vb_private.maintenance_drafts(id),
 client_id uuid not null references public.vb_clients(id),
 mark_id uuid not null references public.vb_marks(id),
 description text not null check(length(btrim(description)) between 1 and 200),
 window_start date not null,
 window_end date not null check(window_end>=window_start),
 deadline date not null,
 next_step text not null check(length(btrim(next_step)) between 1 and 2000),
 status text not null check(status in ('Upcoming','Needs attention','Completed')),
 draft_revision integer not null check(draft_revision>0),
 verified_at timestamptz not null,
 withdrawn_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index maintenance_publications_client on public.vb_maintenance_publications(client_id,deadline);
alter table vb_private.maintenance_drafts enable row level security;
alter table public.vb_maintenance_publications enable row level security;
revoke all on vb_private.maintenance_drafts,public.vb_maintenance_publications from public,anon,authenticated;
grant select on public.vb_maintenance_publications to authenticated;
grant all on vb_private.maintenance_drafts,public.vb_maintenance_publications to service_role;
create policy maintenance_published_read on public.vb_maintenance_publications for select to authenticated
 using(withdrawn_at is null and (
 (select vb_private.is_staff()) or (vb_private.is_client_member(client_id) and exists(
 select 1 from public.vb_marks m where m.id=mark_id and m.client_id=vb_maintenance_publications.client_id and m.archived_at is null))
 ));

-- These helpers are not callable by browser roles. Definer search paths are empty.
create function vb_private.maintenance_scope(target_client uuid,target_mark uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA required' using errcode='42501'; end if;
 -- Consistent lock order serializes updates with client/mark archival.
 perform 1 from public.vb_clients where id=target_client and archived_at is null for update;
 if not found then raise exception 'Client is unavailable' using errcode='42501'; end if;
 perform 1 from public.vb_marks where id=target_mark and client_id=target_client and archived_at is null for update;
 if not found then raise exception 'Trademark is unavailable for this client' using errcode='42501'; end if;
end; $$;
create function vb_private.maintenance_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.id is distinct from old.id or new.client_id is distinct from old.client_id
 or new.mark_id is distinct from old.mark_id or new.created_at is distinct from old.created_at)
 then raise exception 'Maintenance identity is immutable' using errcode='23514'; end if;
 if not exists(select 1 from public.vb_marks m where m.id=new.mark_id and m.client_id=new.client_id)
 then raise exception 'Client and trademark do not match' using errcode='23514'; end if;
 if tg_table_name='vb_maintenance_publications' and not exists(select 1 from vb_private.maintenance_drafts d
 where d.id=new.id and d.client_id=new.client_id and d.mark_id=new.mark_id)
 then raise exception 'Publication and draft do not match' using errcode='23514'; end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;
create trigger maintenance_draft_identity before insert or update on vb_private.maintenance_drafts
 for each row execute function vb_private.maintenance_identity();
create trigger maintenance_public_identity before insert or update on public.vb_maintenance_publications
 for each row execute function vb_private.maintenance_identity();
create trigger maintenance_draft_audit after insert or update on vb_private.maintenance_drafts
 for each row execute function vb_private.audit_record();
create trigger maintenance_public_audit after insert or update on public.vb_maintenance_publications
 for each row execute function vb_private.audit_record();

create function vb_private.maintenance_record(target_entry uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',d.id,'version',d.version,'revision',d.draft_revision,
 'draft',jsonb_build_object('description',d.description,'windowStart',d.window_start,'windowEnd',d.window_end,
 'deadline',d.deadline,'nextStep',d.next_step,'status',d.status,'source',d.verification_source),
 'published',case when p.id is null or p.withdrawn_at is not null then null else
 jsonb_build_object('description',p.description,'windowStart',p.window_start,'windowEnd',p.window_end,
 'deadline',p.deadline,'nextStep',p.next_step,'status',p.status,'revision',p.draft_revision,'verifiedAt',p.verified_at) end)
 from vb_private.maintenance_drafts d left join public.vb_maintenance_publications p on p.id=d.id where d.id=target_entry;
$$;
create function public.vb_list_maintenance_drafts(target_client uuid,target_mark uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform vb_private.maintenance_scope(target_client,target_mark);
 select coalesce(jsonb_agg(vb_private.maintenance_record(id) order by created_at,id),'[]'::jsonb) into result
 from vb_private.maintenance_drafts where client_id=target_client and mark_id=target_mark;
 return result;
end; $$;
create function public.vb_save_maintenance_draft(target_client uuid,target_mark uuid,target_entry uuid,expected_version integer,details jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved vb_private.maintenance_drafts; start_date date; end_date date; due_date date; field text;
begin
 perform vb_private.maintenance_scope(target_client,target_mark);
 if expected_version is null or expected_version<0 or details is null or jsonb_typeof(details)<>'object'
 then raise exception 'Invalid maintenance draft' using errcode='22023'; end if;
 if details-array['description','windowStart','windowEnd','deadline','nextStep','status','source']<>'{}'::jsonb
 or not(details ?& array['description','windowStart','windowEnd','deadline','nextStep','status','source'])
 then raise exception 'Invalid draft fields' using errcode='22023'; end if;
 foreach field in array array['description','windowStart','windowEnd','deadline','nextStep','status','source'] loop
 if jsonb_typeof(details->field) is distinct from 'string' then raise exception 'Draft fields must be text' using errcode='22023'; end if;
 end loop;
 if length(btrim(details->>'description')) not between 1 and 200
 or length(btrim(details->>'nextStep')) not between 1 and 2000
 or length(btrim(details->>'source')) not between 1 and 2000
 or details->>'status' not in ('Upcoming','Needs attention','Completed')
 then raise exception 'Invalid description, notes or status' using errcode='22023'; end if;
 if details->>'windowStart' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or details->>'windowEnd' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or details->>'deadline' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid dates' using errcode='22023'; end if;
 begin start_date:=(details->>'windowStart')::date;end_date:=(details->>'windowEnd')::date;due_date:=(details->>'deadline')::date;
 exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Invalid dates' using errcode='22023'; end;
 if start_date>end_date then raise exception 'Filing window is reversed' using errcode='22023'; end if;
 if target_entry is null then
 if expected_version<>0 then raise exception 'Draft changed; reload first' using errcode='40001'; end if;
 insert into vb_private.maintenance_drafts(client_id,mark_id,description,window_start,window_end,deadline,next_step,status,verification_source,created_by,updated_by)
 values(target_client,target_mark,btrim(details->>'description'),start_date,end_date,due_date,btrim(details->>'nextStep'),details->>'status',btrim(details->>'source'),auth.uid(),auth.uid()) returning * into saved;
 else
 select * into saved from vb_private.maintenance_drafts where id=target_entry and client_id=target_client and mark_id=target_mark for update;
 if not found then raise exception 'Draft is unavailable' using errcode='42501'; end if;
 if saved.version<>expected_version then raise exception 'Draft changed; reload first' using errcode='40001'; end if;
 update vb_private.maintenance_drafts set description=btrim(details->>'description'),window_start=start_date,window_end=end_date,
 deadline=due_date,next_step=btrim(details->>'nextStep'),status=details->>'status',verification_source=btrim(details->>'source'),
 version=version+1,draft_revision=draft_revision+1,updated_by=auth.uid() where id=saved.id returning * into saved;
 end if;
 return vb_private.maintenance_record(saved.id);
end; $$;
create function public.vb_publish_maintenance(target_client uuid,target_mark uuid,target_entry uuid,expected_version integer,verified boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved vb_private.maintenance_drafts;
begin
 perform vb_private.maintenance_scope(target_client,target_mark);
 if verified is distinct from true or expected_version is null or expected_version<1 then raise exception 'Verification required' using errcode='22023'; end if;
 select * into saved from vb_private.maintenance_drafts where id=target_entry and client_id=target_client and mark_id=target_mark for update;
 if not found then raise exception 'Draft is unavailable' using errcode='42501'; end if;
 if saved.version<>expected_version then raise exception 'Draft changed; reload and verify again' using errcode='40001'; end if;
 insert into public.vb_maintenance_publications as p(id,client_id,mark_id,description,window_start,window_end,deadline,next_step,status,draft_revision,verified_at)
 values(saved.id,saved.client_id,saved.mark_id,saved.description,saved.window_start,saved.window_end,saved.deadline,saved.next_step,saved.status,saved.draft_revision,clock_timestamp())
 on conflict(id) do update set description=excluded.description,window_start=excluded.window_start,window_end=excluded.window_end,
 deadline=excluded.deadline,next_step=excluded.next_step,status=excluded.status,draft_revision=excluded.draft_revision,verified_at=excluded.verified_at,withdrawn_at=null;
 update vb_private.maintenance_drafts set version=version+1,updated_by=auth.uid() where id=saved.id;
 return vb_private.maintenance_record(saved.id);
end; $$;
create function public.vb_withdraw_maintenance(target_client uuid,target_mark uuid,target_entry uuid,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved vb_private.maintenance_drafts;
begin
 perform vb_private.maintenance_scope(target_client,target_mark);
 if expected_version is null or expected_version<1 then raise exception 'Invalid version' using errcode='22023'; end if;
 select * into saved from vb_private.maintenance_drafts where id=target_entry and client_id=target_client and mark_id=target_mark for update;
 if not found then raise exception 'Draft is unavailable' using errcode='42501'; end if;
 if saved.version<>expected_version then raise exception 'Draft changed; reload first' using errcode='40001'; end if;
 update public.vb_maintenance_publications set withdrawn_at=clock_timestamp() where id=saved.id and withdrawn_at is null;
 update vb_private.maintenance_drafts set version=version+1,updated_by=auth.uid() where id=saved.id;
 return vb_private.maintenance_record(saved.id);
end; $$;
revoke all on function vb_private.maintenance_scope(uuid,uuid),vb_private.maintenance_identity(),vb_private.maintenance_record(uuid) from public,anon,authenticated;
revoke all on function public.vb_list_maintenance_drafts(uuid,uuid),public.vb_save_maintenance_draft(uuid,uuid,uuid,integer,jsonb),public.vb_publish_maintenance(uuid,uuid,uuid,integer,boolean),public.vb_withdraw_maintenance(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.vb_list_maintenance_drafts(uuid,uuid),public.vb_save_maintenance_draft(uuid,uuid,uuid,integer,jsonb),public.vb_publish_maintenance(uuid,uuid,uuid,integer,boolean),public.vb_withdraw_maintenance(uuid,uuid,uuid,integer) to authenticated;
commit;
