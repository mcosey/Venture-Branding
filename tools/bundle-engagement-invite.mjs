import {readFile} from 'node:fs/promises';
import {inlineDiagnostics} from './inline-diagnostics.mjs';
const handler=await inlineDiagnostics(await readFile(new URL('../supabase/functions/engagement-invite/handler.mjs',import.meta.url),'utf8'));
const args=process.argv.slice(2);
if(args.length&&!(args.length===1&&args[0]==='--production'))throw Error('Use no arguments for Test or --production for the explicit Production artifact.');
const environment=args.length?",environment:'bcm-production'":'';
process.stdout.write("import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+handler+"\nDeno.serve(createEngagementInviteHandler({createClient,env:key=>Deno.env.get(key)"+environment+"}));\n");
