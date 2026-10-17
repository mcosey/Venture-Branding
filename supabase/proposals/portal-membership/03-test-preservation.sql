-- Read only. Compare with pre-application baseline.
select jsonb_build_object(
 'system_identifier',(select system_identifier::text from pg_control_system()),
 'clients',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(jsonb_agg(c order by id)::text,''))) from public.vb_clients c),
 'memberships',(select jsonb_build_object('count',count(*),'hash',md5(coalesce(jsonb_agg(m order by client_id,user_id)::text,''))) from vb_private.client_memberships m),
 'new_accounts',(select count(*) from vb_private.portal_accounts),
 'new_engagements',(select count(*) from public.vb_engagements),
 'new_policy_versions',(select count(*) from vb_private.portal_policy_versions)
) as preserved;
