"""Prepare local review artifacts from the committed Test version; never deploys."""
from pathlib import Path
import subprocess,json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'supabase/proposals/bcm-ai-production'
PROD='https://omvkwiosonatswocbdgx.supabase.co'
PID='7690937621030482216'
COMMIT='954f3db0f3de3990de7894888a020f53e73f96de'
def source(path):
 return subprocess.check_output(['git','show',f'{COMMIT}:{path}'],cwd=ROOT,text=True)
def write(path,body):
 p=OUT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(body)
research=source('supabase/functions/bcm-ai/research.mjs').replace('TEST_URL','PRODUCTION_URL').replace('https://imvkhicfmidzbzsbhkzs.supabase.co',PROD)
handler=source('supabase/functions/bcm-ai/handler.mjs').replace('TEST_URL','PRODUCTION_URL')
handler=handler.replace("(env('VB_ALLOWED_ORIGINS')||'http://127.0.0.1:8000,http://127.0.0.1:8885')","(env('VB_ALLOWED_ORIGINS')||'')")
handler=handler.replace('// New workers are Test-only; even an accidental Production deployment cannot reserve work.','// Production pilot: exact project AND explicit worker switch required before any DB/API access.')
handler=handler.replace("if(env('SUPABASE_URL')!==PRODUCTION_URL)return reply({error:'BCM AI Test only.'},503);","if(env('SUPABASE_URL')!==PRODUCTION_URL||env('BCM_AI_RELEASE_ENABLED')!=='true')return reply({error:'BCM research is paused.'},503);")
handler=handler.replace('Test research is not connected.','Research is not connected.')
write('workers/research.mjs',research);write('workers/handler.mjs',handler)
for mode in ['scan','schedule']:
 body="import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+research+'\n'+handler.replace("import {PRODUCTION_URL,researchWebsite,settingsValid} from './research.mjs';",'')+f"\nDeno.serve(createAiBcmHandler({{createClient,env:(key)=>Deno.env.get(key),scheduled:{str(mode=='schedule').lower()}}}));\n"
 write(f'deployment/bcm-ai-{mode}.ts',body)
sql=source('supabase/proposals/bcm-ai/setup.sql').replace('7692130048193495360',PID).replace('BCM Test required','BCM Production required').replace('Test not connected','Research is paused').replace('Test run limit reached','Pilot allowance reached')
sql=sql.replace('max_runs integer not null default 20 check(max_runs between 1 and 20)','max_runs integer not null default 20 check(max_runs between 1 and 20),\n pilot_client_id uuid references public.vb_clients(id)')
sql=sql.replace("if cap is null or not public.vb_bcm_ai_ready() then raise exception 'Research is paused'; end if;", "if cap is null or not public.vb_bcm_ai_ready() then raise exception 'Research is paused'; end if;\n if target is distinct from (select pilot_client_id from vb_private.bcm_ai_config where singleton) then raise exception 'Client is outside this pilot' using errcode='42501';end if;")
sql=sql.replace('where due_schedule.enabled and due_schedule.next_run_at<=now()', 'where c.id=(select pilot_client_id from vb_private.bcm_ai_config where singleton) and due_schedule.enabled and due_schedule.next_run_at<=now()')
sql=sql.replace('where singleton),false) and public.vb_bcm_scheduler_ready();', 'where singleton and pilot_client_id is not null),false) and public.vb_bcm_scheduler_ready();')
sql=sql.replace('-- One-time, additive BCM AI prototype. TEST ONLY. No jobs or readiness enabled here.', '-- REVIEW ONLY: one-time additive Production pilot setup. No jobs/readiness/client schedules enabled.\n-- Requires preflight approval and the existing one-link/scheduling prerequisites.')
sql=sql.replace('create table vb_private.bcm_ai_config', "do $$ begin\n if to_regclass('public.vb_bcm_schedules') is null or to_regprocedure('vb_private.bcm_actor_has_access(uuid,uuid)') is null or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='vb_bcm_settings' and column_name='discovery_mode') then raise exception 'Inspect missing existing prerequisites; do not apply old crawler packages';end if;\n if to_regclass('public.vb_bcm_ai_runs') is not null then raise exception 'AI schema already exists: stop and inspect';end if;\n if exists(select 1 from cron.job where jobname='vb-bcm-due-tick' and active) or exists(select 1 from vb_private.bcm_scheduler_config where ready) then raise exception 'Legacy monitoring must remain retired';end if;\nend; $$;\ncreate table vb_private.bcm_ai_config",1)
sql=sql.replace("and c.version=r.settings_version","and r.client_id=(select pilot_client_id from vb_private.bcm_ai_config where singleton) and c.version=r.settings_version")
sql=sql.replace('if enabled and (not public.vb_bcm_ai_ready()', 'if enabled and (target_client is distinct from (select pilot_client_id from vb_private.bcm_ai_config where singleton) or not public.vb_bcm_ai_ready()')
write('sql/02-setup-disabled.sql',sql)
api=source('auth/bcm-ai.mjs').replace("import {TEST_URL} from '../supabase/functions/bcm-ai/research.mjs';",f"const PRODUCTION_URL='{PROD}';").replace('assertTest','assertProduction').replace('TEST_URL','PRODUCTION_URL')
api=api.replace("if(db.supabaseUrl!==PRODUCTION_URL)throw Error('BCM AI is available in Test only.');", "if(db.supabaseUrl!==PRODUCTION_URL||window.VB_AUTH_CONFIG?.environment!=='bcm-production'||window.VB_AUTH_CONFIG?.bcmEnabled!==true)throw Error('BCM is not enabled for this portal.');")
api=api.replace('Test setup or account access is not ready.','BCM setup or account access is not ready.').replace('Check Test readiness','Check research readiness')
write('frontend/auth/bcm-ai.mjs',api)
ui=source('portal/assets/bcm-ai.js').replace('assertTest','assertProduction').replace('aiTestEnabled','aiBcmEnabled')
ui=ui.replace("config?.environment==='bcm-test' && config.url==='https://imvkhicfmidzbzsbhkzs.supabase.co'",f"config?.environment==='bcm-production' && config.bcmEnabled===true && config.url==='{PROD}'")
ui=ui.replace('BCM portal integration is Test only.','BCM is not enabled for this portal.').replace('BCM Test · public website research.','Public website research.').replace('outside this trial.','outside this monitor.')
ui=ui.replace('I authorize this Test-only research trial of this public website.','I own this website or have permission to monitor it.').replace('Test research is connected.','Research is connected.').replace('Test research is paused by Venture Branding.','Research is paused or the pilot allowance has been reached.').replace('No paid research is enabled during this integration review.','Saving settings does not run paid research.').replace('this Test client.','this client.')
ui=ui.replace("../../auth/bcm-ai.mjs'","../../auth/bcm-ai.mjs?v=20261012-bcm-production'")
write('frontend/portal/assets/bcm-ai.js',ui)
for path in ['portal/assets/client.js','attorney/assets/workspace.js']:
 body=source(path).replace('aiTestEnabled','aiBcmEnabled').replace('20261011-test-portal','20261012-bcm-production').replace('Brand Change Monitor · Test','Brand Change Monitor').replace('Review brand discoveries · Test','Review brand discoveries')
 if path.endswith('workspace.js'):
  body=body.replace("append(bcmScreen)","insertBefore(bcmScreen,document.querySelector('#main footer'))")
 write('frontend/'+path,body)
