(() => {
  'use strict';
  const mark=document.querySelector('#evidence-mark');
  const source=document.querySelector('#evidence-source');
  const cards=[...document.querySelectorAll('[data-evidence]')];
  const reset=document.querySelector('#evidence-reset');
  const requested=new URLSearchParams(location.search).get('mark');
  if ([...mark.options].some(option=>option.value===requested)) mark.value=requested;
  function filter(){
    let count=0;
    cards.forEach(card=>{ card.hidden=!((mark.value==='all'||card.dataset.mark===mark.value)&&(source.value==='all'||card.dataset.source===source.value)); if(!card.hidden)count++; });
    document.querySelector('#evidence-count').textContent=`Showing ${count} ${count===1?'record':'records'}${count!==4?' of 4':''}`;
    document.querySelector('#history-empty').hidden=count!==0;
    reset.hidden=mark.value==='all'&&source.value==='all';
  }
  function clear(){mark.value='all';source.value='all';filter();mark.focus();}
  [mark,source].forEach(input=>input.addEventListener('change',filter));
  [reset,document.querySelector('#empty-reset')].forEach(button=>button.addEventListener('click',clear));
  const dialog=document.querySelector('#detail-dialog');
  const data={website:['Website capture','COTIVATE®','cotivate','Website'],app:['App listing capture','COTIVATE®','cotivate','App Store'],product:['Product page capture','COACHIVATE™','coachivate','Product page'],logo:['Logo use capture','COTIVATE Logo','logo','Website']};
  document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.preview;
    const [title,name,markKey,sourceName]=data[key];
    document.querySelector('#detail-title').textContent=`${name}: ${title}`;
    document.querySelector('#detail-body').textContent='An illustrative record of trademark use. The artwork below is a layout placeholder, not evidence captured from a website. No actual source file is attached.';
    const extra=document.querySelector('#detail-extra');extra.replaceChildren();
    const original=document.querySelector(`[data-evidence="${key}"] .evidence-visual`);
    const artwork=document.createElement('div');artwork.className=`evidence-visual preview-art visual-${key}`;artwork.setAttribute('aria-hidden','true');
    [...original.children].forEach(child=>artwork.append(child.cloneNode(true)));extra.append(artwork);
    const list=document.createElement('ul');
    [`Trademark: ${name}`,'Sample capture date: September 30, 2026',`Source type: ${sourceName}`,'Source URL and original file: not supplied','Filing suitability: not assessed in this preview'].forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});
    const link=document.createElement('a');link.href=`trademark.html?mark=${markKey}`;link.className='text-link';link.textContent='View trademark record →';extra.append(list,link);dialog.showModal();
  }));
  document.querySelector('#add-evidence').addEventListener('click',()=>{
    document.querySelector('#detail-title').textContent='Add evidence of use';
    document.querySelector('#detail-body').textContent='A future upload could associate a dated website image, product page, or other brand material with a trademark. Uploads are not enabled in this preview; no files will be selected, stored, or sent.';
    document.querySelector('#detail-extra').replaceChildren();dialog.showModal();
  });
  filter();
})();
