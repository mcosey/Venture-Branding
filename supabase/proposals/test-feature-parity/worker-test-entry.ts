// PREPARED ONLY. Deploy with the reviewed existing handler/record dependencies.
// This entry is intentionally unsuitable for Production.
import {createClient} from '@supabase/supabase-js';
import {createHandler} from '../../functions/uspto-lookup/handler.mjs';
if(Deno.env.get('SUPABASE_URL')!=='https://imvkhicfmidzbzsbhkzs.supabase.co')throw Error('BCM Test project required');
Deno.serve(createHandler({createClient,env:(key:string)=>key==='VB_ALLOWED_ORIGINS'?'http://127.0.0.1:8893':Deno.env.get(key)}));
