-- Phase 1: Test-only personal inbox and manually generated samples. No jobs or email.
begin;
create table public.vb_digest_preferences(
 user_id uuid not null references auth.users(id),client_id uuid not null references public.vb_clients(id),
 categories text[] not null check(cardinality(categories) between 1 and 3 and categories <@ array['bcm','use_history','maintenance']::text[]),
 frequency text not null check(frequency in ('daily','weekly','monthly')),
 delivery text not null default 'account' check(delivery='account'),
 version integer not null default 1,updated_at timestamptz not null default now(),primary key(user_id,client_id));
create table public.vb_inbox(
 id uuid primary key default gen_random_uuid(),recipient_id uuid not null references auth.users(id),client_id uuid not null references public.vb_clients(id),
 kind text not null default 'digest_sample' check(kind='digest_sample'),
 categories text[] not null,frequency text not null,period_start timestamptz not null,created_at timestamptz not null default now(),read_at timestamptz,
 source_items jsonb not null check(jsonb_typeof(source_items)='array' and jsonb_array_length(source_items)<=100));
create index vb_inbox_recipient on public.vb_inbox(recipient_id,client_id,created_at desc);
alter table public.vb_digest_preferences enable row level security;
alter table public.vb_inbox enable row level security;
revoke all on public.vb_digest_preferences,public.vb_inbox from public,anon,authenticated;
grant select on public.vb_digest_preferences,public.vb_inbox to authenticated;
grant all on public.vb_digest_preferences,public.vb_inbox to service_role;
create policy digest_personal_read on public.vb_digest_preferences for select to authenticated using(user_id=auth.uid() and vb_private.is_client_member(client_id));
create policy inbox_personal_read on public.vb_inbox for select to authenticated using(recipient_id=auth.uid() and vb_private.is_client_member(client_id));
create function vb_private.digest_scope(target_client uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.vb_clients where id=target_client for share;
 if not vb_private.is_client_member(target_client) then raise exception 'Client access required' using errcode='42501';end if;
end;$$;
revoke all on function vb_private.digest_scope(uuid) from public,anon,authenticated;
create function public.vb_save_digest_preferences(target_client uuid,expected_version integer,details jsonb) returns public.vb_digest_preferences
language plpgsql security definer set search_path='' as $$
declare cats text[];p public.vb_digest_preferences;
begin
 perform vb_private.digest_scope(target_client);
 if jsonb_typeof(details->'categories') is distinct from 'array' then raise exception 'Choose digest results' using errcode='22023';end if;
 select array_agg(value order by value) into cats from jsonb_array_elements_text(details->'categories');
 if cats is null or cardinality(cats) not between 1 and 3 or not cats <@ array['bcm','use_history','maintenance']::text[] or cardinality(cats)<>(select count(distinct x) from unnest(cats) x)
 or details->>'frequency' is null or details->>'frequency' not in ('daily','weekly','monthly') or details->>'delivery' is distinct from 'account'
 then raise exception 'Check digest preferences' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||target_client::text,0));
 select * into p from public.vb_digest_preferences where user_id=auth.uid() and client_id=target_client for update;
 if expected_version is null or expected_version<>coalesce(p.version,0) then raise exception 'Preferences changed. Reload before saving.' using errcode='40001';end if;
 insert into public.vb_digest_preferences(user_id,client_id,categories,frequency) values(auth.uid(),target_client,cats,details->>'frequency')
 on conflict(user_id,client_id) do update set categories=excluded.categories,frequency=excluded.frequency,version=vb_digest_preferences.version+1,updated_at=now() returning * into p;
 return p;
end;$$;
create function vb_private.digest_items(target_client uuid,cats text[],since_time timestamptz) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('source',source,'id',id,'occurred_at',occurred_at) order by occurred_at desc),'[]'::jsonb) from (
 select * from (
 select 'bcm'::text source,s.id, s.finished_at occurred_at from public.vb_bcm_scans s where 'bcm'=any(cats) and s.client_id=target_client and s.status='completed' and s.scan_type='comparison' and s.finished_at>=since_time
 union all
 select 'use_history',e.id,e.uploaded_at from public.vb_evidence e join public.vb_marks m on m.id=e.mark_id and m.client_id=e.client_id where 'use_history'=any(cats) and e.client_id=target_client and e.uploaded_at>=since_time and e.removed_at is null and m.archived_at is null
 union all
 select 'maintenance',p.id,p.updated_at from public.vb_maintenance_publications p join public.vb_marks m on m.id=p.mark_id and m.client_id=p.client_id where 'maintenance'=any(cats) and p.client_id=target_client and p.withdrawn_at is null and m.archived_at is null and p.status<>'Completed' and p.deadline between current_date and current_date+30
 ) sources order by occurred_at desc,source,id limit 100) limited;
$$;
revoke all on function vb_private.digest_items(uuid,text[],timestamptz) from public,anon,authenticated;
create function public.vb_generate_digest_sample(target_client uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.vb_digest_preferences;result uuid;since_time timestamptz;
begin
 perform vb_private.digest_scope(target_client);
 select * into p from public.vb_digest_preferences where user_id=auth.uid() and client_id=target_client for share;
 if p.version is null or expected_version is null or p.version<>expected_version then raise exception 'Save or reload preferences first' using errcode='40001';end if;
 perform pg_advisory_xact_lock(hashtextextended('digest'||auth.uid()::text||target_client::text,0));
 if exists(select 1 from public.vb_inbox where recipient_id=auth.uid() and client_id=target_client and created_at>now()-interval '5 seconds') then raise exception 'Wait a moment before generating another sample' using errcode='40001';end if;
 since_time:=now()-case p.frequency when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '30 days' end;
 insert into public.vb_inbox(recipient_id,client_id,categories,frequency,period_start,source_items) values(auth.uid(),target_client,p.categories,p.frequency,since_time,vb_private.digest_items(target_client,p.categories,since_time)) returning id into result;
 return result;
end;$$;
-- Resolve sources again when opened: removed uploads/withdrawn dates never remain in a digest.
create function public.vb_open_inbox(target_client uuid,target_message uuid) returns jsonb
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
 return jsonb_build_object('id',msg.id,'client_id',msg.client_id,'created_at',msg.created_at,'period_start',msg.period_start,'frequency',msg.frequency,'read_at',msg.read_at,'items',items);
end;$$;
revoke all on function public.vb_save_digest_preferences(uuid,integer,jsonb),public.vb_generate_digest_sample(uuid,integer),public.vb_open_inbox(uuid,uuid) from public,anon;
grant execute on function public.vb_save_digest_preferences(uuid,integer,jsonb),public.vb_generate_digest_sample(uuid,integer),public.vb_open_inbox(uuid,uuid) to authenticated;
commit;
