import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createAiBcmHandler} from '../bcm-ai-production/handler.mjs';
Deno.serve(createAiBcmHandler({createClient,env:(key)=>Deno.env.get(key),scheduled:false}));
