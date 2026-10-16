import {readFile,writeFile} from 'node:fs/promises';
const source=await readFile(new URL('../../supabase/functions/watch-ingest/handler.mjs',import.meta.url),'utf8');
const bundled="import {createClient} from 'npm:@supabase/supabase-js@2.117.2';\n"+source.replaceAll('export function ','function ')+"\nDeno.serve(createWatchHandler({env:(key:string)=>Deno.env.get(key),createClient}));\n";
const destination=process.argv[2];if(!destination)throw Error('An explicit output path is required.');
await writeFile(destination,bundled);
