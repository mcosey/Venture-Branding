export class Node {
 constructor(tag,text=''){this.tag=tag;this.attrs={};this.children=[];this.textContent=text;this.classList={add:(name)=>this.attrs.class=((this.attrs.class||'')+' '+name).trim(),remove:(name)=>this.attrs.class=(this.attrs.class||'').split(' ').filter(x=>x!==name).join(' ')};}
 addEventListener(name,fn){this.events??={};this.events[name]=fn;}
 setAttribute(k,v){this.attrs[k]=String(v);}append(...items){this.children.push(...items);}set className(v){this.attrs.class=v;}
}
export const mockDocument={createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),createTextNode:text=>new Node('#text',text)};
export function flatten(node){return [node,...node.children.flatMap(flatten)];}
