// Cotivate pilot only. No caller-supplied fetch destinations or redirects.
export const BASELINE_URL='https://cotivate.com/';
export function validateSettings(settings){
 if(settings?.access_mode!=='public'||settings.urls?.length!==1||!['https://cotivate.com','https://cotivate.com/'].includes(settings.urls[0]))throw new Error('This first scanner supports only https://cotivate.com/ with public access.');
 if(settings.exclusions?.includes('/'))throw new Error('The homepage is excluded from monitoring.');
}
function decode(text){return text.replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/gi,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n.toLowerCase()]);}
const plain=text=>decode(text.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function extractSnapshot(html){
 // This is source-text extraction, not browser-rendered or authenticated content.
 const clean=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
 const title=plain(clean.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]||'').slice(0,500);
 const headings=[...clean.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]\s*>/gi)].map(m=>plain(m[1]).slice(0,500)).filter(Boolean).slice(0,100);
 const body=clean.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1]||clean;
 const text=plain(body.replace(/<\/(?:p|h[1-6]|li|section|article|div|button|br)\s*>/gi,' . '));
 if(text.length<40)throw new Error('The page did not provide enough readable text.');
 if(text.length>60000)throw new Error('The page exceeds this scanner’s text limit.');
 return {url:BASELINE_URL,title,headings,text,extractor:'source-text-v1'};
}
export async function fetchSnapshot({fetchImpl=fetch,timeoutMs=12000}={}){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);
 try{
  const response=await fetchImpl(BASELINE_URL,{redirect:'manual',credentials:'omit',signal:abort.signal,headers:{Accept:'text/html','User-Agent':'VentureBranding-BCM/1.0'}});
  if(!response.ok)throw new Error('The homepage could not be read. Redirects and sign-in pages are not followed.');
  if(!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')||''))throw new Error('The homepage did not return HTML.');
  if(Number(response.headers.get('content-length')||0)>1000000)throw new Error('The page exceeds the download limit.');
  if(!response.body)throw new Error('The homepage returned no content.');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000)throw new Error('The page exceeds the download limit.');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  return extractSnapshot(new TextDecoder().decode(bytes));
 }finally{clearTimeout(timer);}
}
