(() => {
  'use strict';
  const previews = {
    finding: ['Review a watch finding', 'COTIVATE · Sample filing A. This is an illustrative potential match, not an infringement conclusion.', ['Inspect finding and source details.', 'Record the attorney’s assessment and next step.', 'Prepare a client update for approval when appropriate.', 'Phase 1: no decision is saved or sent.']],
    brand: ['Review a newly detected brand', 'CIRCLES was identified in the sample monitoring results. It is not yet filed.', ['Decide whether to discuss the name with the client.', 'Approve a new trademark record and scope before enabling services.', 'No filing, clearance result, or engagement is created.']],
    milestone: ['COACHIVATE · Sample milestone', 'March 12, 2027 is an illustrative response date, not a verified filing deadline.', ['Clio matter and calendar: not connected.', 'Microsoft 365 calendar: not connected.', 'Actual correspondence and deadline verification belong in a later workflow.']],
    'new-client': ['New client · Workflow preview', 'Client setup is planned for Phase 2. This button does not create an account or send an invitation.', ['Associate the client with their Clio matter.', 'Confirm the portal add-on and permitted services.', 'Approve an invitation in the future secure system.', 'Create and verify trademark records.']],
    client: ['Cotivate · Sample workspace', 'Jordan Smith is the sample contact. This workspace illustrates four trademark assets.', ['COTIVATE® · Registered', 'COACHIVATE™ · Pending', 'COTIVATE Logo · Pending', 'CIRCLES · Not yet filed', 'Clio matter: not linked. Portal access: not provisioned.']],
    automation: ['Automation oversight', 'Attorney-approved service setup is distinct from client preferences. No automation is running.', ['Trademark Watch', 'Brand Change Monitor', 'Specimen Capture', 'Maintenance Reminder', 'Trademark Activity Digest', 'Client notification preferences must not cancel internal deadline tracking.']],
    clio: ['Clio · Connection planned', 'Clio remains responsible for matters, legal billing, payments, and internal legal operations.', ['No account connection or synchronization.', 'Confirm supported access and permitted data transfers later.', 'DMS overlap with iManage remains unresolved.']],
    microsoft: ['Microsoft 365 · Connection planned', 'Outlook and Microsoft 365 remain responsible for email, calendars, and Office documents.', ['No inbox access, calendar events, or email sending.', 'Agree which information should appear here before connecting.', 'Permissions and integration capabilities still need verification.']],
    quickbooks: ['QuickBooks · Connection planned', 'QuickBooks remains responsible for accounting, books, reconciliation, and tax records.', ['No duplicate ledger is being built.', 'No financial records are read or changed.', 'Define useful summaries and their source before connecting.']],
    calendly: ['Calendly · Connection planned', 'Calendly remains the scheduling tool.', ['No booking link or account is configured.', 'Decide whether booking links or appointment summaries are useful here.', 'Available integration features need confirmation.']],
    imanage: ['iManage · Document-system decision', 'The earlier plan keeps iManage for documents. Clio was also listed for DMS, so that overlap still needs your decision.', ['No document library or file sync is being built.', 'A future matter reference may link to the chosen document system.', 'No access to client documents has been requested.']]
  };
  const dialog=document.querySelector('#staff-dialog');
  document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{
    const [title,body,items]=previews[button.dataset.preview];
    document.querySelector('#staff-dialog-title').textContent=title;
    document.querySelector('#staff-dialog-body').textContent=body;
    const list=document.querySelector('#staff-dialog-items');list.replaceChildren();
    items.forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});dialog.showModal();
  }));
  ['staff-close','staff-done'].forEach(id=>document.getElementById(id).addEventListener('click',()=>dialog.close()));
  const menu=document.querySelector('.menu-toggle');const nav=document.querySelector('#attorney-nav');
  function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}
  menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.querySelectorAll('a').forEach(item=>item.removeAttribute('aria-current'));link.setAttribute('aria-current','location');closeMenu();}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
})();
