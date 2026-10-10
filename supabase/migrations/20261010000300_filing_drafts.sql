-- Prepared only: apply through the project's normal database release process.
begin;
create table public.vb_filing_drafts (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.vb_clients(id),
 mark_id uuid not null references public.vb_marks(id),
 filing_type text not null default 'initial_application' check(filing_type='initial_application'),
 revision integer not null check(revision>0),
 updated_at timestamptz not null default now()
);
create table public.vb_filing_revisions (
 draft_id uuid not null references public.vb_filing_drafts(id),
 revision integer not null,
 input jsonb not null check(jsonb_typeof(input)='object'),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(draft_id,revision)
);
alter table public.vb_filing_drafts enable row level security;
alter table public.vb_filing_revisions enable row level security;
revoke all on public.vb_filing_drafts,public.vb_filing_revisions from public,anon,authenticated;
grant select on public.vb_filing_drafts,public.vb_filing_revisions to authenticated;
create policy filing_staff_read on public.vb_filing_drafts for select to authenticated using(vb_private.is_staff());
create policy filing_revision_staff_read on public.vb_filing_revisions for select to authenticated using(vb_private.is_staff());
-- No direct write grants: association and optimistic locking are checked together.
create function public.vb_save_filing_draft(target_client uuid,target_mark uuid,target_draft uuid,expected_revision integer,draft_input jsonb)
returns public.vb_filing_drafts language plpgsql security definer set search_path='' as $$
declare saved public.vb_filing_drafts;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA access required' using errcode='42501'; end if;
 if draft_input is null or jsonb_typeof(draft_input)<>'object' or octet_length(draft_input::text)>262144 then raise exception 'Invalid draft data' using errcode='22023'; end if;
 if exists(select 1 from jsonb_each(draft_input) e where jsonb_typeof(e.value)<>'string' or length(e.value #>> '{}')>16000) then raise exception 'Draft fields must be text, without document bytes' using errcode='22023'; end if;
 -- Lock parent records before checking active status and association.
 perform 1 from public.vb_clients where id=target_client and archived_at is null for update;
 if not found then raise exception 'Active client required' using errcode='22023'; end if;
 perform 1 from public.vb_marks where id=target_mark and client_id=target_client and archived_at is null for update;
 if not found then raise exception 'Active mark belonging to client required' using errcode='22023'; end if;
 if target_draft is null then
  if expected_revision is distinct from 0 then raise exception 'New draft requires revision zero' using errcode='PT409'; end if;
  insert into public.vb_filing_drafts(client_id,mark_id,revision) values(target_client,target_mark,1) returning * into saved;
 else
  update public.vb_filing_drafts set revision=revision+1,updated_at=now()
  where id=target_draft and client_id=target_client and mark_id=target_mark and revision=expected_revision returning * into saved;
  if not found then raise exception 'Draft changed; reopen before saving' using errcode='PT409'; end if;
 end if;
 insert into public.vb_filing_revisions(draft_id,revision,input,actor_id) values(saved.id,saved.revision,draft_input,auth.uid());
 return saved;
end; $$;
revoke all on function public.vb_save_filing_draft(uuid,uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.vb_save_filing_draft(uuid,uuid,uuid,integer,jsonb) to authenticated;
create table public.vb_filing_reviews (
 sequence bigint generated always as identity unique,
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null,
 revision integer not null,
 action text not null check(action in ('check','resolution','transfer_approval','comparison','readiness')),
 details jsonb not null check(jsonb_typeof(details)='object'),
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key(draft_id,revision) references public.vb_filing_revisions(draft_id,revision)
);
alter table public.vb_filing_reviews enable row level security;
revoke all on public.vb_filing_reviews from public,anon,authenticated;
grant select on public.vb_filing_reviews to authenticated;
create policy filing_review_staff_read on public.vb_filing_reviews for select to authenticated using(vb_private.is_staff());
create function public.vb_record_filing_review(target_draft uuid,expected_revision integer,review_action text,review_details jsonb)
returns public.vb_filing_reviews language plpgsql security definer set search_path='' as $$
declare
 draft public.vb_filing_drafts; saved public.vb_filing_reviews;
 checked public.vb_filing_reviews; approval public.vb_filing_reviews;
 row_data jsonb; saved_input jsonb;
begin
 if not vb_private.is_staff() then raise exception 'Staff MFA access required' using errcode='42501'; end if;
 select * into draft from public.vb_filing_drafts where id=target_draft;
 if not found then raise exception 'Draft unavailable' using errcode='22023'; end if;
 perform 1 from public.vb_clients where id=draft.client_id and archived_at is null for update;
 if not found then raise exception 'Active client required' using errcode='22023'; end if;
 perform 1 from public.vb_marks where id=draft.mark_id and client_id=draft.client_id and archived_at is null for update;
 if not found then raise exception 'Active mark required' using errcode='22023'; end if;
 select * into draft from public.vb_filing_drafts where id=target_draft for update;
 if draft.revision is distinct from expected_revision then raise exception 'Draft changed; review current revision' using errcode='PT409'; end if;
 if review_action is null or review_action not in ('check','resolution','transfer_approval','readiness') or review_details is null or jsonb_typeof(review_details)<>'object' or octet_length(review_details::text)>262144 then raise exception 'Invalid review data' using errcode='22023'; end if;
 select input into saved_input from public.vb_filing_revisions where draft_id=target_draft and revision=expected_revision;
 select * into checked from public.vb_filing_reviews where draft_id=target_draft and revision=expected_revision and action='check' order by sequence desc limit 1;
 if review_action='check' then
  if review_details->'input' is distinct from saved_input or review_details->>'version' is distinct from 'prototype-2' then raise exception 'Check must reference exact saved input and supported checker' using errcode='22023'; end if;
  if jsonb_typeof(review_details->'rows') is distinct from 'array' then raise exception 'Check rows required' using errcode='22023'; end if;
  if jsonb_array_length(review_details->'rows')=0 then raise exception 'Check rows required' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(review_details->'rows') r where jsonb_typeof(r)<>'object' or nullif(r->>'id','') is null or (r->>'status') is null or (r->>'status') not in ('PASS','REVIEW','MISSING INFORMATION','BLOCKING ISSUE')) or
   (select count(*) from jsonb_array_elements(review_details->'rows'))<>(select count(distinct r->>'id') from jsonb_array_elements(review_details->'rows') r) then raise exception 'Invalid or duplicate check rows' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(review_details->'rows') r where r->>'id' in ('legal','support') and r->>'status'<>'REVIEW') then raise exception 'Attorney review cannot be automatically passed' using errcode='22023'; end if;
  if not (select array_agg(r->>'id') from jsonb_array_elements(review_details->'rows') r) @> array['supported','contacts','owner','mark','scope','basis','legal','support'] then raise exception 'Complete preparation checklist required' using errcode='22023'; end if;
 else
  if checked.id is null or review_details->>'check_id' is distinct from checked.id::text then raise exception 'Latest check required' using errcode='PT409'; end if;
  if review_action='resolution' then
   select r into row_data from jsonb_array_elements(checked.details->'rows') r where r->>'id'=review_details->>'issue_id';
   if row_data is null or row_data->>'status' not in ('REVIEW','MISSING INFORMATION') or nullif(btrim(review_details->>'reason'),'') is null or length(review_details->>'reason')>1500 or coalesce(review_details->>'kind','') not in ('Reviewed','Override') then raise exception 'Reviewable issue and attorney reason required' using errcode='22023'; end if;
  else
   -- All non-passing reviewable items need decisions after this exact check.
   if exists(select 1 from jsonb_array_elements(checked.details->'rows') r where r->>'status'='BLOCKING ISSUE' or (r->>'status'<>'PASS' and not exists(select 1 from public.vb_filing_reviews e where e.draft_id=target_draft and e.revision=expected_revision and e.action='resolution' and e.sequence>checked.sequence and e.details->>'check_id'=checked.id::text and e.details->>'issue_id'=r->>'id'))) then raise exception 'Resolve checklist before approval' using errcode='22023'; end if;
   select * into approval from public.vb_filing_reviews where draft_id=target_draft and revision=expected_revision and action='transfer_approval' and sequence>checked.sequence order by sequence desc limit 1;
   if review_action='readiness' then
    if approval.id is null or review_details->>'approval_id' is distinct from approval.id::text or exists(select 1 from public.vb_filing_reviews where draft_id=target_draft and revision=expected_revision and action='resolution' and sequence>approval.sequence) then raise exception 'Current transfer approval required' using errcode='PT409'; end if;
   end if;
   if review_action='readiness' then
    if review_details->'manual_review_confirmed' is distinct from 'true'::jsonb then raise exception 'Explicit attorney manual review required' using errcode='22023'; end if;
   end if;
  end if;
 end if;
 -- Actor identity, time and event order come from the database, not supplied details.
 insert into public.vb_filing_reviews(draft_id,revision,action,details,actor_id) values(target_draft,expected_revision,review_action,review_details,auth.uid()) returning * into saved;
 return saved;
end; $$;
revoke all on function public.vb_record_filing_review(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.vb_record_filing_review(uuid,integer,text,jsonb) to authenticated;
commit;