write('frontend/portal/assets/bcm-ai.css',source('portal/assets/bcm-ai.css'))
# Prepare exact HTML changes, including stylesheet and script cache versions.
for name in subprocess.check_output(['git','ls-tree','--name-only',COMMIT],cwd=ROOT,text=True).splitlines():
 if not name.endswith('.html'):continue
 html=source(name);updated=html
 if 'portal/assets/client.js' in html:
  updated=re.sub(r'portal/assets/client\.js\?[^"\s]+','portal/assets/client.js?v=20261012-bcm-production',updated)
 if name=='attorney.html':
  updated=re.sub(r'attorney/assets/workspace\.js\?[^"\s]+','attorney/assets/workspace.js?v=20261012-bcm-production',updated)
 if name in ['brand-monitor.html','attorney.html']:
  updated=updated.replace('</head>','<link rel="stylesheet" href="portal/assets/brand-monitor.css"><link rel="stylesheet" href="portal/assets/bcm-ai.css?v=20261012-bcm-production"></head>')
 if updated!=html:write('frontend/'+name,updated)
# Patch is reviewable and must apply cleanly; never blindly overwrite parallel changes.
import difflib
patch=''
for file in sorted((OUT/'frontend').rglob('*')):
 if not file.is_file() or file.name=='config.review.js':continue
 rel=str(file.relative_to(OUT/'frontend'))
 try:before=source(rel)
 except subprocess.CalledProcessError:before=''
 for chunk in difflib.unified_diff(before.splitlines(True),file.read_text().splitlines(True),fromfile='a/'+rel,tofile='b/'+rel):
  patch+=chunk if chunk.endswith('\n') else chunk+'\n\\ No newline at end of file\n'
write('frontend.patch',patch)

# Config snippet is a separate review artifact; never copied over live config automatically.
write('frontend/config.review.js',"// REVIEW ONLY: merge these fields into the existing Production config after approval.\n// Keep the existing Production URL/key and unrelated Evidence/Digest flags.\n// environment: 'bcm-production', bcmEnabled: true, allowBcmResearch: false\n// true shows settings/review UI; false keeps paid controls disabled until later activation.\n")
manifest={'source_commit':COMMIT,'production_project':'omvkwiosonatswocbdgx','production_system_id':PID,'status':'LOCAL REVIEW ONLY / NOT APPLIED','pilot_max_runs':20,'pilot_client':'UNSELECTED','activation_defaults':'worker switch absent/off, DB ready false, no job, no client enabled','files':{str(p.relative_to(OUT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.rglob('*') if p.is_file() and p.name!='manifest.json'}}
write('manifest.json',json.dumps(manifest,indent=2)+'\n')
print('Prepared local Production review artifacts from '+COMMIT[:7]+'. Nothing deployed or activated.')
