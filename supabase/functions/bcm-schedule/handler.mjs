// BCM retired. Original hosted implementations are preserved in supabase/retired/bcm.
export function createBcmScheduleHandler(){
 return async ()=>new Response(JSON.stringify({error:'Brand Change Monitor has been retired.'}),{
  status:410,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
 });
}
