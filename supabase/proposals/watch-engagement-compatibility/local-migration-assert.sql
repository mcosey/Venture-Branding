-- LOCAL HARNESS ONLY. Do not include in the hosted package.
do $$ begin
 if not exists(select 1 from vb_private.watch_scope_settings n join vb_private.watch_settings old using(client_id)
 where n.client_id='f1a00000-0000-0000-0000-000000000001' and to_jsonb(n)-array['id','engagement_id']=to_jsonb(old)
 and n.engagement_id='f1a10000-0000-0000-0000-000000000001') then raise exception 'Migration changed settings values or scope'; end if;
 if (select version from vb_private.watch_settings where client_id='f1a00000-0000-0000-0000-000000000002')<>3
 or exists(select 1 from vb_private.watch_scope_settings where client_id='f1a00000-0000-0000-0000-000000000002') then raise exception 'Legacy settings changed'; end if;
 if not exists(select 1 from vb_private.watch_runs r join vb_private.watch_scope_settings s on s.id=r.configuration_id and s.client_id=r.client_id
 join vb_private.legacy_test_record_scopes l on l.resource='vb_private.watch_runs' and l.record_key=jsonb_build_object('id',r.id) and l.engagement_id=s.engagement_id
 where r.id='f1a40000-0000-0000-0000-000000000001' and r.settings_version=7) then raise exception 'History scope changed'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if public.vb_watch_snapshot('f1a00000-0000-0000-0000-000000000002') ? 'scoped' then raise exception 'Legacy snapshot contract changed'; end if;
 if (public.vb_watch_save('f1a00000-0000-0000-0000-000000000002',3,'{}',false)->>'version')::integer<>4 then raise exception 'Legacy save contract changed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
