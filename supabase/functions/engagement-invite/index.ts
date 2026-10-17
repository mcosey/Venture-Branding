import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createEngagementInviteHandler} from './handler.mjs';
Deno.serve(createEngagementInviteHandler({createClient,env:key=>Deno.env.get(key)}));
