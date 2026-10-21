// Emit the maintained Production worker for dashboard review; never deploys.
import {readFile} from 'node:fs/promises';
const [mode,...extra]=process.argv.slice(2);
if(!['scan','schedule'].includes(mode)||extra.length)throw Error('Use scan or schedule.');
const handler=await readFile(new URL('../supabase/functions/bcm-ai-production/handler.mjs',import.meta.url),'utf8');
process.stdout.write("import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+handler+'\n'+`Deno.serve(createAiBcmHandler({createClient,env:(key)=>Deno.env.get(key),scheduled:${mode==='schedule'}}));\n`);
