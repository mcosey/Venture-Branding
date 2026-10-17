// Emit a single-file dashboard deployment from the same tested modules.
// Usage: node tools/bundle-uspto-dashboard.mjs > /tmp/vb-uspto-dashboard.ts
import {readFile} from 'node:fs/promises';
const root=new URL('../supabase/functions/uspto-lookup/',import.meta.url);
const record=await readFile(new URL('record.mjs',root),'utf8');
const handler=await readFile(new URL('handler.mjs',root),'utf8');
process.stdout.write("import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+record.replace("from 'fast-xml-parser'","from 'npm:fast-xml-parser@5.11.2'")+'\n'+handler.replace("import {fetchRecord as defaultFetchRecord, fingerprint, serialNumber} from './record.mjs';","const defaultFetchRecord=fetchRecord;")+"\nDeno.serve(createHandler({createClient,env:(key)=>Deno.env.get(key)}));\n");
