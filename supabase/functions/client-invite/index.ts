import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createInviteHandler} from './handler.mjs';
Deno.serve(createInviteHandler({createClient,env:key=>Deno.env.get(key)}));
