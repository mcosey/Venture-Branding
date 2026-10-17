// Assemble the reviewed Test-only SQL. Does not connect to a database or apply changes.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=new URL('../supabase/proposals/portal-engagement-cutover/',import.meta.url);
const names=['05-test-scope-core.sql','06-test-service-enforcement.sql','07-test-enforcement-checks.sql'];
const source=await Promise.all(names.map(name=>readFile(new URL(name,root),'utf8')));
if(!source[0].includes("'7692130048193495360'")||!source[0].includes('begin;')||!source[1].trimEnd().endsWith('commit;')||!source[2].trimEnd().endsWith('rollback;'))throw Error('Unexpected transaction boundaries');
const apply=source[0]+'\n'+source[1];
const rehearsal=source[0]+'\n'+source[1].replace(/commit;\s*$/,'')+'\n'+source[2].replace(/\nbegin;/,'');
await writeFile(new URL('prepared-enforcement-apply.sql',root),apply);
await writeFile(new URL('prepared-enforcement-rehearsal.sql',root),rehearsal);
const hash=s=>createHash('sha256').update(s).digest('hex');
await writeFile(new URL('prepared-enforcement-manifest.json',root),JSON.stringify({status:'prepared-not-applied',testProject:'imvkhicfmidzbzsbhkzs',sources:Object.fromEntries(names.map((name,i)=>[name,hash(source[i])])),apply_sha256:hash(apply),rehearsal_sha256:hash(rehearsal)},null,2)+'\n');
console.log('Prepared Test-only apply and rollback-rehearsal packages in '+fileURLToPath(root));
