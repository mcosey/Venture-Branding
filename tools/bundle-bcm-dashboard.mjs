import {readFile} from 'node:fs/promises';
const root=new URL('../supabase/functions/bcm-scan/',import.meta.url);
const handler=await readFile(new URL('handler.mjs',root),'utf8');
process.stdout.write(handler+"\nDeno.serve(createBcmHandler({env:(key)=>Deno.env.get(key)}));\n");
