// Decorative spacing only; preserves existing controls, labels and event handlers.
const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./control-spacing.css?v=20261010',import.meta.url).href;document.head.append(sheet);
function spaceArrows(control){
 const style=getComputedStyle(control);
 for(const node of [...control.childNodes]){
  if(node.nodeType!==Node.TEXT_NODE)continue;
  const text=node.textContent;
  const end=text.match(/^(.*\S)\s*([→↗↘›▾⌄])\s*$/u);
  const start=text.match(/^\s*([←↖‹])\s*(\S.*)$/u);
  if(!end&&!start)continue;
  const arrow=document.createElement('span');arrow.className='vb-control-arrow '+(end?'vb-control-arrow-end':'vb-control-arrow-start');arrow.textContent=end?end[2]:start[1];
  const padding=parseFloat(end?style.paddingInlineEnd:style.paddingInlineStart);
  arrow.style.setProperty('--vb-control-arrow-gap',(padding>0?padding:12)+'px');
  if(end)node.replaceWith(document.createTextNode(end[1].trimEnd()),arrow);
  else node.replaceWith(arrow,document.createTextNode(start[2].trimStart()));
 }
}
function scan(root){if(root.nodeType!==Node.ELEMENT_NODE)return;if(root.matches('button,a'))spaceArrows(root);root.querySelectorAll('button,a').forEach(spaceArrows);}
scan(document.body);
new MutationObserver(records=>{const targets=new Set();for(const record of records){if(record.type==='characterData'){const control=record.target.parentElement?.closest('button,a');if(control)targets.add(control);}else{const control=record.target.closest?.('button,a');if(control)targets.add(control);for(const node of record.addedNodes)if(node.nodeType===Node.ELEMENT_NODE)scan(node);}}targets.forEach(spaceArrows);}).observe(document.body,{childList:true,subtree:true,characterData:true});
