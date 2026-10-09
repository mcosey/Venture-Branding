import {readFile} from 'node:fs/promises';
const root=new URL('../supabase/functions/bcm-scan/',import.meta.url);
const record=await readFile(new URL('record.mjs',root),'utf8');
const handler=await readFile(new URL('handler.mjs',root),'utf8');
process.stdout.write("import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+record+'\n'+handler.replace("import {fetchSnapshot,validateSettings} from './record.mjs';",'')+"\nDeno.serve(createBcmHandler({createClient,env:(key)=>Deno.env.get(key)}));\n");
