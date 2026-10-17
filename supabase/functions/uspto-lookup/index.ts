import {createClient} from '@supabase/supabase-js';
import {createHandler} from './handler.mjs';
Deno.serve(createHandler({createClient,env:(key:string)=>Deno.env.get(key)}));
