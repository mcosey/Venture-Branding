// BCM retirement endpoint. Original scanning source is preserved in the repository and retirement backups.
Deno.serve((req) => {
 const origin=req.headers.get('origin')||'';
 const allowed=(Deno.env.get('VB_ALLOWED_ORIGINS')||'http://127.0.0.1:8000').split(',').map(s=>s.trim());
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
 return new Response(JSON.stringify({error:'Brand Change Monitor has been retired.'}),{status:410,headers});
});
