const menu = document.querySelector('.menu');
const navigation = document.querySelector('.navigation');
if (menu && navigation) {
  const close = () => { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
  menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(navigation.classList.toggle('open'))));
  navigation.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('open')) { close(); menu.focus(); }
  });
}
const search = document.querySelector('#blog-search');
if (search) {
  const normalizeSearch = text => text.toLocaleLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  const cards = [...document.querySelectorAll('#article-list [data-search]')]
    .map(card => ({card, searchable:normalizeSearch(card.dataset.search)}));
  const buttons = [...document.querySelectorAll('[data-topic]')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#no-results');
  const title = document.querySelector('#articles-title');
  const pagination = document.querySelector('.article-pagination');
  const pageNumbers = document.querySelector('.article-pagination__pages');
  const previous = document.querySelector('#previous-articles');
  const next = document.querySelector('#next-articles');
  const pageSize = 9;
  let topic = '';
  let page = 1;
  document.querySelector('.search').hidden = false;
  document.querySelector('.topic-filters').hidden = false;

  const turnPage = requestedPage => {
    update(requestedPage);
    title.focus({preventScroll:true});
    title.scrollIntoView({block:'start'});
  };

  function pageButton(number) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(number);
    button.setAttribute('aria-label', `Page ${number}`);
    if (number === page) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => { if (number !== page) turnPage(number); });
    return button;
  }

  function update(requestedPage = 1) {
    const words = normalizeSearch(search.value).trim().split(/\s+/).filter(Boolean);
    const matches = cards.filter(({card, searchable}) =>
      (!topic || card.dataset.category === topic) && words.every(word => searchable.includes(word)));
    const total = matches.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(Math.max(1, requestedPage), pageCount);
    const start = (page - 1) * pageSize;
    const visible = new Set(matches.slice(start, start + pageSize));
    for (const entry of cards) entry.card.hidden = !visible.has(entry);
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.topic === topic));
    count.textContent = `${total} ${total === 1 ? 'article' : 'articles'}${topic ? ' in ' + topic : ''}${words.length ? ' found' : ''}`;
    empty.hidden = total !== 0;

    pagination.hidden = pageCount === 1;
    previous.disabled = page === 1;
    next.disabled = page === pageCount;
    pageNumbers.replaceChildren();
    if (pagination.hidden) return;

    const pages = [...new Set([1, page - 1, page, page + 1, pageCount])]
      .filter(number => number >= 1 && number <= pageCount);
    let lastNumber = 0;
    for (const number of pages) {
      const skipped = number - lastNumber - 1;
      if (skipped === 1) {
        pageNumbers.append(pageButton(number - 1));
      } else if (skipped > 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '…';
        ellipsis.setAttribute('aria-hidden', 'true');
        pageNumbers.append(ellipsis);
      }
      pageNumbers.append(pageButton(number));
      lastNumber = number;
    }
  }
  previous.addEventListener('click', () => turnPage(page - 1));
  next.addEventListener('click', () => turnPage(page + 1));
  search.addEventListener('input', () => update());
  for (const button of buttons) button.addEventListener('click', () => { topic = button.dataset.topic; update(); });
  for (const link of document.querySelectorAll('[data-topic-link]')) link.addEventListener('click', () => { topic = link.dataset.topicLink; search.value = ''; update(); });
  document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; topic = ''; update(); search.focus(); });
  update();
}
