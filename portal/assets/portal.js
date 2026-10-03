(() => {
  'use strict';
  const details = {
    attention: ['Nothing needed from you', 'In this sample portfolio, there are no urgent client tasks. Venture Branding is reviewing one potential match and preparing for the next application milestone.'],
    watch: ['Trademark Watch', 'Sample scan completed October 2, 2026. Three potentially similar marks were flagged, with one selected for Venture Branding review. A potential match is not a finding of infringement.', ['Watching COTIVATE and COACHIVATE', 'Cadence: weekly', 'Review status: under VB review', 'Monitoring and reporting only; no enforcement or litigation.']],
    brand: ['A new chapter for CIRCLES', 'The sample Brand Change Monitor identified “CIRCLES” as a new branded term on a product page. It has not been filed as a trademark in this example.', ['Last review: September 28, 2026', 'Source: sample company website', 'Next step: discuss whether a trademark review is appropriate.']],
    history: ['Your brand’s use history', 'This preview illustrates how evidence of trademark use could be organized over time. No websites are being captured and no files have been uploaded.', ['COTIVATE · Website capture · September 30, 2026', 'COTIVATE · App listing · September 30, 2026', 'COACHIVATE · Product page · September 30, 2026', 'COTIVATE Logo · Website capture · September 30, 2026']],
    maintenance: ['Maintenance Reminder', 'The sample portfolio shows a maintenance review beginning in March 2031, with four use records available for review. Dates and evidence are illustrative, not calculated filing requirements.'],
    date: ['Next key date', 'March 12, 2027 is a sample Office Action response date. In a working portal, this would be verified by Venture Branding and linked to the corresponding application.', ['Sample matter: COACHIVATE', 'Client action: none currently shown', 'Status: response preparation']],
    automations: ['Background services, at a glance', 'The four dashboard cards illustrate the services in your portal vision. Each card opens a sample overview. Configuration and live services are reserved for a later phase.', ['Trademark Watch · Weekly', 'Brand Change Monitor · Monthly', 'Specimen Capture · Quarterly', 'Maintenance Reminder · Milestone-based']],
    'add-mark': ['Add a new mark', 'This is a preview of where you could ask Venture Branding to add a brand name or logo to your portfolio. No mark will be added and no information will be submitted in this prototype.'],
    'request-review': ['Request a brand review', 'A future review request would help Venture Branding understand your new brand and discuss appropriate next steps. Requests are not connected in this preview.'],
    cotivate: ['COTIVATE®', 'A sample registered word mark for Cotivate. Trademark Watch and Specimen Capture are shown as active in this concept.', ['Status: registered (sample)', 'Last watch scan: October 2, 2026', 'Maintenance review: March 2031']],
    coachivate: ['COACHIVATE™', 'A sample pending word-mark application. The next milestone shown is an Office Action response.', ['Status: pending (sample)', 'Next sample date: March 12, 2027', 'Client action: none shown']],
    logo: ['COTIVATE Logo', 'A sample pending logo application. The artwork displayed here is a placeholder for this design preview.', ['Status: pending (sample)', 'Recent activity: use evidence captured']],
    circles: ['CIRCLES', 'A sample newly detected brand name, not yet filed. Venture Branding could discuss appropriate next steps with the client.'],
    activity: ['Recent portfolio activity', 'An example of the updates a client could see without needing to follow every procedural detail.', ['Oct. 2, 2026 · Watch scan completed; three potential matches', 'Oct. 2, 2026 · One match sent for review', 'Sept. 30, 2026 · Four use records added', 'Sept. 28, 2026 · CIRCLES identified']],
    rights: ['Rights', 'A future place to see ownership, assignments, and licenses connected to each mark. This section is not built in the dashboard preview.'],
    documents: ['Documents', 'A future place for application records, USPTO correspondence, registration certificates, and other matter documents. No client documents are stored in this preview.'],
    messages: ['Messages', 'Two illustrative updates show how Venture Branding could keep a client informed. Messaging is not connected.', ['Venture Branding · We are reviewing a potential watch match. No action is needed from you at this time.', 'Venture Branding · Your latest use records have been added to the sample portfolio.']],
    profile: ['Jordan Smith · Sample account', 'Jordan and the portfolio information are demonstration content. There is no signed-in account. Use “Back to website” below to return to the V8 homepage.']
  };
  const dialog = document.querySelector('#detail-dialog');
  document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.detail;
    const [title, body, items] = details[key];
    document.querySelector('#detail-title').textContent = title;
    document.querySelector('#detail-body').textContent = body;
    const extra = document.querySelector('#detail-extra');
    extra.replaceChildren();
    if (items) {
      const ul = document.createElement('ul');
      items.forEach(text => { const li = document.createElement('li'); li.textContent = text; ul.append(li); });
      extra.append(ul);
    }
    if (key === 'profile') {
      const link = document.createElement('a'); link.href = 'v8.html'; link.textContent = '← Back to website'; link.className = 'text-link'; extra.append(link);
    }
    dialog.showModal();
  }));
  document.querySelectorAll('.close-dialog,.done-button').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#portal-nav');
  function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  nav.querySelectorAll('a,button').forEach(item => item.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if(event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });
  const search = document.querySelector('#portal-search');
  if (!search) return; // Portfolio page has its own search and filters.
  const rows = [...document.querySelectorAll('[data-search]')];
  const result = document.querySelector('#search-result');
  const clear = document.querySelector('#clear-search');
  function filter() {
    const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    rows.forEach(row => { row.hidden = !words.every(word => row.dataset.search.includes(word)); if (!row.hidden) count++; });
    result.hidden = words.length === 0;
    clear.hidden = result.hidden;
    result.textContent = count ? `${count} sample ${count === 1 ? 'mark' : 'marks'} found.` : 'No sample marks found. Try “Cotivate” or “pending”.';
  }
  search.addEventListener('input', filter);
  search.addEventListener('keydown', event => { if (event.key === 'Enter') { document.querySelector('#portfolio').scrollIntoView({block:'center'}); } });
  clear.addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); } });
})();
