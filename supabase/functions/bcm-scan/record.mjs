// Public-page-only scanner. Targets come from authenticated, saved client settings.
import {request as httpsRequest} from 'node:https';
import {Buffer} from 'node:buffer';
export const BASELINE_URL='https://cotivate.com/';
const MAX_PAGES=20,MAX_PAGE_BYTES=250000,MAX_CAPTURE_TEXT=60000;

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
export function readBoundedResponse(raw,eof=false){
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
 if(!/^text\/html(?:;|$)/i.test(headers['content-type']||''))throw new Error('A configured page did not return HTML.');
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
   size+=count;if(size>MAX_PAGE_BYTES)throw new Error('A configured page exceeds the download limit.');
   if(body.length<offset+count+2){if(eof)throw new Error('Incomplete page chunks.');return null;}
   if(body.subarray(offset+count,offset+count+2).toString()!=='\r\n')throw new Error('Invalid page chunk.');
   chunks.push(body.subarray(offset,offset+count));offset+=count+2;
  }
 }
 if(length!==undefined){
  if(!/^\d+$/.test(length)||Number(length)>MAX_PAGE_BYTES)throw new Error('A configured page exceeds the download limit.');
  if(body.length>Number(length))throw new Error('Unexpected data after page.');
  if(body.length<Number(length)){if(eof)throw new Error('Incomplete page response.');return null;}
 }else if(!eof){if(body.length>MAX_PAGE_BYTES)throw new Error('A configured page exceeds the download limit.');return null;}
 if(body.length>MAX_PAGE_BYTES)throw new Error('A configured page exceeds the download limit.');
 return new Response(body,{headers:{'content-type':headers['content-type']}});
}
async function pinnedDenoRequest(url,addresses,{denoImpl,timeoutMs=12000}){
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
  const request=Buffer.from(`GET ${url.pathname} HTTP/1.1\r\nHost: ${url.hostname}\r\nAccept: text/html\r\nAccept-Encoding: identity\r\nUser-Agent: VentureBranding-BCM/1.0\r\nConnection: close\r\n\r\n`);
  for(let offset=0;offset<request.length;){const count=await connection.write(request.subarray(offset));if(!Number.isInteger(count)||count<1)throw new Error('A configured page connection failed.');offset+=count;}
  let raw=Buffer.alloc(0);const buffer=new Uint8Array(8192);
  while(true){
   const count=await connection.read(buffer);
   if(count===null){const response=readBoundedResponse(raw,true);if(!response)throw new Error('Incomplete page response.');return response;}
   if(!Number.isInteger(count)||count<1)throw new Error('A configured page connection failed.');
   raw=Buffer.concat([raw,Buffer.from(buffer.subarray(0,count))]);
   if(raw.length>MAX_PAGE_BYTES+65536)throw new Error('A configured page exceeds the download limit.');
   const response=readBoundedResponse(raw);if(response)return response;
  }
 })();
 try{return await Promise.race([work,deadline]);}finally{clearTimeout(timer);close();}
}
function pinnedRequest(url,addresses,{requestImpl=httpsRequest,denoImpl=globalThis.Deno,timeoutMs=12000}={}){
 if(denoImpl?.connect&&denoImpl?.startTls)return pinnedDenoRequest(url,addresses,{denoImpl,timeoutMs});
 const selected=addresses[0];if(!selected)throw new Error('The page host has no verified public address.');
 return new Promise((resolve,reject)=>{
  let request,response,timer,settled=false,size=0;const chunks=[];
  const fail=message=>{if(settled)return;settled=true;clearTimeout(timer);try{response?.destroy();request?.destroy();}catch{}reject(new Error(message));};
  const lookup=(host,options,callback)=>{
   if(String(host).toLowerCase()!==url.hostname.toLowerCase())return callback(new Error('Unexpected network host.'));
   const family=typeof options==='object'?options.family:options;
   if(family&&family!==selected.family)return callback(new Error('The verified address family is unavailable.'));
   if(typeof options==='object'&&options.all)callback(null,[selected]);else callback(null,selected.address,selected.family);
  };
  try{
   request=requestImpl({protocol:'https:',hostname:url.hostname,port:443,path:url.pathname,method:'GET',agent:false,servername:url.hostname,rejectUnauthorized:true,lookup,maxHeaderSize:32768,headers:{Accept:'text/html','Accept-Encoding':'identity','User-Agent':'VentureBranding-BCM/1.0','Connection':'close'}},incoming=>{
    response=incoming;
    if(incoming.statusCode!==200){fail('A configured page could not be read. Redirects and sign-in pages are not followed.');return;}
    const type=incoming.headers['content-type']||'';
    if(typeof type!=='string'||!/^text\/html(?:;|$)/i.test(type)){fail('A configured page did not return HTML.');return;}
    const encoding=incoming.headers['content-encoding'];
    if(encoding&&encoding!=='identity'){fail('A configured page used an unsupported content encoding.');return;}
    const length=incoming.headers['content-length'];
    if(length!==undefined&&(!/^\d+$/.test(String(length))||Number(length)>MAX_PAGE_BYTES)){fail('A configured page exceeds the download limit.');return;}
    incoming.on('data',chunk=>{size+=chunk.length;if(size>MAX_PAGE_BYTES){fail('A configured page exceeds the download limit.');return;}chunks.push(chunk);});
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
async function readPage(url,{fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs}){
 const parsed=validateTargetUrl(url),addresses=await resolvePublicHost(parsed.hostname,resolveImpl);
 // Hosted Deno connects to the checked IP, then verifies TLS against the original host. Node uses a pinned lookup.
 const response=fetchImpl?await fetchImpl(parsed.href,{redirect:'manual',credentials:'omit',headers:{Accept:'text/html','User-Agent':'VentureBranding-BCM/1.0'}}):await pinnedRequest(parsed,addresses,{requestImpl,denoImpl,timeoutMs});
 if(response.status!==200)throw new Error('A configured page could not be read. Redirects and sign-in pages are not followed.');
 if(!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')||''))throw new Error('A configured page did not return HTML.');
 const html=await response.text();
 if(new TextEncoder().encode(html).byteLength>MAX_PAGE_BYTES)throw new Error('A configured page exceeds the download limit.');
 return extractSnapshot(html,url);
}
export async function fetchSnapshots(settings,{fetchImpl,requestImpl,denoImpl,resolveImpl,timeoutMs=12000}={}){
 const urls=validateSettings(settings),pages=[];
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
