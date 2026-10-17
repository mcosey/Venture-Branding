-- Read-only counts/fingerprints; no private planning text returned.
with actor as (select id from auth.users where lower(email)='mithrilzeppelin117+newclient@gmail.com'), owned as (select id from public.vb_member_companies where owner_id=(select id from actor))
select jsonb_build_object(
 'test_database',(select system_identifier::text from pg_control_system())='7692130048193495360',
 'engagements',(select jsonb_agg(jsonb_build_object('id',e.id,'status',e.status,'title',e.title) order by e.id) from public.vb_engagements e join vb_private.engagement_grants g on g.engagement_id=e.id where g.user_id=(select id from actor)),
 'original_engagements',(select jsonb_agg(jsonb_build_object('id',id,'status',status) order by id) from public.vb_engagements where client_id='b9100000-0000-0000-0000-000000000001' and id not in ('79f4529c-7e06-45e8-8877-353a417562c1','f1950000-0000-0000-0000-000000000001')),
 'progress_rows',(select count(*) from public.vb_member_progress where company_id in(select id from owned)),
 'progress_fingerprint',(select md5(coalesce(jsonb_agg(to_jsonb(p) order by company_id,milestone_id)::text,'[]')) from public.vb_member_progress p where company_id in(select id from owned)),
 'profile_fingerprint',(select md5(coalesce(jsonb_agg(to_jsonb(p) order by user_id)::text,'[]')) from public.vb_member_profiles p where user_id=(select id from actor)),
 'company_fingerprint',(select md5(coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'[]')) from public.vb_member_companies c where id in(select id from owned)),
 'retained_fixture_marks',(select count(*) from public.vb_marks where id in('f1970000-0000-0000-0000-000000000001','f1970000-0000-0000-0000-000000000002')),
 'ai_ready',(select ready from vb_private.bcm_ai_config where singleton),
 'scheduler_ready',(select ready from vb_private.bcm_scheduler_config where singleton),
 'watch_enabled',(select enabled from vb_private.watch_config where singleton)
) as lifecycle_state;
