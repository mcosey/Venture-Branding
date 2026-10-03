(() => {
  'use strict';
  const search = document.querySelector('#portfolio-search');
  const status = document.querySelector('#status-filter');
  const type = document.querySelector('#type-filter');
  const sort = document.querySelector('#sort-order');
  const tbody = document.querySelector('.portfolio-table tbody');
  const rows = [...tbody.querySelectorAll('[data-mark]')];
  const count = document.querySelector('#portfolio-count');
  const reset = document.querySelector('#reset-filters');
  function update() {
    const query = search.value.trim().toLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    let visible = 0;
    rows.forEach(row => {
      const data = row.dataset;
      const matchesSearch = words.every(word => data.search.includes(word) || data.search.replace(/[,\s]/g, '').includes(word.replace(/,/g, '')));
      row.hidden = !(matchesSearch && (status.value === 'all' || status.value === data.status) && (type.value === 'all' || type.value === data.type));
      if (!row.hidden) visible++;
    });
    const sorted = [...rows].sort((a,b) => sort.value === 'name'
      ? a.dataset.name.localeCompare(b.dataset.name)
      : (sort.value === 'oldest' ? 1 : -1) * a.dataset.updated.localeCompare(b.dataset.updated));
    sorted.forEach(row => tbody.append(row));
    count.textContent = `Showing ${visible} ${visible === 1 ? 'mark' : 'marks'}${visible !== rows.length ? ` of ${rows.length}` : ''}`;
    document.querySelector('#portfolio-empty').hidden = visible !== 0;
    document.querySelector('.page-count').textContent = visible ? 'Page 1 of 1' : 'No results';
    reset.hidden = !query && status.value === 'all' && type.value === 'all' && sort.value === 'updated';
  }
  search.addEventListener('input', update);
  [status,type,sort].forEach(control => control.addEventListener('change', update));
  reset.addEventListener('click', () => { search.value=''; status.value='all'; type.value='all'; sort.value='updated'; update(); search.focus(); });
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); } });
  update();
})();
