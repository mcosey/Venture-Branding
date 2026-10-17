import {createClient} from '@supabase/supabase-js';
import {createBcmHandler} from './handler.mjs';
Deno.serve(createBcmHandler({createClient,env:(key:string)=>Deno.env.get(key)}));
