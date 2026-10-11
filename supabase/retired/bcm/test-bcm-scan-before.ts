import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
// Pure discovery logic; all network access is supplied by the checked public transport.
export const discoveryLimits=Object.freeze({pages:30,queue:200,text:60000,duration:90000,sitemaps:5,concurrency:4});
const decodeDiscovery=text=>String(text).replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';}).replace(/&(amp|quot|apos|lt|gt|nbsp);/gi,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[n.toLowerCase()]);
const cleanDiscovery=text=>decodeDiscovery(text.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attrDiscovery=(tag,name)=>decodeDiscovery(tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'))?.slice(1).find(x=>x!==undefined)||'');
export function discoverLinks(html){
 const clean=html.replace(/<!--[\s\S]*?-->|<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
 const anchors=part=>[...part.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)].map(m=>({href:attrDiscovery(m[1],'href'),label:cleanDiscovery(m[2]).slice(0,80)})).filter(a=>a.href);
 const navigation=[...clean.matchAll(/<(nav|header)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)].flatMap(m=>anchors(m[2]));
 return {links:anchors(clean),navigation};
}
export async function discoverPublicSite(settings,{readResource,extract,validateUrl,excluded,now=Date.now,limits={}}){
 const cap={...discoveryLimits,...limits},root=validateUrl(settings.urls[0]).href,origin=new URL(root).origin;
 const started=now(),queue=[],queued=new Set(),pages=[],skipped=[],observations=[],reasons=new Set();let capturedText=0,attempted=0;
 const skippedKeys=new Set();
 const skip=(url,reason)=>{const key=url+'|'+reason;if(!skippedKeys.has(key)&&skipped.length<cap.queue){skippedKeys.add(key);skipped.push({url,reason});}};
 const read=(url,kind)=>readResource(url,kind,Math.max(1,Math.min(12000,cap.duration-(now()-started))));
 function normalize(raw,base){
  try{const u=new URL(raw,base);u.hash='';if(u.origin!==origin||u.href.length>2048)return null;decodeURIComponent(u.pathname);validateUrl(u.href);return u.href;}catch{return null;}
 }
 function enqueue(raw,base=root){
  const url=normalize(raw,base);if(!url)return;const pathname=new URL(url).pathname;
  if(excluded(pathname,settings.exclusions||[])){skip(url,'Excluded path');return;}
  if(/(?:^|\/)(?:login|logout|sign-in|sign-out|account|billing|checkout|cart|delete|unsubscribe)(?:\/|$)/i.test(decodeURIComponent(pathname))){skip(url,'Account or action page');return;}
  if(/\.(?:png|jpe?g|gif|svg|webp|ico|pdf|zip|mp4|mp3|css|js|woff2?)$/i.test(pathname))return;
  if(queued.has(url))return;
  if(queued.size>=cap.queue){reasons.add('Discovery queue limit reached');return;}
  queued.add(url);queue.push(url);
 }
 enqueue(root);
 // Sitemaps and robots use the same DNS-pinned transport as HTML. No XML entities are expanded.
 const sitemapQueue=[origin+'/sitemap.xml'],sitemapSeen=new Set();
 try{if(!excluded('/robots.txt',settings.exclusions||[])){const robots=await read(origin+'/robots.txt','text');for(const m of robots.matchAll(/^Sitemap:\s*(\S+)/gim)){const url=normalize(m[1],root);if(url)sitemapQueue.push(url);}}}catch{/* Optional discovery source; not a successful page capture. */}
 while(sitemapQueue.length&&sitemapSeen.size<cap.sitemaps&&now()-started<cap.duration){
  const url=sitemapQueue.shift();if(sitemapSeen.has(url))continue;sitemapSeen.add(url);
  if(excluded(new URL(url).pathname,settings.exclusions||[]))continue;
  try{const xml=await read(url,'xml');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsafe sitemap');const index=/<sitemapindex\b/i.test(xml);
   for(const match of xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)){const raw=decodeDiscovery(match[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g,'').trim());const target=normalize(raw,url);if(!target)continue;if(index){if(sitemapQueue.length<cap.queue)sitemapQueue.push(target);}else enqueue(target,url);}
  }catch{/* Unavailable sitemaps do not prevent linked-page discovery. */}
 }
 if(sitemapQueue.length)reasons.add('Sitemap discovery limit reached');
 // The page budget counts attempts, including failures; rejected pages do not unlock more requests.
 while(queue.length&&attempted<cap.pages&&now()-started<cap.duration){
  const batch=queue.splice(0,Math.min(cap.concurrency,cap.pages-attempted));attempted+=batch.length;
  const results=await Promise.allSettled(batch.map(async url=>{const html=await read(url,'html');return {page:extract(html,url),found:discoverLinks(html)};}));
  for(let i=0;i<batch.length;i++){
   const url=batch[i],result=results[i];
   if(result.status==='rejected'){skip(url,result.reason?.code==='BCM_PAGE_SIZE_LIMIT'?'Page exceeds 1 MB download limit':'Page unreadable, redirected, unsafe, or requires access');continue;}
   const {page,found}=result.value;
   for(const link of found.links)enqueue(link.href,url);
   const size=page.text.length+(pages.length?1:0);
   if(capturedText+size>cap.text){skip(url,'Saved text limit reached');reasons.add('Saved text limit reached');continue;}
   capturedText+=size;pages.push(page);
   for(const link of found.navigation){const destination=normalize(link.href,url);if(destination&&!excluded(new URL(destination).pathname,settings.exclusions||[]))observations.push({label:link.label,destination,sourceUrl:url});}
  }
 }
 if(queue.length)reasons.add(now()-started>=cap.duration?'Scan time limit reached':'Page limit reached');
 if(!pages.length)throw Error('No readable public pages were discovered.');
 const text=pages.map(page=>page.text).join('\n');
 if(text.length<40)throw Error('The discovered pages did not provide enough readable text.');
 const captured=new Set(pages.map(p=>p.url)),unique=new Map();
 for(const item of observations)if(item.label&&captured.has(item.sourceUrl))unique.set(item.label+'|'+item.destination+'|'+item.sourceUrl,item);
 return {url:root,urls:pages.map(p=>p.url),pages,title:pages[0].title,headings:pages.flatMap(p=>p.headings).slice(0,100),text,extractor:'source-discovery-v3',observations:[...unique.values()].slice(0,200),coverage:{status:skipped.length||reasons.size?'partial':'captured',captured:pages.length,discovered:queued.size,skipped,pending:queue.length,reasons:[...reasons],limits:cap},scope:origin};
}

// Public-page-only scanner. Targets come from authenticated, saved client settings.
import {request as httpsRequest} from 'node:https';
import {Buffer} from 'node:buffer';

export const BASELINE_URL='https://cotivate.com/';
const MAX_PAGES=20,MAX_PAGE_BYTES=1000000,MAX_CAPTURE_TEXT=60000;
const pageSizeError=()=>Object.assign(new Error('A configured page exceeds the download limit.'),{code:'BCM_PAGE_SIZE_LIMIT'});

function isPrivateIpv4(value){
 const parts=String(value).split('.');if(parts.length!==4||parts.some(x=>!/^\d{1,3}$/.test(x)||Number(x)>255))return true;
 const [a,b]=parts.map(Number);
 return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===0||b===168))||(a===198&&(b===18||b===19||b===51))||(a===203&&b===0);
}
function isPrivateIpv6(value){
 const ip=String(value).toLowerCase().replace(/^\[|\]$/g,'');
 if(ip.includes('.'))return true; // IPv4-mapped and transition forms are not accepted.
 const groups=ip.split(':');const first=parseInt(groups[0]||'0',16),second=parseInt(groups[1]||'0',16);
 return !(first>=0x2000&&first<=0x3fff)||(first===0x2001&&second<=0x01ff)||ip.startsWith('2001:db8:')||ip.startsWith('2002:');
}
export function validateTargetUrl(value){
 let url;try{url=new URL(value);}catch{throw new Error('Enter a valid public HTTPS page URL.');}
 const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,'');
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||(url.port&&url.port!=='443')||!host||
   /(^|\.)(localhost|local|internal|test|invalid|example|lan|home\.arpa)$/.test(host)||host==='metadata.google.internal'||
   /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)||host.includes(':')||!host.includes('.'))
  throw new Error('Use a public HTTPS page URL without credentials, query strings, fragments, IP addresses, or a custom port.');
 return url;
}
export function isExcludedPath(pathname,exclusions=[]){
 const path=decodeURIComponent(pathname||'/');
 return exclusions.some(raw=>{const exclusion=decodeURIComponent(raw);if(exclusion==='/')return true;const prefix=exclusion.endsWith('/')?exclusion:exclusion+'/';return path===exclusion||path.startsWith(prefix);});
}
export function validateSettings(settings){
 if(settings?.discovery_mode!==undefined&&!['pages','site'].includes(settings.discovery_mode))throw new Error('Choose a valid discovery mode.');
 if(settings?.discovery_mode==='site'&&settings.urls?.length!==1)throw new Error('Enter one starting website address.');
 if(settings?.access_mode!=='public'||!Array.isArray(settings.urls)||settings.urls.length<1||settings.urls.length>MAX_PAGES)throw new Error('Choose between 1 and 20 public HTTPS page URLs. Authenticated pages are not supported.');
 const normalized=new Set(),validated=[];
 for(const raw of settings.urls){
  if(typeof raw!=='string')throw new Error('A saved page URL is invalid.');
  const url=validateTargetUrl(raw);if(url.href.length>2048)throw new Error('A page URL is too long.');
  if(normalized.has(url.href))throw new Error('Remove duplicate page URLs.');normalized.add(url.href);validated.push(raw);
 }
 if(!Array.isArray(settings.exclusions||[])||(settings.exclusions||[]).some(x=>typeof x!=='string'||x.length>512||!/^\/[^\s?#]*$/.test(x)))throw new Error('Saved excluded paths are invalid.');
 const pages=validated.filter(raw=>!isExcludedPath(new URL(raw).pathname,settings.exclusions||[]));
 if(!pages.length)throw new Error('All configured pages are excluded. Remove an exclusion before scanning.');
 return pages;
}
function decode(text){return text.replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/gi,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n.toLowerCase()]);}
const plain=text=>decode(text.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function extractSnapshot(html,url=BASELINE_URL){
 const clean=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
 const title=plain(clean.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]||'').slice(0,500);
 const headings=[...clean.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]\s*>/gi)].map(m=>plain(m[1]).slice(0,500)).filter(Boolean).slice(0,100);
 const body=clean.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1]||clean;
 const text=plain(body.replace(/<\/(?:p|h[1-6]|li|section|article|div|button|br)\s*>/gi,' . '));
 if(text.length<8)throw new Error('A configured page did not provide enough readable text.');
 return {url,title,headings,text,extractor:'source-text-v2'};
}
async function resolvePublicHost(host,resolveImpl){
 const resolve=resolveImpl||(globalThis.Deno?.resolveDns?((name,type)=>Deno.resolveDns(name,type)):null);
 if(!resolve)throw new Error('Public-address checks are unavailable; the page was not fetched.');
 const addresses=[];
 for(const type of ['A','AAAA']){
  try{for(const address of await resolve(host,type)){addresses.push({address,family:type==='A'?4:6});}}catch(error){if(!/not found|no records|NXDOMAIN|ENODATA/i.test(String(error?.message||error)))throw new Error('The page host could not be safely checked.');}
 }
 if(!addresses.length||addresses.some(({address,family})=>family===6?isPrivateIpv6(address):isPrivateIpv4(address)))throw new Error('The configured page must resolve only to public network addresses.');
 return addresses;
}
// A strict, bounded HTTP/1 response reader for the native Deno pinned TLS connection.
export function readBoundedResponse(raw,eof=false,types=['text/html']){
 const end=raw.indexOf('\r\n\r\n');
 if(end<0){if(raw.length>32768||eof)throw new Error('Invalid or oversized page headers.');return null;}
 if(end>32768)throw new Error('Page headers exceed the limit.');
 const lines=raw.subarray(0,end).toString('latin1').split('\r\n');
 if(!/^HTTP\/1\.[01] 200(?: |$)/.test(lines.shift()))throw new Error('A configured page could not be read. Redirects and sign-in pages are not followed.');
 const headers={};
 for(const line of lines){
  const match=line.match(/^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*([^\r\n]*)$/);
  if(!match)throw new Error('Invalid page headers.');
  const name=match[1].toLowerCase(),value=match[2].trim();
  if(Object.hasOwn(headers,name)&&['content-length','transfer-encoding','content-type','content-encoding'].includes(name))throw new Error('Ambiguous page headers.');
  headers[name]=value;
 }
 if(!types.includes((headers['content-type']||'').split(';')[0].trim().toLowerCase()))throw new Error('A configured page did not return HTML.');
 if(headers['content-encoding']&&headers['content-encoding']!=='identity')throw new Error('A configured page used an unsupported content encoding.');
 const body=raw.subarray(end+4),length=headers['content-length'],transfer=headers['transfer-encoding'];
 if(transfer){
  if(transfer.toLowerCase()!=='chunked'||length!==undefined)throw new Error('Unsupported page framing.');
  let offset=0,size=0;const chunks=[];
  while(true){
   const lineEnd=body.indexOf('\r\n',offset);
   if(lineEnd<0){if(body.length-offset>1024||eof)throw new Error('Incomplete page chunks.');return null;}
   const sizeLine=body.subarray(offset,lineEnd).toString('ascii');
   if(sizeLine.length>1024||!/^([0-9a-f]{1,8})(?:;[^\r\n]*)?$/i.test(sizeLine))throw new Error('Invalid page chunk.');
   const count=parseInt(sizeLine,16);offset=lineEnd+2;
   if(count===0){
    let finish;
    if(body.subarray(offset,offset+2).toString()==='\r\n')finish=offset+2;
    else {const trailers=body.indexOf('\r\n\r\n',offset);if(trailers>=0)finish=trailers+4;}
    if(finish===undefined){if(eof)throw new Error('Incomplete page trailers.');return null;}
    if(finish!==body.length)throw new Error('Unexpected data after page.');
    return new Response(Buffer.concat(chunks),{headers:{'content-type':headers['content-type']}});
   }
   size+=count;if(size>MAX_PAGE_BYTES)throw pageSizeError();
   if(body.length<offset+count+2){if(eof)throw new Error('Incomplete page chunks.');return null;}
   if(body.subarray(offset+count,offset+count+2).toString()!=='\r\n')throw new Error('Invalid page chunk.');
   chunks.push(body.subarray(offset,offset+count));offset+=count+2;
  }
 }
 if(length!==undefined){
  if(!/^\d+$/.test(length))throw new Error('Invalid page length.');
  if(Number(length)>MAX_PAGE_BYTES)throw pageSizeError();
  if(body.length>Number(length))throw new Error('Unexpected data after page.');
  if(body.length<Number(length)){if(eof)throw new Error('Incomplete page response.');return null;}
 }else if(!eof){if(body.length>MAX_PAGE_BYTES)throw pageSizeError();return null;}
 if(body.length>MAX_PAGE_BYTES)throw pageSizeError();
 return new Response(body,{headers:{'content-type':headers['content-type']}});
}
async function pinnedDenoRequest(url,addresses,{denoImpl,timeoutMs=12000,types=['text/html']}){
 const selected=addresses[0];if(!selected)throw new Error('The page host has no verified public address.');
 let connection,timer,expired=false;
 const close=()=>{try{connection?.close();}catch{}};
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;close();reject(new Error('A configured page took too long to respond.'));},timeoutMs);});
 const work=(async()=>{
  connection=await denoImpl.connect({hostname:selected.address,port:443,transport:'tcp'});
  if(expired){close();throw new Error('A configured page took too long to respond.');}
  // Upgrade the already pinned socket; the original hostname supplies SNI and certificate verification.
  connection=await denoImpl.startTls(connection,{hostname:url.hostname});
  if(expired){close();throw new Error('A configured page took too long to respond.');}
  const request=Buffer.from(`GET ${url.pathname} HTTP/1.1\r\nHost: ${url.hostname}\r\nAccept: ${types.join(', ')}\r\nAccept-Encoding: identity\r\nUser-Agent: VentureBranding-BCM/1.0\r\nConnection: close\r\n\r\n`);
  for(let offset=0;offset<request.length;){const count=await connection.write(request.subarray(offset));if(!Number.isInteger(count)||count<1)throw new Error('A configured page connection failed.');offset+=count;}
  let raw=Buffer.alloc(0);const buffer=new Uint8Array(8192);
  while(true){
   const count=await connection.read(buffer);
   if(count===null){const response=readBoundedResponse(raw,true,types);if(!response)throw new Error('Incomplete page response.');return response;}
   if(!Number.isInteger(count)||count<1)throw new Error('A configured page connection failed.');
   raw=Buffer.concat([raw,Buffer.from(buffer.subarray(0,count))]);
   if(raw.length>MAX_PAGE_BYTES+65536)throw pageSizeError();
   const response=readBoundedResponse(raw,false,types);if(response)return response;
  }
 })();
 try{return await Promise.race([work,deadline]);}finally{clearTimeout(timer);close();}
}
function pinnedRequest(url,addresses,{requestImpl=httpsRequest,denoImpl=globalThis.Deno,timeoutMs=12000,types=['text/html']}={}){
 if(denoImpl?.connect&&denoImpl?.startTls)return pinnedDenoRequest(url,addresses,{denoImpl,timeoutMs,types});
 const selected=addresses[0];if(!selected)throw new Error('The page host has no verified public address.');
 return new Promise((resolve,reject)=>{
  let request,response,timer,settled=false,size=0;const chunks=[];
  const fail=(message,code)=>{if(settled)return;settled=true;clearTimeout(timer);try{response?.destroy();request?.destroy();}catch{}reject(Object.assign(new Error(message),code?{code}:{}));};
  const lookup=(host,options,callback)=>{
   if(String(host).toLowerCase()!==url.hostname.toLowerCase())return callback(new Error('Unexpected network host.'));
   const family=typeof options==='object'?options.family:options;
   if(family&&family!==selected.family)return callback(new Error('The verified address family is unavailable.'));
   if(typeof options==='object'&&options.all)callback(null,[selected]);else callback(null,selected.address,selected.family);
  };
  try{
   request=requestImpl({protocol:'https:',hostname:url.hostname,port:443,path:url.pathname,method:'GET',agent:false,servername:url.hostname,rejectUnauthorized:true,lookup,maxHeaderSize:32768,headers:{Accept:types.join(', '),'Accept-Encoding':'identity','User-Agent':'VentureBranding-BCM/1.0','Connection':'close'}},incoming=>{
    response=incoming;
    if(incoming.statusCode!==200){fail('A configured page could not be read. Redirects and sign-in pages are not followed.');return;}
    const type=incoming.headers['content-type']||'';
    if(typeof type!=='string'||!types.includes(type.split(';')[0].trim().toLowerCase())){fail('A configured page did not return HTML.');return;}
    const encoding=incoming.headers['content-encoding'];
    if(encoding&&encoding!=='identity'){fail('A configured page used an unsupported content encoding.');return;}
    const length=incoming.headers['content-length'];
    if(length!==undefined&&!/^\d+$/.test(String(length))){fail('Invalid page length.');return;}
    if(length!==undefined&&Number(length)>MAX_PAGE_BYTES){fail('A configured page exceeds the download limit.','BCM_PAGE_SIZE_LIMIT');return;}
    incoming.on('data',chunk=>{size+=chunk.length;if(size>MAX_PAGE_BYTES){fail('A configured page exceeds the download limit.','BCM_PAGE_SIZE_LIMIT');return;}chunks.push(chunk);});
    incoming.on('aborted',()=>fail('A configured page response ended unexpectedly.'));
    incoming.on('error',()=>fail('A configured page response could not be read.'));
    incoming.on('end',()=>{if(settled)return;settled=true;clearTimeout(timer);resolve(new Response(Buffer.concat(chunks),{status:200,headers:{'content-type':type}}));});
   });
   request.on('error',()=>fail('A configured page connection failed.'));
   timer=setTimeout(()=>fail('A configured page took too long to respond.'),timeoutMs);
   request.end();
  }catch{fail('A configured page connection failed.');}
 });
}
async function readPublicResource(url,{fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs},kind='html'){
 const types=kind==='xml'?['application/xml','text/xml','text/html']:kind==='text'?['text/plain','text/html']:['text/html'];
 const parsed=validateTargetUrl(url),started=Date.now();let timer;
 let addresses;
 try{addresses=await Promise.race([resolvePublicHost(parsed.hostname,resolveImpl),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Address check took too long.')),timeoutMs||12000);})]);}finally{clearTimeout(timer);}
 const remaining=Math.max(1,(timeoutMs||12000)-(Date.now()-started));
 // Hosted Deno connects to the checked IP, then verifies TLS against the original host. Node uses a pinned lookup.
 const response=fetchImpl?await fetchImpl(parsed.href,{redirect:'manual',credentials:'omit',headers:{Accept:types.join(', '),'User-Agent':'VentureBranding-BCM/1.0'}}):await pinnedRequest(parsed,addresses,{requestImpl,denoImpl,timeoutMs:remaining,types});
 if(response.status!==200)throw new Error('A configured page could not be read. Redirects and sign-in pages are not followed.');
 if(!types.includes((response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()))throw new Error('A configured page did not return HTML.');
 const html=await response.text();
 if(new TextEncoder().encode(html).byteLength>MAX_PAGE_BYTES)throw pageSizeError();
 return html;
}
async function readPage(url,options){return extractSnapshot(await readPublicResource(url,options),url);}
export async function fetchSnapshots(settings,{fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs=12000}={}){
 const urls=validateSettings(settings),pages=[];
 if(settings.discovery_mode==='site')return discoverPublicSite(settings,{readResource:(url,kind,remaining)=>readPublicResource(url,{fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs:Math.min(timeoutMs,remaining)},kind),extract:extractSnapshot,validateUrl:validateTargetUrl,excluded:isExcludedPath});
 for(let i=0;i<urls.length;i+=4){pages.push(...await Promise.all(urls.slice(i,i+4).map(url=>readPage(url,{fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs}))));}
 const text=pages.map(page=>page.text).join('\n');
 if(text.length<40)throw new Error('The configured pages did not provide enough readable text.');
 if(text.length>MAX_CAPTURE_TEXT)throw new Error('The configured pages exceed the total saved-text limit. Reduce the number of URLs or choose shorter pages.');
 return {url:pages[0].url,urls:pages.map(page=>page.url),pages,title:pages[0].title,headings:pages.flatMap(page=>page.headings).slice(0,100),text,extractor:'source-text-v2'};
}
export async function fetchSnapshot({url=BASELINE_URL,fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs=12000}={}){
 validateSettings({access_mode:'public',urls:[url],exclusions:[]});
 const page=await readPage(url,{fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs});
 return {...page,urls:[page.url],pages:[page],extractor:'source-text-v2'};
}


export function createBcmHandler({createClient,env,scan=fetchSnapshots}){
 const origins=(env('VB_ALLOWED_ORIGINS')||'http://127.0.0.1:8000').split(',').map(s=>s.trim());
 return async req=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.includes(origin))return reply({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  if(req.method!=='POST')return reply({error:'POST required.'},405);
  let admin,ticket;
  try{
   const authorization=req.headers.get('authorization')||'';
   if(!authorization.startsWith('Bearer '))return reply({error:'Please sign in again.'},401);
   const db=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const user=await db.auth.getUser();if(user.error||!user.data.user)return reply({error:'Please sign in again.'},401);
   const role=await db.rpc('vb_session_role');if(role.error||role.data!=='client')return reply({error:'Client access required.'},403);
   const raw=await req.text();if(raw.length>1024)return reply({error:'Request too large.'},413);
   const input=JSON.parse(raw);
   if(!input||Object.keys(input).some(k=>!['clientId','version','action'].includes(k))||!(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i).test(input.clientId)||!Number.isInteger(input.version)||input.version<1)return reply({error:'Invalid scan request.'},400);
   const settings=await db.from('vb_bcm_settings').select('*').eq('client_id',input.clientId).single();
   if(settings.error||!settings.data)return reply({error:'Saved settings unavailable.'},403);
   const action=input.action||'baseline';if(!['baseline','comparison'].includes(action))return reply({error:'Invalid scan type.'},400);
   validateSettings(settings.data);
   const key=env('SUPABASE_SERVICE_ROLE_KEY');if(!key)return reply({error:'Baseline scanning is not connected yet.'},503);
   const reserved=await db.rpc(action==='baseline'?'vb_begin_bcm_baseline':'vb_begin_bcm_comparison',{target_client:input.clientId,expected_version:input.version});
   if(reserved.error)return reply({error:'A baseline or comparison may already exist, settings changed, or a scan is in progress. Reload scan history before retrying.'},409);
   ticket=reserved.data;
   admin=createClient(env('SUPABASE_URL'),key,{auth:{persistSession:false,autoRefreshToken:false}});
   const snapshot=await scan(settings.data);
   const result=await admin.rpc('vb_finish_bcm_baseline',{ticket,snapshot,failure:false});
   if(result.error)throw new Error('Unable to save baseline.');
   if(result.data!=='completed')return reply({error:'Settings or access changed during the scan. No baseline was saved.'},409);
   return reply({id:ticket,status:'completed',action});
  }catch{
   if(admin&&ticket)try{await admin.rpc('vb_finish_bcm_baseline',{ticket,snapshot:null,failure:true});}catch{}
   return reply({error:ticket?'Scan failed. No new baseline was saved. Check saved public pages and scan history before retrying.':'Unable to start. Save public HTTPS page settings and try again.'},400);
  }
 };
}

Deno.serve(createBcmHandler({createClient,env:(key)=>Deno.env.get(key)}));
