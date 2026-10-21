// Local artifacts only. Does not deploy, read credentials or modify frozen releases.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inlineDiagnostics} from './inline-diagnostics.mjs';
const root=new URL('../',import.meta.url),out=new URL('supabase/proposals/diagnostics/',root);
const sdk="import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n";
const artifacts={};
const build=(tool,args=[])=>execFileSync(process.execPath,[fileURLToPath(new URL('tools/'+tool,root)),...args],{encoding:'utf8'});
artifacts['uspto-lookup-test.ts']=build('bundle-uspto-dashboard.mjs',['--test']);
artifacts['engagement-invite-test.ts']=build('bundle-engagement-invite.mjs');
artifacts['bcm-ai-scan-test.ts']=build('bundle-bcm-ai-dashboard.mjs',['scan']);
artifacts['bcm-ai-schedule-test.ts']=build('bundle-bcm-ai-dashboard.mjs',['schedule']);
for(const [name,factory]of [['client-invite','createInviteHandler'],['evidence-upload','createHandler'],['watch-ingest','createWatchHandler']]){
 const handler=await inlineDiagnostics(await readFile(new URL('supabase/functions/'+name+'/handler.mjs',root),'utf8'));
 artifacts[name+'-review.ts']=sdk+handler+`\nDeno.serve(${factory}({createClient,env:key=>Deno.env.get(key)}));\n`;
}
const hash=s=>createHash('sha256').update(s).digest('hex');
await mkdir(out,{recursive:true});
for(const [name,body]of Object.entries(artifacts)){
 // Syntax validation strips vendor import lines only; runtime tests are separate.
 execFileSync(process.execPath,['--input-type=module','--check'],{input:body,encoding:'utf8'});
 await writeFile(new URL(name,out),body);
}
const sources=['shared/diagnostics.mjs',...['uspto-lookup','engagement-invite','client-invite','evidence-upload','watch-ingest','bcm-ai'].map(n=>'supabase/functions/'+n+'/handler.mjs'),
 'supabase/functions/uspto-lookup/record.mjs','supabase/functions/bcm-ai/research.mjs','supabase/proposals/test-feature-parity/worker-test-entry.ts',
 'tools/inline-diagnostics.mjs','tools/prepare-diagnostics.mjs','tools/bundle-uspto-dashboard.mjs','tools/bundle-engagement-invite.mjs','tools/bundle-bcm-ai-dashboard.mjs',
 'auth/auth.js','auth/connection.mjs','auth/account.mjs','auth/member-account.mjs','auth/engagement-admin.mjs','auth/evidence.mjs','auth/bcm-ai.mjs',
 'attorney/assets/workspace.js','free/assets/llk-progress-store.mjs','.github/workflows/portal-checks.yml',
 'auth/maintenance.mjs','auth/digest.mjs','auth/member-session.mjs','auth/signup-preview.mjs',
 'attorney/preflight/draft-store.mjs','attorney/preflight/connected-workspace.mjs','free/assets/member-business.mjs',
 'tools/remaining-diagnostics.test.mjs','tools/feature-diagnostics.test.mjs','tools/invitation-page-diagnostics.test.mjs','supabase/proposals/diagnostics/operational-log-inventory-test.sql',
 'auth/watch.mjs','auth/engagement-invitation.mjs','portal/assets/brand-map-reviewed.mjs',
 'supabase/functions/bcm-ai-production/handler.mjs','tools/bundle-bcm-ai-production.mjs','tools/bcm-worker-source.test.mjs',
 'tools/no-network.mjs','tools/run-watch-tests.py','tools/diagnostics.test.mjs','tools/worker-diagnostics.test.mjs',
 'tools/uspto-test-bundle.test.mjs','tools/auth-callback.test.mjs','tools/check-diagnostics-artifacts.mjs'];
const manifest={status:'LOCAL PREPARATION ONLY — NOT DEPLOYED',release:'2026-10-21-diagnostics-3',
 database_changes:false,readiness_or_permission_changes:false,emails_or_provider_calls:false,
 note:'Review artifacts preserve each existing handler’s project/origin/authentication gates. The -review artifacts retain existing configuration; their names do not make them Test-only. Do not deploy without exact target/configuration review and separate approval. Frozen previously deployed artifacts are unchanged.',
 sources:Object.fromEntries(await Promise.all(sources.map(async p=>[p,hash(await readFile(new URL(p,root)))]))),
 artifacts:Object.fromEntries(Object.entries(artifacts).map(([p,s])=>[p,hash(s)]))};
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared and syntax-checked seven local diagnostic worker artifacts; nothing deployed.');
