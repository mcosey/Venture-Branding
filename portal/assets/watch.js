(() => {
  'use strict';
  const mark = document.querySelector('#watch-mark');
  const status = document.querySelector('#watch-status');
  const rows = [...document.querySelectorAll('[data-finding]')];
  const reset = document.querySelector('#watch-reset');
  function filter() {
    let count = 0;
    rows.forEach(row => { row.hidden = !((mark.value === 'all' || row.dataset.mark === mark.value) && (status.value === 'all' || row.dataset.status === status.value)); if (!row.hidden) count++; });
    document.querySelector('#watch-count').textContent = `Showing ${count} ${count === 1 ? 'finding' : 'findings'}${count !== rows.length ? ' of 3' : ''}`;
    document.querySelector('#watch-empty').hidden = count !== 0;
    reset.hidden = mark.value === 'all' && status.value === 'all';
  }
  [mark,status].forEach(input => input.addEventListener('change',filter));
  reset.addEventListener('click',() => { mark.value='all'; status.value='all'; filter(); mark.focus(); });
  const findings = {
    a: {name:'Sample filing A', mark:'COTIVATE', key:'cotivate', status:'Under VB review', note:'This sample finding has been selected for attorney review. No conclusion or client action is shown.'},
    b: {name:'Sample filing B', mark:'COTIVATE', key:'cotivate', status:'Monitoring', note:'This sample finding remains on the monitoring list. No legal assessment or recommendation is shown.'},
    c: {name:'Sample filing C', mark:'COACHIVATE', key:'coachivate', status:'Monitoring', note:'This sample finding is associated with COACHIVATE. No legal assessment or recommendation is shown.'}
  };
  document.querySelectorAll('[data-finding-detail]').forEach(button=>button.addEventListener('click',()=>{
    const finding=findings[button.dataset.findingDetail];
    document.querySelector('#detail-title').textContent=finding.name;
    document.querySelector('#detail-body').textContent=finding.note+' This is an illustrative result, not an actual trademark filing or a finding of infringement.';
    const extra=document.querySelector('#detail-extra'); extra.replaceChildren();
    const list=document.createElement('ul');
    [`Watched mark: ${finding.mark}`,`Status: ${finding.status}`,'Detected: October 2, 2026 (sample)','Filing number, owner, and goods/services: not supplied','Client action: none shown'].forEach(text=>{const item=document.createElement('li');item.textContent=text;list.append(item);});
    const link=document.createElement('a');link.href=`trademark.html?mark=${finding.key}`;link.className='text-link';link.textContent=`View ${finding.mark} record →`;extra.append(list,link);
    document.querySelector('#detail-dialog').showModal();
  }));
})();
