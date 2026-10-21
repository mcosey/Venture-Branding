import {createBcmHandler} from './handler.mjs';
Deno.serve(createBcmHandler({env:(key:string)=>Deno.env.get(key)}));
