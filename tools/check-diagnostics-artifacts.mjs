import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),out=new URL('supabase/proposals/diagnostics/',root);
const manifest=JSON.parse(await readFile(new URL('manifest.json',out),'utf8'));
const digest=s=>createHash('sha256').update(s).digest('hex');
if(manifest.status!=='LOCAL PREPARATION ONLY — NOT DEPLOYED')throw Error('Review changed diagnostic release status.');
for(const [path,hash]of Object.entries(manifest.sources)){
 if(digest(await readFile(new URL(path,root)))!==hash)throw Error('Diagnostic source changed: '+path+'; review and regenerate the local package.');
}
for(const [path,hash]of Object.entries(manifest.artifacts)){
 const body=await readFile(new URL(path,out),'utf8');
 if(digest(body)!==hash)throw Error('Diagnostic artifact changed: '+path);
 if(body.includes("from '../../../shared/diagnostics.mjs'"))throw Error('Unbundled diagnostic dependency: '+path);
 execFileSync(process.execPath,['--input-type=module','--check'],{input:body,encoding:'utf8'});
}
console.log('Diagnostic source hashes and all seven syntax-checked artifacts match the reviewed local manifest.');
