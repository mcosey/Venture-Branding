import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createAiBcmHandler} from '../bcm-ai/handler.mjs';
Deno.serve(createAiBcmHandler({createClient,env:(name:string)=>Deno.env.get(name)}));
