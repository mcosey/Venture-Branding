// One drawing plane keeps labels, rings, paths, and nodes in the same coordinate system.
export const atlasLayout = {
 formation:{x:640,y:155,color:'#00f0cc',lines:['Formation &','structure']},
 contracts:{x:300,y:245,color:'#269fff',lines:['Vibe','Coding']},
 brand:{x:980,y:245,color:'#269fff',lines:['Brand','protection']},
 people:{x:300,y:510,color:'#b06cff',lines:['People &','hiring']},
 ownership:{x:980,y:510,color:'#16f2c4',lines:['IP ownership']},
 fundraising:{x:490,y:755,color:'#ffd04b',lines:['Fundraising']},
 compliance:{x:790,y:755,color:'#00e7ef',lines:['Ongoing','obligations']}
};
// Every milestone label has an explicit placement, independent of font wrapping.
export const atlasTasks = {
 formation:[
 {index:0,angle:-90,lines:['Business','structure'],dx:0,dy:-36,anchor:'middle'},
 {index:1,angle:-135,lines:['Founders’','agreement'],dx:-24,dy:-10,anchor:'end'},
 {index:3,angle:-170,lines:['Initial','ownership'],dx:-24,dy:-5,anchor:'end'},
 {index:4,angle:-45,lines:['Initial','decisions'],dx:24,dy:-10,anchor:'start'},
 {index:2,angle:-10,lines:['Governing','documents'],dx:24,dy:-5,anchor:'start'}],
 contracts:[{index:0,angle:-145,lines:['Considerations'],dx:-25,dy:-5,anchor:'end'}],
 brand:[
 {index:0,angle:-90,lines:['Trademark','clearance'],dx:0,dy:-38,anchor:'middle'},
 {index:1,angle:-35,lines:['Brand strategy'],dx:24,dy:5,anchor:'start'},
 {index:2,angle:5,lines:['Domain names'],dx:24,dy:5,anchor:'start'}],
 people:[
 {index:0,angle:-120,lines:['Employee or','contractor'],dx:-24,dy:-16,anchor:'end'},
 {index:1,angle:-170,lines:['Offer letters'],dx:-26,dy:5,anchor:'end'},
 {index:2,angle:155,lines:['Workplace','policies'],dx:-25,dy:0,anchor:'end'}],
 ownership:[
 {index:0,angle:-60,lines:['Assigning IP'],dx:20,dy:-22,anchor:'start'},
 {index:1,angle:-5,lines:['Contractor IP'],dx:24,dy:5,anchor:'start'},
 {index:2,angle:40,lines:['Open source'],dx:24,dy:5,anchor:'start'}],
 fundraising:[
 {index:0,angle:140,lines:['Term sheets'],dx:-24,dy:22,anchor:'end'},
 {index:1,angle:90,lines:['Investor rights'],dx:0,dy:31,anchor:'middle'},
 {index:2,angle:40,lines:['Diligence','preparation'],dx:20,dy:12,anchor:'start'}],
 compliance:[
 {index:0,angle:140,lines:['Annual filings'],dx:-12,dy:52,anchor:'end'},
 {index:1,angle:90,lines:['Tax questions'],dx:0,dy:31,anchor:'middle'},
 {index:2,angle:40,lines:['Data privacy'],dx:24,dy:22,anchor:'start'}]

};
export const atlasBusiness = {x:640,y:440};
export function outwardAxis(center){return Math.atan2(center.y-atlasBusiness.y,center.x-atlasBusiness.x)*180/Math.PI;}
// The median milestone continues the business/category axis. Neighboring milestones fan symmetrically.
for(const [id,specs]of Object.entries(atlasTasks)){
 const axis=outwardAxis(atlasLayout[id]);
 const relative=angle=>((angle-axis+540)%360)-180;
 const ordered=specs.slice().sort((a,b)=>relative(a.angle)-relative(b.angle));
 const step=specs.length===5?36:40;
 ordered.forEach((spec,i)=>{
  spec.angle=axis+(i-(ordered.length-1)/2)*step;
  const radians=spec.angle*Math.PI/180,dx=Math.cos(radians),dy=Math.sin(radians);
  spec.anchor=dx>.28?'start':dx<-.28?'end':'middle';
  spec.dx=dx*26;spec.dy=dy*27-(spec.lines.length-1)*8+5;
 });
}
export function ringPoint(c,angle,r=96){const a=angle*Math.PI/180;return {x:c.x+Math.cos(a)*r,y:c.y+Math.sin(a)*r};}
export function atlasRoute(a,b,ra,rb){const d=Math.hypot(b.x-a.x,b.y-a.y);return [{x:a.x+(b.x-a.x)/d*ra,y:a.y+(b.y-a.y)/d*ra},{x:b.x-(b.x-a.x)/d*rb,y:b.y-(b.y-a.y)/d*rb}];}
export function companyLabel(name){
 const value=typeof name==='string'?name.trim():'';if(!value)return ['Your','business'];
 const words=value.split(/\s+/).flatMap(word=>word.match(/.{1,14}/gu)||[]),lines=[];let line='';
 for(const word of words){if(line&&line.length+1+word.length>14){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
 if(line)lines.push(line);if(lines.length>3)return [...lines.slice(0,2),lines[2].slice(0,13)+'…'];return lines;
}
export function createMasterAtlas({businessName='',categories,categoryTasks,milestones,progress,milestoneStatus,listView,onToggle,icon}){
 const ns='http://www.w3.org/2000/svg';
 const h=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
 const html=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const section=html('section',undefined,'llk-atlas'+(listView?' is-list':''));section.setAttribute('aria-label','Legal Launch Kit roadmap');
 const controls=html('div',undefined,'atlas-controls');const caption=html('span','YOUR LEGAL ROADMAP','eyebrow');const button=html('button',listView?'Show map':'Show list','quiet-button');button.type='button';button.onclick=onToggle;controls.append(caption,button);section.append(controls);
 const svg=h('svg',{viewBox:'0 0 1280 910',class:'atlas-drawing',role:'group','aria-label':'Your business and seven connected legal topic clusters'});svg.append(h('title',{},'Legal Launch Kit'),h('desc',{},'Choose a category or milestone. Formation and Vibe Coding are available; other categories are previews. Connections show relationships, not a required order.'));
 const defs=h('defs');
 const glow=h('filter',{id:'atlas-soft-glow',x:'-100%',y:'-100%',width:'300%',height:'300%'});glow.append(h('feGaussianBlur',{stdDeviation:3}));defs.append(glow);
 const vignette=h('radialGradient',{id:'atlas-depth'});vignette.append(h('stop',{offset:'0%','stop-color':'#0b1c2b','stop-opacity':'.16'}),h('stop',{offset:'100%','stop-color':'#03111b','stop-opacity':'0'}));defs.append(vignette);svg.append(defs);
 const background=h('g',{'aria-hidden':'true',class:'atlas-background'});background.append(h('rect',{width:1280,height:910,fill:'url(#atlas-depth)'}));
 const root=atlasBusiness;
 for(const r of [146,165,193,240,310,380,440,492,545,585])background.append(h('circle',{cx:root.x,cy:root.y,r,class:'draft-circle'}));
 for(let i=0;i<144;i++){
  const a=i*2.5,r=i%12===0?567:i%3===0?575:581,p=ringPoint(root,a,r),q=ringPoint(root,a,587);
  background.append(h('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:'draft-mark'}));
  if(i%12===0){const p=ringPoint(root,a,550);background.append(h('circle',{cx:p.x,cy:p.y,r:7,class:'draft-medallion'}),h('path',{d:`M${p.x-3} ${p.y}h6m-3-3v6`,class:'draft-mark'}));}
 }
 // Fine drafting arcs and guide lines stay behind the actual readable controls.
 for(const y of [94,440,835])background.append(h('path',{d:`M25 ${y}H1255`,class:'draft-guide'}));
 for(const x of [54,1226])background.append(h('path',{d:`M${x} 70V860`,class:'draft-guide'}));
 for(const angle of [15,45,75,120,150,195,225,255,300,330]){
  const p=ringPoint(root,angle,515),q=ringPoint(root,angle+4,535);background.append(h('path',{d:`M${p.x-6} ${p.y}L${p.x} ${p.y-7}L${p.x+6} ${p.y}L${p.x} ${p.y+7}Z M${p.x} ${p.y}L${q.x} ${q.y}`,class:'draft-mark'}));
 }
 svg.append(background);
 const paths=h('g',{'aria-hidden':'true',class:'atlas-paths'});const junctions=[];
 let glowIndex=0;
 const line=(a,b,cls)=>{
  if(cls==='gold-path'){
   const id='atlas-connection-bloom-'+glowIndex++,filter=h('filter',{id,filterUnits:'userSpaceOnUse',x:Math.min(a.x,b.x)-20,y:Math.min(a.y,b.y)-20,width:Math.abs(a.x-b.x)+40,height:Math.abs(a.y-b.y)+40});filter.append(h('feGaussianBlur',{stdDeviation:2.5}));defs.append(filter);
   paths.append(h('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'gold-bloom',style:`filter:url(#${id})`}));
  }
  paths.append(h('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:cls,...(cls==='gold-filament'?{pathLength:100}:{})}));
 };
 for(const c of categories){const target=atlasLayout[c.id], [a,b]=atlasRoute(root,target,119,104);line(a,b,'gold-path');const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),ox=-dy/d*2.2,oy=dx/d*2.2;line({x:a.x+ox,y:a.y+oy},{x:b.x+ox,y:b.y+oy},'gold-filament');junctions.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2});}
 // This inner network makes the paths continuous, while all paths stop at ring edges.
 const sorted=junctions.slice().sort((a,b)=>Math.atan2(a.y-root.y,a.x-root.x)-Math.atan2(b.y-root.y,b.x-root.x));
 sorted.forEach((p,i)=>line(p,sorted[(i+1)%sorted.length],'network-filament'));
 for(const [a,b]of [['contracts','people'],['brand','ownership'],['people','fundraising'],['ownership','compliance']]){const [start,end]=atlasRoute(atlasLayout[a],atlasLayout[b],104,104);line(start,end,'neighbor-filament');}
 for(const p of junctions){paths.append(h('circle',{cx:p.x,cy:p.y,r:11,class:'path-junction'}),h('circle',{cx:p.x,cy:p.y,r:15,class:'junction-halo'}),h('path',{d:`M${p.x} ${p.y-7}L${p.x+7} ${p.y}L${p.x} ${p.y+7}L${p.x-7} ${p.y}Z`,class:'junction-symbol'}));}
 svg.append(paths);
 function ringwork(parent,c,color,central=false){
  const g=h('g',{'aria-hidden':'true',class:'atlas-ringwork',style:`--tone:${color}`});const rs=central?[92,98,108,116]:[72,76,88,96,102];
  for(const [i,r]of rs.entries())g.append(h('circle',{cx:c.x,cy:c.y,r,class:i%2?'engraved-dashed':'engraved-ring'}));
  for(let i=0;i<64;i++){
   const angle=i*360/64,outer=central?115:101,inner=outer-(i%4===0?5:2),p=ringPoint(c,angle,inner),q=ringPoint(c,angle,outer);g.append(h('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:'engraved-tick'}));
   if(i%8===0){const j=ringPoint(c,angle,central?106:83);g.append(h('path',{d:`M${j.x-2} ${j.y-2}h4v4h-4z`,class:'engraved-glyph'}));}
  }parent.append(g);
 }
 function label(parent,x,y,lines,anchor='middle',cls='atlas-label'){
  const t=h('text',{x,y,'text-anchor':anchor,class:cls});lines.forEach((line,i)=>t.append(h('tspan',{x,dy:i?17:0},line)));parent.append(t);return t;
 }
 function core(c,title,href,color,central=false){
  const g=h(href?'a':'g',href?{href,tabindex:0,'aria-label':central&&businessName?businessName+' — edit company profile':title.join(' '),class:central?'atlas-category atlas-business':'atlas-category',style:`--tone:${color}`}:{class:'atlas-business',style:`--tone:${color}`});
  const gradientId='atlas-core-'+(central?'business':Object.keys(atlasLayout).find(id=>atlasLayout[id]===c));
  const gradient=h('radialGradient',{id:gradientId,cx:'50%',cy:'50%',r:'50%'});gradient.append(h('stop',{offset:'0%','stop-color':'#081522'}),h('stop',{offset:'72%','stop-color':central?'#1b1725':'#0a1d2b'}),h('stop',{offset:'100%','stop-color':color,'stop-opacity':'.16'}));defs.append(gradient);
  const haloId=gradientId+'-halo',halo=h('radialGradient',{id:haloId});
  for(const [offset,opacity]of [['0%',0],['52%',0],['67%',.34],['79%',.16],['100%',0]])halo.append(h('stop',{offset,'stop-color':color,'stop-opacity':opacity}));defs.append(halo);
  const visual=h('g',{class:'core-visual'});visual.append(h('circle',{cx:c.x,cy:c.y,r:central?126:99,style:`fill:url(#${haloId})`,'aria-hidden':'true'}));visual.append(h('circle',{cx:c.x,cy:c.y,r:central?84:62,class:'core-aura'}),h('circle',{cx:c.x,cy:c.y,r:central?84:62,class:'core-circle',style:`fill:url(#${gradientId})`}),h('circle',{cx:c.x,cy:c.y,r:central?89:66,class:'core-rim'}),h('circle',{cx:c.x,cy:c.y,r:central?89:66,pathLength:100,class:'core-flow'}));
  const id=central?'business':Object.keys(atlasLayout).find(id=>atlasLayout[id]===c);const glyph=icon(id);glyph.classList.remove('node-icon');glyph.classList.add('atlas-icon');glyph.setAttribute('stroke',color);glyph.setAttribute('x',c.x-(central?19:16));glyph.setAttribute('y',c.y-(central?49:40));glyph.setAttribute('width',central?38:32);glyph.setAttribute('height',central?38:32);visual.append(glyph);
  const caption=label(visual,c.x,c.y+(central?(title.length>2?-1:10):12),title,'middle',central?'business-label':'category-label');if(central&&businessName){caption.setAttribute('style','font-size:'+Math.min(23,138/(Math.max(...title.map(line=>line.length))*.65))+'px');g.append(h('title',{},businessName));}g.append(visual);
  if(central&&href){
   g.append(h('circle',{cx:c.x,cy:c.y,r:86,fill:'transparent',class:'business-hit-target','pointer-events':'all','aria-hidden':'true'}));
   const open=()=>{window.location.hash=href;};
   g.addEventListener('click',event=>{if(event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();open();});
   g.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();open();}});
  }
  svg.append(g);
 }
 ringwork(svg,root,'#ff71a5',true);core(root,companyLabel(businessName),'#business','#ff71a5',true);
 for(const category of categories){
  const c=atlasLayout[category.id];ringwork(svg,c,c.color);core(c,c.lines,category.href||'#category/'+category.id,c.color);
  for(const angle of [70,110]){const p=ringPoint(c,angle,96);svg.append(h('circle',{cx:p.x,cy:p.y,r:6,class:'ornamental-port',style:`--tone:${c.color}`}),h('path',{d:`M${p.x-2} ${p.y}h4m-2-2v4`,class:'port-symbol'}));}
  for(const item of atlasTasks[category.id]){
   const task=categoryTasks[category.id][item.index],p=ringPoint(c,item.angle),milestone=task.id?milestones.find(m=>m.id===task.id):null,state=milestone?milestoneStatus(progress,milestone):null;
   const a=h('a',{href:milestone?'#milestone/'+task.id:task.href||'#category/'+category.id,tabindex:0,class:'atlas-milestone'+(state?.label==='Completed'?' completed':state?.done?' started':''),'aria-label':task.name+(state?' — '+state.label:task.href?'':' — category preview'),style:`--tone:${c.color}`});
   a.append(h('title',{},task.name+(milestone||task.href?'':' — Phase 2 preview')),h('circle',{cx:p.x,cy:p.y,r:11,class:'milestone-aura'}),h('circle',{cx:p.x,cy:p.y,r:11,class:'milestone-circle'}),h('circle',{cx:p.x,cy:p.y,r:4,class:'milestone-center'}));
   if(state?.label==='Completed')a.append(h('path',{d:`M${p.x-5} ${p.y}l3 3 6-6`,class:'milestone-check'}));
   label(a,p.x+item.dx,p.y+item.dy,item.lines,item.anchor);svg.append(a);
  }
 }
 section.append(svg);
 const list=html('div',undefined,'atlas-accessible-list');const businessLink=html('a',(businessName||'Your business')+' · company profile','atlas-business-entry');businessLink.href='#business';list.append(businessLink);
 for(const category of categories){const article=html('section',undefined,'panel');const title=html('a',category.name);title.href=category.href||'#category/'+category.id;const head=html('h2');head.append(title);article.append(head);const ul=html('ul');for(const task of categoryTasks[category.id]){const li=html('li'),a=html('a',task.name+(task.id||task.href?'':' · Preview'));a.href=task.id?'#milestone/'+task.id:task.href||'#category/'+category.id;li.append(a);ul.append(li);}article.append(ul);list.append(article);}section.append(list);
 const legend=html('div',undefined,'atlas-legend');for(const [cls,text]of [['','Not started'],['started','In progress'],['completed','Completed']]){const item=html('span',undefined,cls);item.append(html('i'),document.createTextNode(text));legend.append(item);}section.append(legend,html('p','Explore Formation milestones and Vibe Coding considerations. Other categories are previews. Connections show relationships, not required steps.','atlas-note'));
 return section;
}
