// Emit a single-file dashboard deployment from the same tested modules.
// Usage: node tools/bundle-uspto-dashboard.mjs > /tmp/vb-uspto-dashboard.ts
// Test only: add --test to use the reviewed Test project/origin entrypoint.
import {readFile} from 'node:fs/promises';
import {inlineDiagnostics} from './inline-diagnostics.mjs';
if(process.argv.slice(2).some(arg=>arg!=='--test'))throw Error('Expected no arguments or --test');
const root=new URL('../supabase/functions/uspto-lookup/',import.meta.url);
const record=await readFile(new URL('record.mjs',root),'utf8');
const handler=await inlineDiagnostics(await readFile(new URL('handler.mjs',root),'utf8'));
let entry="Deno.serve(createHandler({createClient,env:(key)=>Deno.env.get(key)}));\n";
if(process.argv.includes('--test')){
 const source=await readFile(new URL('../supabase/proposals/test-feature-parity/worker-test-entry.ts',import.meta.url),'utf8');
 const guard=source.indexOf("if(Deno.env.get('SUPABASE_URL')");
 if(guard<0)throw Error('Missing reviewed Test entrypoint guard');
 entry=source.slice(guard).replace('(key:string)','(key)');
}
process.stdout.write("import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+record.replace("from 'fast-xml-parser'","from 'npm:fast-xml-parser@5.11.2'")+'\n'+handler.replace("import {fetchRecord as defaultFetchRecord, fingerprint, serialNumber} from './record.mjs';","const defaultFetchRecord=fetchRecord;")+'\n'+entry);
