import {readFile} from 'node:fs/promises';
const root=new URL('../supabase/functions/bcm-ai/',import.meta.url);
const research=await readFile(new URL('research.mjs',root),'utf8');
const handler=await readFile(new URL('handler.mjs',root),'utf8');
const include="import {TEST_URL,researchWebsite,settingsValid} from './research.mjs';";
if(!handler.includes(include)||!['scan','schedule'].includes(process.argv[2]))throw Error('Use scan or schedule; review changed imports.');
process.stdout.write("import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+research+'\n'+handler.replace(include,'')+`\nDeno.serve(createAiBcmHandler({createClient,env:(key)=>Deno.env.get(key),scheduled:${process.argv[2]==='schedule'}}));\n`);
