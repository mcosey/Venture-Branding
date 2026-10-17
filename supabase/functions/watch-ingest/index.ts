import {createClient} from '@supabase/supabase-js';
import {createWatchHandler} from './handler.mjs';
Deno.serve(createWatchHandler({env:(key:string)=>Deno.env.get(key),createClient}));
