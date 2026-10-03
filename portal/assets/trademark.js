(() => {
  'use strict';
  // Fictional records for the frontend prototype; no live USPTO or client data.
  const records = {
    cotivate: {
      name: 'COTIVATE®', art: 'COTIVATE', type: 'Word mark', status: 'Registered', color: 'green',
      summary: 'Your registered brand, with its records and ongoing reviews in one place.',
      numberLabel: 'Registration number', number: '7,123,456', filed: 'Mar 3, 2022',
      nextTitle: 'No urgent action needed', nextBody: 'Nothing is due from you in this sample record. Your next maintenance review is shown below.',
      dateLabel: 'Next maintenance review', date: 'March 2031', dateNote: 'Planning date only; not a verified filing deadline.',
      reviewTitle: '1 potential match under review', reviewBody: 'Venture Branding is reviewing a potentially similar mark. No action is currently shown for you.',
      reviewDetail: 'The sample October 2 scan flagged a potentially similar mark for review. This is not a finding of infringement. Monitoring here is limited to review and reporting, with no enforcement or litigation.',
      history: [['Website capture', 'Sept 30, 2026', 'Example website evidence for COTIVATE.'], ['App listing capture', 'Sept 30, 2026', 'Example app listing evidence for COTIVATE.']],
      documents: [['Registration certificate', 'Sample document'], ['Trademark application', 'Filed Mar 3, 2022']],
      activity: [['Oct 2, 2026', 'Watch finding sent for review'], ['Sept 30, 2026', 'Two use records added']],
      maintenance: 'Review begins March 2031', watch: '1 match under VB review'
    },
    coachivate: {
      name: 'COACHIVATE™', art: 'COACHIVATE', type: 'Word mark', status: 'Pending', color: 'blue',
      summary: 'Your application is in progress. Follow the next milestone and keep the supporting records close.',
      numberLabel: 'Serial number', number: '98,765,432', filed: 'Jan 15, 2024',
      nextTitle: 'Response preparation', nextBody: 'An Office Action response is the next milestone in this sample application. No client task is currently shown.',
      dateLabel: 'Sample response date', date: 'Mar 12, 2027', dateNote: 'Illustrative only; not a verified USPTO deadline.',
      reviewTitle: 'Application correspondence', reviewBody: 'The sample matter is at the response-preparation stage. No watch finding is assigned to this record.',
      reviewDetail: 'This example illustrates an application with an Office Action response being prepared. The actual correspondence, issues, and scope would need attorney review. No documents or filings are being submitted.',
      history: [['Product page capture', 'Sept 30, 2026', 'Example product-page evidence for COACHIVATE.']],
      documents: [['Trademark application', 'Filed Jan 15, 2024'], ['Office Action', 'Sample correspondence']],
      activity: [['Oct 2, 2026', 'Response milestone shown in the portal'], ['Sept 30, 2026', 'Product page use record added']],
      maintenance: 'No registration-based date shown', watch: 'Last sample scan: Oct 2, 2026'
    },
    logo: {
      name: 'COTIVATE Logo', art: 'C', type: 'Design mark', status: 'Pending', color: 'blue',
      summary: 'A dedicated record for your logo application, separate from your word mark.',
      numberLabel: 'Serial number', number: '98,765,433', filed: 'Jan 15, 2024',
      nextTitle: 'Awaiting an application update', nextBody: 'No client action is shown. A confirmed next milestone would appear here when available.',
      dateLabel: 'Next key date', date: 'Not yet shown', dateNote: 'No filing deadline has been supplied for this sample.',
      reviewTitle: 'No review item shown', reviewBody: 'This sample record has no open review item. Its status is separate from the COTIVATE word mark.',
      reviewDetail: 'No specific watch finding or correspondence review is assigned to this sample logo application. This is not a legal assessment of the mark.',
      history: [['Logo use capture', 'Sept 30, 2026', 'Example website evidence showing use of the logo. The “C” artwork is a design placeholder.']],
      documents: [['Trademark application', 'Filed Jan 15, 2024'], ['Logo artwork', 'Placeholder artwork']],
      activity: [['Sept 30, 2026', 'Logo use record added']],
      maintenance: 'No registration-based date shown', watch: 'No sample finding assigned'
    },
    circles: {
      name: 'CIRCLES', art: 'CIRCLES', type: 'Word mark', status: 'Not yet filed', color: 'amber',
      summary: 'A newly detected name with room to grow. This record is a starting point for a conversation about your brand.',
      numberLabel: 'Serial / registration number', number: 'Not assigned', filed: 'Not yet filed',
      nextTitle: 'Discuss your new brand', nextBody: 'CIRCLES was identified as a new branded term. Venture Branding could discuss whether a trademark review makes sense.',
      dateLabel: 'Detected in sample', date: 'Sept 28, 2026', dateNote: 'Discovery date; no application or deadline shown.',
      reviewTitle: 'New branded term detected', reviewBody: 'Brand Change Monitor identified CIRCLES on a sample product page. No clearance review has been completed.',
      reviewDetail: 'A newly detected term is not an availability or protection determination. A conversation with Venture Branding would be the next step before deciding whether to pursue an application.',
      history: [], documents: [], activity: [['Sept 28, 2026', 'CIRCLES added as a newly detected brand name']],
      maintenance: 'Not active · No registration shown', watch: 'No sample finding assigned'
    }
  };
  const key = new URLSearchParams(location.search).get('mark');
  if (!Object.hasOwn(records, key)) {
    document.querySelector('#missing-mark').hidden = false;
    document.title = 'Mark not found — Venture Branding';
    return;
  }
  const record = records[key];
  document.querySelector("#mark-history-link").href = `use-history.html?mark=${key}`;
  const set = (id, text) => { document.getElementById(id).textContent = text; };
  document.title = `${record.name} — Venture Branding`;
  set('mark-title', record.name); set('record-art', record.art); set('mark-type', record.type);
  set('mark-owner', 'Cotivate · Sample client');
  if (key === 'logo') document.querySelector('#record-art').classList.add('is-logo');
  set('mark-status', record.status);
  document.querySelector('#mark-status').classList.add(record.color);
  set('mark-summary', record.summary);
  const facts = [['Mark type', record.type], [record.numberLabel, record.number], ['Filed', record.filed], ['Owner', 'Not supplied in sample'], ['Jurisdiction', 'United States · Sample'], ['Record status', record.status]];
  const factsList = document.querySelector('#mark-facts');
  facts.forEach(([label, value]) => { const div = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; div.append(dt, dd); factsList.append(div); });
  set('mark-goods', 'The goods, services, and classes have not been supplied for this sample record.');
  for (const [id, value] of [['next-title',record.nextTitle],['next-body',record.nextBody],['date-label',record.dateLabel],['date-value',record.date],['date-note',record.dateNote],['review-title',record.reviewTitle],['review-body',record.reviewBody]]) set(id,value);
  const dialog = document.querySelector('#detail-dialog');
  function show(title, body, items = []) {
    set('detail-title', title); set('detail-body', body);
    const extra = document.querySelector('#detail-extra'); extra.replaceChildren();
    if (items.length) { const ul = document.createElement('ul'); items.forEach(text => { const li = document.createElement('li'); li.textContent = text; ul.append(li); }); extra.append(ul); }
    dialog.showModal();
  }
  document.querySelectorAll('[data-record-detail]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.recordDetail === 'message') show(`Message about ${record.name}`, 'This is where a future message could be connected to this trademark. Messaging is not enabled and nothing will be sent.');
    if (button.dataset.recordDetail === 'next') show(`${record.name}: next step`, record.nextBody, [record.dateLabel + ': ' + record.date, record.dateNote]);
    if (button.dataset.recordDetail === 'review') show(`${record.name}: review status`, record.reviewDetail);
  }));
  const services = [
    ['Trademark Watch', true, record.watch, 'Weekly'],
    ['Brand Change Monitor', true, key === 'circles' ? 'Detected Sept 28, 2026' : 'Watching approved brand sources', 'Monthly'],
    ['Specimen Capture', key !== 'circles', record.history.length ? `${record.history.length} sample use ${record.history.length === 1 ? 'record' : 'records'}` : 'No use records captured', 'Quarterly'],
    ['Maintenance Reminder', key !== 'circles', record.maintenance, 'Milestone-based']
  ];
  services.forEach(([name, active, detail, cadence]) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'panel record-service';
    const status = document.createElement('span'); status.className = 'service-status ' + (active ? 'on' : 'off'); status.textContent = active ? '● Active · Sample' : '○ Not active';
    const title = document.createElement('h3'); title.textContent = name;
    const p = document.createElement('p'); p.textContent = detail;
    const tail = document.createElement('span'); tail.className = 'service-tail'; tail.textContent = 'View details →';
    button.append(status,title,p,tail);
    button.addEventListener('click', () => show(`${name} · ${record.name}`, detail, [active ? `Sample cadence: ${cadence}` : 'This service is not active for this sample mark.', 'No service is running or being configured.']));
    document.querySelector('#mark-services').append(button);
  });
  function renderEntries(target, entries, empty, evidence) {
    const parent = document.getElementById(target);
    if (!entries.length) { const p = document.createElement('p'); p.className = 'record-empty'; p.textContent = empty; parent.append(p); return; }
    entries.forEach(([title,date,description]) => {
      const button = document.createElement('button'); button.type='button'; button.className='record-entry';
      const symbol=document.createElement('span'); symbol.className='entry-symbol'; symbol.setAttribute('aria-hidden','true'); symbol.textContent=evidence?'◈':'▤';
      const label=document.createElement('span'); const strong=document.createElement('strong'); strong.textContent=title; const small=document.createElement('small'); small.textContent=date; label.append(strong,small);
      const arrow=document.createElement('span'); arrow.textContent='→'; arrow.setAttribute('aria-hidden','true'); button.append(symbol,label,arrow);
      button.addEventListener('click',()=>show(`${record.name}: ${title}`, description || 'This entry illustrates where a matter document would appear. No actual document is attached or available to download.', [date, evidence ? 'No actual screenshot or evidence file is stored in this prototype.' : 'Document preview only.']));
      parent.append(button);
    });
  }
  renderEntries('use-records',record.history,'No use records yet. Specimen Capture is not active for this sample mark.',true);
  renderEntries('document-records',record.documents,'No application documents yet. This sample mark has not been filed.',false);
  record.activity.forEach(([date,text]) => {const li=document.createElement('li'); const time=document.createElement('span'); time.textContent=date; const p=document.createElement('p'); p.textContent=text; li.append(time,p); document.querySelector('#record-activity').append(li); });
  document.querySelector('#record').hidden=false;
})();
