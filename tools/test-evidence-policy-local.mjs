// Optional isolated SQL regression runner. Uses an ALREADY INSTALLED runtime;
// never installs packages, contacts Supabase or connects to an external database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
if(!process.env.PGLITE_MODULE)throw Error('Set PGLITE_MODULE to an already installed PGlite ESM path. Do not install software for this check.');
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const directory='supabase/proposals/evidence-policy-correction/';
const apply=await read(directory+'01-prepared-apply.sql');
const innerApply=apply.replace(/^begin;$/m,'').replace(/^commit;$/m,'');
const fixtures=await read(directory+'local-fixtures.sql');
const foundation=await read('supabase/migrations/20261003000100_client_foundation.sql');
const original=await read('supabase/proposals/evidence/001-evidence.sql');
const removal=await read('supabase/proposals/evidence/002-evidence-removal.sql');
const scope=await read('supabase/proposals/portal-engagement-cutover/06-test-service-enforcement.sql');
const reports=[];
let checks=0;
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const id=(prefix,n)=>prefix+'e210000-0000-0000-0000-'+String(n).padStart(12,'0');

for(const scoped of [false,true]){
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role;
   create schema auth; create table auth.users(id uuid primary key,email text);
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
   grant usage on schema auth to anon,authenticated,service_role;
   create schema storage;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
   alter table storage.objects enable row level security;
   grant usage on schema storage to authenticated; grant select on storage.objects to authenticated;`);
  // Maintained SQL, not a hand-rewritten copy of the vulnerable predicate/helpers.
  await db.exec(foundation);
  await db.exec(original);
  await db.exec(removal);
  // Match the reviewed installed backend-only completion grant.
  await db.exec('revoke all on function public.vb_finish_evidence(uuid,uuid) from public,anon,authenticated;');
  if(scoped){
   // A narrow scope-adapter fixture, NOT a reconstruction of Test's engagement
   // engine. It denies one evidence record even when client membership is valid.
   await db.exec(`create function vb_private.portal_row_read(cid uuid,resource text,key_value jsonb,feature text) returns boolean
    language sql stable security definer set search_path='' as $$
    select vb_private.is_staff() or (vb_private.is_client_member(cid) and
    (resource<>'public.vb_evidence' or key_value->>'id'<>'${id('e',7)}'))$$;
    revoke all on function vb_private.portal_row_read(uuid,text,jsonb,text) from public,anon;
    grant execute on function vb_private.portal_row_read(uuid,text,jsonb,text) to authenticated;`);
   for(const table of ['vb_evidence','vb_marks']){
    const line=scope.split('\n').find(x=>x.startsWith('create policy portal_scoped_read on public.'+table+' '));
    assert.ok(line,'Maintained restrictive policy missing');await db.exec(line);
   }
   const start=scope.indexOf('CREATE OR REPLACE FUNCTION vb_private.can_read_evidence_object(path text)');
   assert.ok(start>=0,'Maintained scoped download helper missing');
   const end=scope.indexOf('$function$;',start)+'$function$;'.length;
   await db.exec(scope.slice(start,end));
  }
  const snapshot=async()=>({
   policies:(await db.query(`select oid,polrelid::regclass::text as relation,polname,polcmd,polpermissive,polroles,
    pg_get_expr(polqual,polrelid) as expression,pg_get_expr(polwithcheck,polrelid) as check_expression
    from pg_policy order by polrelid,polname`)).rows,
   tables:(await db.query(`select c.oid::regclass::text as relation,c.relrowsecurity,c.relforcerowsecurity,c.relacl
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','vb_private','storage','auth')
    and c.relkind in('r','S') order by c.oid`)).rows,
   functions:(await db.query(`select p.oid::regprocedure::text as function,p.proacl,md5(pg_get_functiondef(p.oid)) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','vb_private','auth') order by p.oid`)).rows,
   constraints:(await db.query(`select oid,pg_get_constraintdef(oid) as definition from pg_constraint where connamespace in
    (select oid from pg_namespace where nspname in('public','vb_private','storage','auth')) order by oid`)).rows,
   data:(await db.query(`select * from (select 'evidence' as kind,to_jsonb(e) as row from public.vb_evidence e union all
    select 'marks',to_jsonb(m) from public.vb_marks m union all select 'clients',to_jsonb(c) from public.vb_clients c union all
    select 'objects',to_jsonb(o) from storage.objects o union all select 'bucket',to_jsonb(b) from storage.buckets b) records
    order by kind,row::text`)).rows
  });
  const asUser=async(n,aal,query)=>{
   await db.exec(`set local role authenticated;select set_config('request.jwt.claims','${JSON.stringify({sub:id('a',n),role:'authenticated',aal})}',true);`);
   try{return (await db.query(query)).rows;}finally{await db.exec('reset role;');}
  };
  const rows=async(n,aal='aal1')=>(await asUser(n,aal,'select id from public.vb_evidence order by id')).map(r=>r.id);
  const files=async(n,aal='aal1')=>(await asUser(n,aal,"select name from storage.objects where bucket_id='vb-evidence' order by name")).map(r=>r.name);
  const denied=async(sql,pattern,label)=>{
   await db.exec('savepoint expected_rejection;');let error;
   try{await db.exec(sql);}catch(e){error=e;}
   await db.exec('rollback to savepoint expected_rejection;release savepoint expected_rejection;');
   assert.ok(error&&pattern.test(error.message),label+': '+(error?.message||'unexpected success'));checks++;
  };

  const empty=await snapshot();
  await db.exec('begin;'+fixtures);
  // Show the regression actually detects the old predicate. This is a synthetic
  // inconsistent row, not evidence of a live exploit or normal upload defect.
  same((await rows(3)).includes(id('e',3)),true,'Original row policy admits synthetic mismatch to dual-client actor');
  same((await files(3)).includes('fixture/3.png'),false,'Existing download helper already rejects mismatch');
  const before=await snapshot();
  // Guard failures must leave baseline policy/data/permissions intact.
  await denied('alter policy evidence_read on public.vb_evidence to anon;'+innerApply,/metadata changed/,'Wrong role refused');
  await denied('alter policy evidence_read on public.vb_evidence using(true);'+innerApply,/expression changed/,'Expression drift refused');
  await denied('alter table public.vb_evidence disable row level security;'+innerApply,/security is disabled/,'Disabled row security refused');
  await denied('alter table public.vb_marks disable row level security;'+innerApply,/security is disabled/,'Disabled mark security refused');
  await denied('drop policy evidence_read on public.vb_evidence;'+innerApply,/policy is missing/,'Missing policy refused');
  await denied('drop policy evidence_read on public.vb_evidence;create policy evidence_read on public.vb_evidence as restrictive for select to authenticated using(true);'+innerApply,/metadata changed/,'Restrictive replacement refused');
  await denied('drop policy evidence_read on public.vb_evidence;create policy evidence_read on public.vb_evidence for all to authenticated using(true) with check(true);'+innerApply,/metadata changed/,'Changed command/check refused');
  same(await snapshot(),before,'Rejected changes roll back without permission/data drift');

  await db.exec('savepoint correction;'+innerApply);
  const after=await snapshot();
  const target=after.policies.find(p=>p.relation==='vb_evidence'&&p.polname==='evidence_read');
  assert.match(target.expression,/m\.client_id = vb_evidence\.client_id/);checks++;
  const preserved=structuredClone(after);
  preserved.policies.find(p=>p.relation==='vb_evidence'&&p.polname==='evidence_read').expression=
   before.policies.find(p=>p.relation==='vb_evidence'&&p.polname==='evidence_read').expression;
  same(preserved,before,'Only target expression changes: data, helpers, grants, storage and restrictive rules preserved');
  same(await rows(1),[1,...(scoped?[]:[7])].map(n=>id('e',n)),'Client sees only own eligible evidence');
  same(await rows(2),[id('e',2)],'Other client boundary preserved');
  same(await rows(3),[1,2,...(scoped?[]:[7])].map(n=>id('e',n)),'Dual-client actor denied mismatched/removed/incomplete/archived rows');
  same(await rows(4),[],'Staff with client memberships still requires MFA');
  same(await rows(4,'aal2'),[1,2,3,6,7].map(n=>id('e',n)),'Existing MFA staff branch preserved including archived marks');
  same(await files(3),[1,2,...(scoped?[]:[7])].map(n=>'fixture/'+n+'.png'),'Private download boundaries preserved');
  same(await files(4),[],'Non-MFA staff cannot download');
  same(await files(4,'aal2'),[1,2,3,6,7].map(n=>'fixture/'+n+'.png'),'Existing MFA download behavior preserved');
  await denied('set local role anon;select * from public.vb_evidence;',/permission denied/,'Signed-out metadata denied');
  await denied('set local role anon;select * from storage.objects;',/permission denied/,'Signed-out file access denied');
  await denied('set local role authenticated;update public.vb_evidence set notes=notes;',/permission denied/,'Browser writes remain denied');
  await denied(innerApply,/expression changed/,'Repeat application refused');
  await db.exec('savepoint membership_change;update vb_private.client_memberships set active=false;');
  same(await rows(3),[],'Membership revocation remains effective');
  await db.exec('rollback to savepoint membership_change;savepoint client_change;update public.vb_clients set portal_enabled=false;');
  same(await rows(3),[],'Disabled portal remains denied');
  await db.exec('rollback to savepoint client_change;savepoint archive_change;update public.vb_clients set archived_at=now();');
  same(await rows(3),[],'Archived client remains denied');
  await db.exec('rollback to savepoint archive_change;rollback to savepoint correction;');
  same(await snapshot(),before,'Rehearsal rolls policy and data back exactly');
  await db.exec('rollback;');
  same(await snapshot(),empty,'All fixture records and local changes rolled back');
  // Execute the exact full transaction as well (no removed BEGIN/COMMIT).
  const preInstall=await snapshot();
  await db.exec(apply);
  const installed=await snapshot();
  installed.policies.find(p=>p.relation==='vb_evidence'&&p.polname==='evidence_read').expression=
   preInstall.policies.find(p=>p.relation==='vb_evidence'&&p.polname==='evidence_read').expression;
  same(installed,preInstall,'Exact transaction preserves all nontarget metadata/data');
  let repeat;try{await db.exec(apply);}catch(e){repeat=e;await db.exec('rollback;');}
  assert.match(repeat?.message||'',/expression changed/);checks++;
  reports.push({mode:scoped?'with-maintained-restrictive-policies-and-scope-adapter':'legacy-client-membership',passed:true});
 }catch(error){
  console.error(JSON.stringify({status:'failed',mode:scoped?'scoped':'legacy',message:error.message,code:error.code,detail:error.detail},null,2));
  process.exitCode=1;break;
 }finally{await db.close();}
}
if(!process.exitCode)console.log(JSON.stringify({status:'passed',checks,modes:reports,hostedChanges:false,downloads:false,
 limitations:'Isolated PostgreSQL/WASM, not hosted PostgreSQL/Supabase. Auth claims and Storage tables are local fixtures. Scoped mode uses the maintained restrictive policies/download helper with a narrow scope adapter; it does not certify the full engagement engine. No real files, accounts or email are tested.'},null,2));
