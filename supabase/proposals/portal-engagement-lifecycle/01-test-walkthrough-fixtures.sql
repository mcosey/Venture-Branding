-- Awaiting action-time approval. Test-only live UI walkthrough fixtures.
-- Adds one all-features engagement for the already accepted plus-address Test user.
-- No Auth account, email, legacy record remapping, scheduler or research changes.
begin;
do $$
declare actor uuid; a uuid:='79f4529c-7e06-45e8-8877-353a417562c1'; b uuid:='f1950000-0000-0000-0000-000000000001'; cid uuid:='b9100000-0000-0000-0000-000000000001'; ma uuid;
begin
 if (select system_identifier::text from pg_control_system())<>'7692130048193495360' then raise exception 'Wrong Test database';end if;
 select id into strict actor from auth.users where lower(email)='mithrilzeppelin117+newclient@gmail.com' and email_confirmed_at is not null;
 perform 1 from public.vb_clients where id=cid and archived_at is null and portal_enabled for update;
 if not found then raise exception 'Fictional client unavailable';end if;
 if not exists(select 1 from vb_private.engagement_grants g join public.vb_engagements e on e.id=g.engagement_id where g.user_id=actor and e.id=a and e.client_id=cid and e.status='active' and g.status='active' and g.accepted_at is not null) then raise exception 'Expected accepted Test engagement missing';end if;
 if (select count(*) from vb_private.engagement_grants g join public.vb_engagements e on e.id=g.engagement_id where g.user_id=actor and g.status='active' and g.accepted_at is not null and e.status='active')<>1 then raise exception 'Unexpected existing access';end if;
 if not exists(select 1 from vb_private.legacy_test_mappings where client_id=cid and enforcement_enabled) then raise exception 'Enforcement unavailable';end if;
 select id into strict ma from public.vb_matters where engagement_id=a;
 insert into public.vb_engagements(id,client_id,title,status,activated_at) values(b,cid,'FICTIONAL TEST — lifecycle companion','active',now());
 insert into public.vb_matters(id,engagement_id,title) values('f1960000-0000-0000-0000-000000000001',b,'FICTIONAL TEST — companion matter');
 insert into vb_private.engagement_grants(engagement_id,user_id,status,accepted_at) values(b,actor,'active',now());
 if (select count(*) from vb_private.engagement_services where engagement_id=b and enabled)<>8 then raise exception 'All-feature default missing';end if;
 insert into public.vb_marks(id,client_id,name,mark_type,status) values
 ('f1970000-0000-0000-0000-000000000001',cid,'FICTIONAL LIFECYCLE A','word','not_filed'),
 ('f1970000-0000-0000-0000-000000000002',cid,'FICTIONAL LIFECYCLE B','word','not_filed');
 -- Reassign only these newly created fixture roots; retained legal records untouched.
 update vb_private.legacy_test_record_scopes set engagement_id=a,matter_id=ma
 where resource='public.vb_marks' and record_key=jsonb_build_object('id','f1970000-0000-0000-0000-000000000001'::uuid);
 if not found then raise exception 'A scope missing';end if;
 update vb_private.legacy_test_record_scopes set engagement_id=b,matter_id='f1960000-0000-0000-0000-000000000001'
 where resource='public.vb_marks' and record_key=jsonb_build_object('id','f1970000-0000-0000-0000-000000000002'::uuid);
 if not found then raise exception 'B scope missing';end if;
end $$;
commit;
