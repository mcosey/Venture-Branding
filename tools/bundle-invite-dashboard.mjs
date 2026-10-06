import {readFile} from 'node:fs/promises';
const handler=await readFile(new URL('../supabase/functions/client-invite/handler.mjs',import.meta.url),'utf8');
process.stdout.write("import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+handler+"\nDeno.serve(createInviteHandler({createClient,env:key=>Deno.env.get(key)}));\n");
