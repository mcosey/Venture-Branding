-- PREPARED ONLY. Additive Watch schema; no jobs or enrolled clients.
begin;
create table vb_private.watch_config (singleton boolean primary key default true check(singleton), enabled boolean not null default false);
insert into vb_private.watch_config default values;
create table vb_private.watch_settings (
 client_id uuid primary key references public.vb_clients(id), mark_ids uuid[] not null default '{}',
 enabled boolean not null default false, version integer not null default 0,
 started_on date, next_run_at timestamptz, updated_at timestamptz not null default now()
);
create table vb_private.watch_files (
 id uuid primary key default gen_random_uuid(), filename text not null, revision text not null,
 manifest_revision text not null check(manifest_revision ~ '^[a-f0-9]{64}$'), data_date date not null, expected integer not null check(expected between 0 and 20000),
 received integer not null default 0, completed_at timestamptz, created_at timestamptz not null default now(),
 unique(filename,revision), check(filename ~ '^apc[0-9]{6}\.zip$'), check(revision ~ '^[a-f0-9]{64}$')
);
create table vb_private.watch_batches (
 file_id uuid references vb_private.watch_files(id), number integer check(number between 0 and 1999),
 payload jsonb not null, primary key(file_id,number), check(jsonb_typeof(payload)='array' and jsonb_array_length(payload) between 1 and 100)
);
create table vb_private.watch_applications (
 serial text primary key check(serial ~ '^[0-9]{8}$'), name text not null, filing_date date not null,
 goods jsonb not null, classes jsonb not null, owners jsonb not null, status_code text not null,
 file_id uuid not null references vb_private.watch_files(id), updated_at timestamptz not null default now(),
 check(length(name) between 1 and 2000)
);
create table vb_private.watch_runs (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.vb_clients(id),
 checked_at timestamptz not null default clock_timestamp(), coverage_from date, coverage_to date,
 status text not null check(status in ('completed','incomplete')), missing_dates date[] not null default '{}',
 finding_count integer not null default 0, settings_version integer not null
);
create table vb_private.watch_findings (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.vb_clients(id),
 mark_id uuid not null references public.vb_marks(id), serial text not null,
 evidence jsonb not null, reason text not null, version integer not null default 1,
 review_status text not null default 'unreviewed' check(review_status in ('unreviewed','dismissed','approved')),
 private_note text not null default '', publication jsonb, first_seen_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(client_id,mark_id,serial)
);
create table vb_private.watch_review_history (
 id bigint generated always as identity primary key, finding_id uuid references vb_private.watch_findings(id),
 actor_id uuid, occurred_at timestamptz not null default now(), previous jsonb not null, action text not null
);
-- Only guarded RPCs expose projections; no client/staff direct raw-table access.
revoke all on vb_private.watch_config,vb_private.watch_settings,vb_private.watch_files,vb_private.watch_batches,
 vb_private.watch_applications,vb_private.watch_runs,vb_private.watch_findings,vb_private.watch_review_history from public,anon,authenticated,service_role;
