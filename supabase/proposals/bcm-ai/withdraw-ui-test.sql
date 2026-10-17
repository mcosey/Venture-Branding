-- Admin Test harness: withdraw only the explicitly labeled temporary UI publication.
-- Exercises the review RPC with a transaction-local staff test context, not a fresh MFA login.
-- Preserves observations, prior approval, review/audit rows and all research results.
begin;
do $$
declare finding uuid; rev integer; staff uuid;
begin
 if (select system_identifier::text from pg_control_system()) <> '7692130048193495360' then raise exception 'BCM Test required';end if;
 if (select ready from vb_private.bcm_ai_config) or (select ready from vb_private.bcm_scheduler_config) then raise exception 'Pause research first';end if;
 select o.id,o.revision,p.approved_by into finding,rev,staff
 from public.vb_bcm_ai_observations o join public.vb_bcm_ai_publications p on p.finding_id=o.id
 where o.client_id='b9100000-0000-0000-0000-000000000001' and o.domain='harvey.ai' and o.name='Harvey II' and o.state='approved' and p.withdrawn_at is null
 and exists(select 1 from public.vb_bcm_ai_reviews r where r.finding_id=o.id and r.actor=p.approved_by and r.decision='approve' and r.note='TEST ONLY: exercising approval and withdrawal of a public research observation; no legal conclusion or new-launch claim.');
 if finding is null or not exists(select 1 from vb_private.staff_members where user_id=staff and active) then raise exception 'Expected temporary Test approval not found';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff,'role','authenticated','aal','aal2')::text,true);
 perform public.vb_review_bcm_ai_finding(finding,rev,'dismiss','TEST ONLY: admin test harness withdrawing the temporary approval after client display verification. No legal conclusion.');
 if not exists(select 1 from public.vb_bcm_ai_publications where finding_id=finding and withdrawn_at is not null) then raise exception 'Withdrawal failed';end if;
end; $$;
commit;
select 'Temporary Test publication withdrawn; research remains paused' as result;
