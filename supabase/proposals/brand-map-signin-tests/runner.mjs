import {PROJECT,ORIGIN,PAYLOAD,business,ensure,UUID,validateConfig,validateKey,validateMap,safeEvidence,renderMap} from './contract.mjs';
const TABLES=['vb_brand_assets','vb_brand_relationships','vb_brand_legal_links'];
const RPCS=['vb_read_brand_map','vb_save_brand_asset','vb_set_brand_parent','vb_confirm_brand_relationship','vb_review_brand_legal_link'];
// One runner per tab. Tokens/passwords never leave this closure for evidence/storage.
export function createRunner(config,key,actor,{fetcher=globalThis.fetch,view,onChange=()=>{},now=()=>Date.now()}={}) {
  validateConfig(config); validateKey(key); ensure(['A','B'].includes(actor),'Choose Test client A or B.');
  const m=config.manifest,own=m.clients[actor],other=actor==='A'?'B':'A';
  let token=null,expires=0,logins=0,phase='ready',created=null,busy=false,requests=0;
  const evidence=new Map();
  const stats=()=>({actor,phase,signed_in:Boolean(token),fresh_logins:logins,completed:[...evidence.keys()],created_asset:created?.id??null});
  const emit=()=>onChange(stats());
  const pass=(id,checks)=>{ensure(!evidence.has(id),'Case already completed; do not replay.');evidence.set(id,safeEvidence({case_id:id,actor,status:'PASS',checks,fresh_logins:logins}));emit();};
  async function exclusive(action) {
    ensure(!busy && phase!=='failed','Another operation is running or this run has stopped.');busy=true;
    try{return await action();}catch(e){phase='failed';throw e;}finally{busy=false;emit();}
  }
  async function request(path,method='POST',body,auth=true,profile=null) {
    ensure(/^\/(auth\/v1\/(token\?grant_type=password|user|logout\?scope=local)|rest\/v1\/(rpc\/[a-z_]+|vb_brand_(assets|relationships|legal_links)(\?id=eq\.[0-9a-f-]+)?|audit_events))$/.test(path),'Unapproved API path.');
    if(auth)ensure(token && expires>now()+5000,'Fresh sign-in required; no silent refresh.');
    const headers={apikey:key,'Content-Type':'application/json'};
    if(auth)headers.Authorization=`Bearer ${token}`;
    if(profile)headers[method==='GET'?'Accept-Profile':'Content-Profile']=profile;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    requests++;
    try {
      const r=await fetcher(ORIGIN+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
      const text=await r.text(); ensure(text.length<=200000,'Oversized API response.');
      if(r.status===204)return {status:204,data:null};
      ensure((r.headers.get('content-type')||'').includes('application/json'),'Non-JSON response; not access-denial evidence.');
      let data;try{data=JSON.parse(text);}catch{throw new Error('Invalid JSON response.');}
      return {status:r.status,data};
    } finally {clearTimeout(timer);}
  }
  const rpc=(fn,args,auth=true)=>request(`/rest/v1/rpc/${fn}`,'POST',args,auth);
  function ok(r){ensure(r.status===200 && r.data && !r.data.code,'Expected a successful API result.');return r.data;}
  function denied(r,code='42501',statuses=[401,403]) {
    ensure(statuses.includes(r.status) && r.data?.code===code,'Expected exact API denial; request failed or unexpectedly succeeded.');
    if(code==='42501')ensure(!('assets' in r.data) && !('counts' in r.data) && !JSON.stringify(r.data).includes(m.label), 'Denied response leaked synthetic records.');
    return r;
  }
  const read=client=>rpc('vb_read_brand_map',{target_client:client}).then(ok);
  const save=(client,id,version,details)=>rpc('vb_save_brand_asset',{target_client:client,target_asset:id,expected_version:version,details});
  const parent=(client,child,p)=>rpc('vb_set_brand_parent',{target_client:client,target_child:child,target_parent:p,expected_version:1});
  const confirm=(client,child)=>rpc('vb_confirm_brand_relationship',{target_client:client,target_child:child,expected_version:1});
  const review=(client,asset,mark)=>rpc('vb_review_brand_legal_link',{target_client:client,target_asset:asset,target_mark:mark,expected_version:1,expected_asset_identity:1,expected_mark_identity:mark?{client_id:client,name:'Synthetic mark',mark_type:'word',record_owner:'Test owner'}:null});
  async function signedOut() {
    const saved=token;
    try {if(saved){const r=await request('/auth/v1/logout?scope=local','POST',undefined,true);ensure(r.status===204,'Auth logout not confirmed.');}}
    finally{token=null;expires=0;if(view)view.replaceChildren();emit();}
  }
  async function login(password) {
    ensure(phase==='ready' || phase==='awaiting-fresh-login','Sign-in is out of order.');
    ensure(!token && typeof password==='string' && password.length>0,'Private password required.');
    const r=await request('/auth/v1/token?grant_type=password','POST',{email:m.users[actor].email,password},false);
    password='';
    ensure(r.status===200 && typeof r.data?.access_token==='string' && r.data.token_type?.toLowerCase()==='bearer' && r.data.expires_in>30,'Password sign-in failed; do not change Auth settings.');
    token=r.data.access_token;expires=now()+r.data.expires_in*1000;
    // Drop refresh token and provider payload immediately; only getUser proves identity.
    r.data=null;
    try{const user=await request('/auth/v1/user','GET');ensure(user.status===200 && user.data.id===m.users[actor].id && user.data.email===m.users[actor].email,'Signed-in identity differs from the approved disposable account.');}
    catch(e){try{await signedOut();}catch{}throw e;}
    logins++;phase=created?'fresh-login':'signed-in';emit();
  }
  async function initial() {
    ensure(phase==='signed-in','Sign in first.');
    let map=validateMap(await read(own),m,actor,m.assets[actor],m.marks[actor]);
    if(view)renderMap(view,map);pass(`${actor}-own-read`,1);
    if(actor==='A'){validateMap(await read(m.clients.C),m,'C',[],[]);pass('A-empty-read',1);}
    const a=await rpc('vb_read_brand_map',{target_client:m.clients[other]});denied(a);
    const random=await rpc('vb_read_brand_map',{target_client:m.unknown_client});denied(random);
    ensure(a.status===random.status && a.data.code===random.data.code && a.data.message===random.data.message && a.data.details===random.data.details && a.data.hint===random.data.hint,'Foreign and unknown workspace denials differ.');
    pass(`${actor}-foreign-read`,2);
    const s=ok(await save(own,null,null,business(`${m.label}-${actor}-created`)));
    ensure(UUID.test(s.id) && s.version===1 && s.identity_revision===1 && ![...m.assets.A,...m.assets.B].includes(s.id),'Unexpected created asset.');created={id:s.id,version:1};
    map=validateMap(await read(own),m,actor,[...m.assets[actor],s.id],m.marks[actor]);
    const asset=map.assets.find(x=>x.id===s.id);ensure(asset.source_kind==='manual_client' && asset.name===`${m.label}-${actor}-created` && asset.version===1,'Server provenance differs.');
    if(view)renderMap(view,map);
    await signedOut();phase='awaiting-fresh-login';emit();
  }
  async function rawDenials(auth=true) {
    let n=0;
    for(const table of TABLES){
      const row=table==='vb_brand_assets'?{id:m.assets[actor][0],client_id:own,...business('Forbidden raw insert'),source_kind:'manual_client'}:table==='vb_brand_relationships'?{client_id:own,child_asset_id:m.assets[actor][0]}:{client_id:own,asset_id:m.assets[actor][0]};
      for(const [method,path,body] of [['GET',table,undefined],['POST',table,row],['PATCH',`${table}?id=eq.${m.assets[actor][0]}`,{version:999}],['DELETE',`${table}?id=eq.${m.assets[actor][0]}`,undefined]]){denied(await request(`/rest/v1/${path}`,method,body,auth));n++;}
    }return n;
  }
  async function adversarial() {
    ensure(phase==='fresh-login' && logins===2,'Fresh second sign-in required.');
    const map=validateMap(await read(own),m,actor,[...m.assets[actor],created.id],m.marks[actor]);
    ensure(map.assets.find(x=>x.id===created.id)?.name===`${m.label}-${actor}-created`,'Saved asset missing after fresh sign-in.');pass(`${actor}-own-create`,2);
    const foreign=m.clients[other],fa=m.assets[other][0],mine=m.assets[actor][0];
    if(actor==='A'){
      denied(await save(foreign,null,null,business('Forbidden create')));pass('A-foreign-create',1);
      for(const client of [own,foreign])denied(await save(client,fa,1,business('Forbidden save')));pass('A-foreign-save',2);
      denied(await parent(own,mine,fa));pass('A-foreign-parent',1);
      denied(await confirm(foreign,fa));pass('A-foreign-confirm',1);
      for(const [client,asset,mark] of [[own,mine,m.marks.A[0]],[own,mine,null],[foreign,fa,m.marks.B[0]]])denied(await review(client,asset,mark));pass('A-legal-review',3);
      for(const forged of [{record_owner:'Forged'},{source_kind:'manual_staff'},{reviewed_by:m.users.A.id},{version:99}])denied(await save(own,created.id,1,{...business('Forbidden forged fields'),...forged}),'22023',[400]);pass('A-forged-fields',4);
      const s=ok(await save(own,created.id,1,business(`${m.label}-A-saved`)));ensure(s.id===created.id && s.version===2,'Own save failed.');created.version=2;
      denied(await save(own,created.id,1,business('Forbidden stale save')),'40001',[500]);
      const after=await read(own);ensure(after.assets.find(x=>x.id===created.id)?.name===`${m.label}-A-saved`,'Stale save changed the winner.');pass('A-stale-save',2);
    }else{
      for(const client of [own,foreign]){denied(await save(client,fa,1,business('Forbidden B save')));denied(await parent(client,fa,mine));denied(await confirm(client,fa));}pass('B-foreign-write',6);
    }
    pass('raw-table-denials',await rawDenials());
    let helpers=0;
    for(const fn of ['brand_map_can_read','brand_map_lock_write']){denied(await rpc(fn,{target_client:own}),'PGRST202',[404]);helpers++;}
    denied(await request('/rest/v1/audit_events','GET',undefined,true,'vb_private'),'PGRST106',[406]);pass('private-helper-denials',helpers+1);
    let anon=0;
    const args=[{target_client:own},{target_client:own,target_asset:null,expected_version:null,details:business('Forbidden anonymous create')},{target_client:own,target_child:mine,target_parent:null,expected_version:1},{target_client:own,target_child:mine,expected_version:1},{target_client:own,target_asset:mine,target_mark:null,expected_version:1,expected_asset_identity:1,expected_mark_identity:null}];
    for(let i=0;i<RPCS.length;i++){denied(await rpc(RPCS[i],args[i],false));anon++;}pass('anonymous-denials',anon+await rawDenials(false));
    if(actor==='A'){
      const projected=validateMap(await read(own),m,'A',[...m.assets.A,created.id],m.marks.A);
      ensure(projected.assets.find(x=>x.id===m.assets.A[1])?.name===PAYLOAD,'Script-like fixture missing.');
      ensure(view,'Render container required.');renderMap(view,projected);
      ensure(view.textContent.includes(PAYLOAD) && !view.querySelector('img,script,iframe') && !globalThis.__brandMapPayloadExecuted,'Unsafe payload rendering.');pass('payload-safe-rendering',1);
    }
    phase='awaiting-access-change';emit();
  }
  async function accessChange() {
    ensure(phase==='awaiting-access-change','Complete initial checks before the fixture-only access change.');
    const same=token;ensure(expires>now()+30000,'Session too close to expiry; cannot prove same-token denial.');
    // Fresh Auth verification ensures a generic expired-token failure is not counted.
    const user=await request('/auth/v1/user','GET');ensure(user.status===200 && user.data.id===m.users[actor].id,'Auth token is no longer valid.');
    denied(await rpc('vb_read_brand_map',{target_client:own}));
    denied(await save(own,created.id,created.version,business('Forbidden revoked save')));
    ensure(token===same,'Token changed during access check.');pass(actor==='A'?'A-revoked-session':'B-disabled-portal',2);
    phase='access-checked';emit();
  }
  async function finish() {
    ensure(phase==='access-checked','Verify withdrawn access before final sign-out.');
    await signedOut();const before=requests;
    try{await read(own);throw Error('Signed-out read unexpectedly sent.');}catch(e){ensure(e.message==='Fresh sign-in required; no silent refresh.','Unexpected signed-out behavior.');}
    ensure(requests===before && !token && (!view || view.childElementCount===0),'Signed-out view/token/request not cleared.');pass('signout-clears-test-view',1);phase='complete';emit();
  }
  function report(){return {prepared_only:false,project:PROJECT,run_id:m.run_id,actor,phase,created_asset:created?.id??null,real_signins:logins,cases:[...evidence.values()].map(safeEvidence)};}
  return {stats,report,login:p=>exclusive(()=>login(p)),initial:()=>exclusive(initial),adversarial:()=>exclusive(adversarial),accessChange:()=>exclusive(accessChange),finish:()=>exclusive(finish),clear:async()=>{ensure(!busy,'Operation still running.');try{await signedOut();}finally{phase='closed';emit();}}};
}