create function vb_private.watch_access(c uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not (vb_private.is_staff() or vb_private.is_client_member(c)) or not exists(select 1 from public.vb_clients where id=c and archived_at is null and portal_enabled) then
  raise exception 'Watch workspace unavailable' using errcode='42501';
 end if;
end $$;
create function vb_private.watch_normalize(s text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(lower(s),'[^a-z0-9]','','g');
$$;
-- Bounded lexical edit distance only. No phonetic, logo or legal judgment.
create function vb_private.watch_reason(a text,b text) returns text language plpgsql immutable set search_path='' as $$
declare x text:=vb_private.watch_normalize(a); y text:=vb_private.watch_normalize(b); p integer[]; q integer[]; i integer; j integer; min_cost integer;
begin
 if a ~ '[^ -~]' or b ~ '[^ -~]' then return null; end if;
 if x='' or y='' then return null; end if;
 if x=y then return 'Same name after ignoring spaces, punctuation and letter case'; end if;
 if length(x)>80 or length(y)>80 or least(length(x),length(y))<5 or abs(length(x)-length(y))>2 then return null; end if;
 p:=array(select generate_series(0,length(y)));
 for i in 1..length(x) loop
  q:=array_fill(3,array[length(y)+1]); q[1]:=i; min_cost:=least(i,3);
  for j in greatest(1,i-2)..least(length(y),i+2) loop
   q[j+1]:=least(3,q[j]+1,p[j+1]+1,p[j]+case when substr(x,i,1)=substr(y,j,1) then 0 else 1 end);
   min_cost:=least(min_cost,q[j+1]);
  end loop;
  if min_cost>2 then return null; end if;
  p:=q;
 end loop;
 if p[length(y)+1]<=2 then return 'Name differs by '||p[length(y)+1]||' letter insertions, removals or substitutions'; end if;
 return null;
end $$;
alter table vb_private.watch_applications add column name_key text generated always as (vb_private.watch_normalize(name)) stored;
create index watch_applications_key_length on vb_private.watch_applications ((length(name_key)));
create function public.vb_watch_save(target_client uuid,expected_version integer,selected_marks uuid[],monitoring boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s vb_private.watch_settings; enabled_before boolean;
begin
 perform vb_private.watch_access(target_client);
 -- Client lock serializes first save and concurrent updates and mark ownership changes.
 perform 1 from public.vb_clients where id=target_client for update;
 insert into vb_private.watch_settings(client_id) values(target_client) on conflict do nothing;
 select * into s from vb_private.watch_settings where client_id=target_client for update;
 if s.version<>expected_version then raise exception 'Watch settings changed' using errcode='40001'; end if;
 if selected_marks is null or cardinality(selected_marks)>10 or cardinality(selected_marks)<>(select count(distinct x) from unnest(selected_marks) x) then raise exception 'Choose up to ten marks' using errcode='22023'; end if;
 if (select count(*) from public.vb_marks where client_id=target_client and id=any(selected_marks) and mark_type='word' and archived_at is null)<>cardinality(selected_marks) then raise exception 'Word mark unavailable' using errcode='22023'; end if;
 if monitoring and (cardinality(selected_marks)=0 or not (select enabled from vb_private.watch_config)) then raise exception 'Monitoring is not ready' using errcode='22023'; end if;
 enabled_before:=s.enabled;
 update vb_private.watch_settings set mark_ids=selected_marks,enabled=monitoring,version=version+1,updated_at=now(),
 started_on=case when monitoring then coalesce(started_on,current_date) else started_on end,
 next_run_at=case when not monitoring then null when not enabled_before or selected_marks is distinct from s.mark_ids then now() else next_run_at end
 where client_id=target_client returning * into s;
 return to_jsonb(s);
end $$;
create function public.vb_watch_snapshot(target_client uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare staff boolean; s jsonb; f jsonb; r jsonb;
begin
 perform vb_private.watch_access(target_client); staff:=vb_private.is_staff();
 select to_jsonb(t) into s from vb_private.watch_settings t where client_id=target_client;
 select coalesce(jsonb_agg(v order by v->>'first_seen_at' desc),'[]') into f from (
  select case when staff then jsonb_build_object('id',id,'mark_id',mark_id,'serial',serial,'evidence',evidence,'reason',reason,'version',version,'review_status',review_status,'private_note',private_note,'publication',publication,'first_seen_at',first_seen_at)
   else publication||jsonb_build_object('id',id,'mark_id',mark_id,'serial',serial,'first_seen_at',first_seen_at) end v
  from vb_private.watch_findings where client_id=target_client and (staff or (publication is not null and exists(select 1 from public.vb_marks m where m.id=mark_id and m.client_id=target_client and m.archived_at is null)))
  order by first_seen_at desc limit 200
 ) rows;
 select coalesce(jsonb_agg(to_jsonb(t) order by checked_at desc),'[]') into r from (
  select id,checked_at,coverage_from,coverage_to,status,missing_dates,settings_version from vb_private.watch_runs where client_id=target_client order by checked_at desc limit 20
 ) t;
 return jsonb_build_object('settings',coalesce(s,jsonb_build_object('client_id',target_client,'version',0,'mark_ids','[]'::jsonb,'enabled',false)),
 'ready',(select enabled from vb_private.watch_config),'latest_source_date',(select max(data_date) from vb_private.watch_files where completed_at is not null),
 'findings',f,'runs',r,'staff',staff,'limit',200);
end $$;
create function public.vb_watch_review(target_client uuid,target_finding uuid,expected_version integer,decision text,private_note text,client_summary text)
returns void language plpgsql security definer set search_path='' as $$
declare f vb_private.watch_findings;
begin
 perform vb_private.watch_access(target_client);
 if not vb_private.is_staff() then raise exception 'Attorney review required' using errcode='42501'; end if;
 if decision not in ('unreviewed','dismissed','approved') or length(private_note)>4000 or length(client_summary)>2000 or private_note is null or client_summary is null then raise exception 'Review invalid' using errcode='22023'; end if;
 if decision='approved' and length(btrim(client_summary))<1 then raise exception 'Client summary required' using errcode='22023'; end if;
 select * into f from vb_private.watch_findings where id=target_finding and client_id=target_client for update;
 if not found then raise exception 'Finding unavailable' using errcode='42501'; end if;
 if not exists(select 1 from public.vb_marks where id=f.mark_id and client_id=target_client and archived_at is null) then raise exception 'Monitored mark unavailable' using errcode='42501'; end if;
 if f.version<>expected_version then raise exception 'Finding changed; review again' using errcode='40001'; end if;
 insert into vb_private.watch_review_history(finding_id,actor_id,previous,action) values(f.id,auth.uid(),to_jsonb(f),decision);
 update vb_private.watch_findings set review_status=decision,private_note=vb_watch_review.private_note,version=version+1,updated_at=now(),
 publication=case when decision='approved' then jsonb_build_object('evidence',f.evidence,'reason',f.reason,'summary',client_summary,'reviewed_at',now(),'review_status','approved') else null end
 where id=f.id;
end $$;
-- Called by the narrow ingest function only; service-role RPC, never granted to users.
create function public.vb_watch_ingest(details jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare f vb_private.watch_files; d date; rec jsonb; existing jsonb; total integer; file_date date;
begin
 if not (select enabled from vb_private.watch_config) then raise exception 'Watch ingestion is disabled'; end if;
 perform pg_advisory_xact_lock(73772131);
 if details->>'action'='inventory' then
  return jsonb_build_object('files',(select coalesce(jsonb_agg(jsonb_build_object('filename',filename,'manifest_revision',manifest_revision)),'[]') from vb_private.watch_files where completed_at is not null and data_date>=current_date-35));
 end if;
 if details->>'action'='begin' then
  file_date:=to_date(substring(details->>'filename' from 4 for 6),'YYMMDD');
  if details->>'filename'<>('apc'||to_char(file_date,'YYMMDD')||'.zip') or file_date>current_date or file_date<current_date-35 then raise exception 'File date outside coverage'; end if;
  insert into vb_private.watch_files(filename,revision,manifest_revision,data_date,expected)
   values(details->>'filename',details->>'revision',details->>'manifest_revision',file_date,(details->>'expected')::integer) on conflict do nothing;
  select * into f from vb_private.watch_files where filename=details->>'filename' and revision=details->>'revision' for update;
  if f.completed_at is not null then update vb_private.watch_files set manifest_revision=details->>'manifest_revision' where id=f.id; end if;
  if f.expected<>(details->>'expected')::integer then raise exception 'File manifest changed'; end if;
  return jsonb_build_object('id',f.id,'complete',f.completed_at is not null);
 end if;
 select * into f from vb_private.watch_files where id=(details->>'file_id')::uuid for update;
 if not found then raise exception 'File unavailable'; end if;
 if f.completed_at is not null then return jsonb_build_object('complete',true); end if;
 if details->>'action'='batch' then
  select payload into existing from vb_private.watch_batches where file_id=f.id and number=(details->>'number')::integer;
  if existing is not null and existing<>details->'records' then raise exception 'Batch changed'; end if;
  insert into vb_private.watch_batches(file_id,number,payload) values(f.id,(details->>'number')::integer,details->'records') on conflict do nothing;
  select coalesce(sum(jsonb_array_length(payload)),0) into total from vb_private.watch_batches where file_id=f.id;
  if total>f.expected then raise exception 'Too many records'; end if;
  update vb_private.watch_files set received=total where id=f.id;
  return jsonb_build_object('received',total);
 end if;
 if details->>'action'<>'complete' or f.received<>f.expected then raise exception 'File is incomplete'; end if;
 if f.expected>0 and (select count(*)<>max(number)+1 or min(number)<>0 from vb_private.watch_batches where file_id=f.id) then raise exception 'Batch sequence incomplete'; end if;
 for rec in select value from vb_private.watch_batches b cross join lateral jsonb_array_elements(b.payload) where b.file_id=f.id order by b.number loop
  d:=(rec->>'filing_date')::date;
  if d>f.data_date or d<f.data_date-30 then raise exception 'Application outside filing lookback'; end if;
  insert into vb_private.watch_applications(serial,name,filing_date,goods,classes,owners,status_code,file_id)
   values(rec->>'serial',rec->>'name',d,rec->'goods',rec->'classes',rec->'owners',rec->>'status_code',f.id)
   on conflict(serial) do update set name=excluded.name,filing_date=excluded.filing_date,goods=excluded.goods,classes=excluded.classes,
    owners=excluded.owners,status_code=excluded.status_code,file_id=excluded.file_id,updated_at=now()
   where (select data_date from vb_private.watch_files where id=vb_private.watch_applications.file_id)<=f.data_date;
 end loop;
 update vb_private.watch_files set completed_at=now() where id=f.id;
 delete from vb_private.watch_batches where file_id=f.id;
 return jsonb_build_object('complete',true);
end $$;
create function public.vb_watch_run_due() returns jsonb language plpgsql security definer set search_path='' as $$
declare s vb_private.watch_settings; ending date; missing date[]; a record; finding_evidence jsonb; why text; count_new integer; processed integer:=0; old vb_private.watch_findings;
begin
 if not (select enabled from vb_private.watch_config) then raise exception 'Watch checks disabled'; end if;
 -- Serialize ingestion completion and checks; no matching partly committed files.
 perform pg_advisory_xact_lock(73772131);
 select max(data_date) into ending from vb_private.watch_files where completed_at is not null;
 for s in select ws.* from vb_private.watch_settings ws join public.vb_clients c on c.id=ws.client_id
 where ws.enabled and ws.next_run_at<=now() and c.archived_at is null and c.portal_enabled
 order by ws.next_run_at limit 1 for update of ws skip locked loop
  count_new:=0;
  select array_agg(x::date) into missing from generate_series(coalesce(ending,current_date-1)-6,coalesce(ending,current_date-1),'1 day') x
   where not exists(select 1 from vb_private.watch_files where completed_at is not null and data_date=x::date);
  if ending is null or ending<current_date-2 or missing is not null then
   insert into vb_private.watch_runs(client_id,coverage_from,coverage_to,status,missing_dates,settings_version)
    values(s.client_id,coalesce(ending,current_date-1)-6,ending,'incomplete',coalesce(missing,'{}'),s.version);
   -- Retry tomorrow without pretending the weekly check completed.
   update vb_private.watch_settings set next_run_at=now()+interval '1 day' where client_id=s.client_id;
   continue;
  end if;
  -- Withdraw outdated approved copies before rematching, including a name that no longer matches.
  for old in select f.* from vb_private.watch_findings f join public.vb_marks m on m.id=f.mark_id
   join vb_private.watch_applications p on p.serial=f.serial where f.client_id=s.client_id and
    (f.evidence->>'name' is distinct from p.name or f.evidence->>'monitored_name' is distinct from m.name
     or f.evidence->>'filing_date' is distinct from p.filing_date::text
     or f.evidence->'goods' is distinct from p.goods or f.evidence->'classes' is distinct from p.classes
     or f.evidence->'owners' is distinct from p.owners or f.evidence->>'status_code' is distinct from p.status_code)
   for update of f loop
   insert into vb_private.watch_review_history(finding_id,previous,action) values(old.id,to_jsonb(old),'source_changed');
   select jsonb_build_object('name',p.name,'monitored_name',m.name,'filing_date',p.filing_date,'goods',p.goods,'classes',p.classes,'owners',p.owners,'status_code',p.status_code,
    'source_file',w.filename,'source_date',w.data_date,'source_revision',w.revision,'checked_at',now()),
    coalesce(vb_private.watch_reason(m.name,p.name),'Name no longer meets the automatic matching rule; re-review required')
   into finding_evidence,why from public.vb_marks m cross join vb_private.watch_applications p join vb_private.watch_files w on w.id=p.file_id
    where m.id=old.mark_id and p.serial=old.serial;
   update vb_private.watch_findings set evidence=finding_evidence,reason=why,version=version+1,publication=null,review_status='unreviewed',updated_at=now() where id=old.id;
  end loop;
  for a in select m.id mark_id,m.name monitored_name,p.* from public.vb_marks m cross join vb_private.watch_applications p
   where m.client_id=s.client_id and m.id=any(s.mark_ids) and m.mark_type='word' and m.archived_at is null
    and p.filing_date>=greatest(s.started_on-30,ending-30) and p.filing_date<=ending
    and p.serial is distinct from m.application_number
    and m.name !~ '[^ -~]' and p.name !~ '[^ -~]'
    and (p.name_key=vb_private.watch_normalize(m.name) or
     (length(vb_private.watch_normalize(m.name)) between 5 and 80 and
      abs(length(p.name_key)-length(vb_private.watch_normalize(m.name)))<=2)) loop
   why:=vb_private.watch_reason(a.monitored_name,a.name); if why is null then continue; end if;
   finding_evidence:=jsonb_build_object('name',a.name,'monitored_name',a.monitored_name,'filing_date',a.filing_date,'goods',a.goods,'classes',a.classes,'owners',a.owners,'status_code',a.status_code,
    'source_file',(select filename from vb_private.watch_files where id=a.file_id),'source_date',(select data_date from vb_private.watch_files where id=a.file_id),
    'source_revision',(select revision from vb_private.watch_files where id=a.file_id),'checked_at',now());
   select * into old from vb_private.watch_findings where client_id=s.client_id and mark_id=a.mark_id and serial=a.serial for update;
   if not found then
    insert into vb_private.watch_findings(client_id,mark_id,serial,evidence,reason) values(s.client_id,a.mark_id,a.serial,finding_evidence,why); count_new:=count_new+1;
   elsif (old.evidence-'checked_at'-'source_file'-'source_date'-'source_revision') is distinct from (finding_evidence-'checked_at'-'source_file'-'source_date'-'source_revision') or old.reason<>why then
    insert into vb_private.watch_review_history(finding_id,previous,action) values(old.id,to_jsonb(old),'source_changed');
    update vb_private.watch_findings set evidence=finding_evidence,reason=why,version=version+1,review_status='unreviewed',publication=null,updated_at=now() where id=old.id;
   end if;
  end loop;
  insert into vb_private.watch_runs(client_id,coverage_from,coverage_to,status,finding_count,settings_version) values(s.client_id,ending-6,ending,'completed',count_new,s.version);
  update vb_private.watch_settings set next_run_at=now()+interval '7 days' where client_id=s.client_id;
  processed:=processed+1;
 end loop;
 return jsonb_build_object('completed_clients',processed,'pending',exists(select 1 from vb_private.watch_settings ws join public.vb_clients c on c.id=ws.client_id where ws.enabled and ws.next_run_at<=now() and c.archived_at is null and c.portal_enabled));
end $$;
-- Explicit default-privilege protection for all new helpers and endpoints.
revoke all on function vb_private.watch_access(uuid),vb_private.watch_normalize(text),vb_private.watch_reason(text,text) from public,anon,authenticated,service_role;
revoke all on function public.vb_watch_save(uuid,integer,uuid[],boolean),public.vb_watch_snapshot(uuid),public.vb_watch_review(uuid,uuid,integer,text,text,text),public.vb_watch_ingest(jsonb),public.vb_watch_run_due() from public,anon,authenticated,service_role;
grant execute on function public.vb_watch_save(uuid,integer,uuid[],boolean),public.vb_watch_snapshot(uuid),public.vb_watch_review(uuid,uuid,integer,text,text,text) to authenticated;
grant execute on function public.vb_watch_ingest(jsonb),public.vb_watch_run_due() to service_role;
commit;
