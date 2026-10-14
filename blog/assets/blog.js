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
  const cards = [...document.querySelectorAll('#article-list [data-search]')];
  const buttons = [...document.querySelectorAll('[data-topic]')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#no-results');
  let topic = '';
  document.querySelector('.search').hidden = false;
  document.querySelector('.topic-filters').hidden = false;
  const update = () => {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      card.hidden = (topic !== '' && card.dataset.category !== topic) || !words.every(word => card.dataset.search.includes(word));
      if (!card.hidden) visible++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.topic === topic));
    count.textContent = `${visible} ${visible === 1 ? 'article' : 'articles'}${topic ? ' in ' + topic : ''}${words.length ? ' found' : ''}`;
    empty.hidden = visible !== 0;
  };
  search.addEventListener('input', update);
  for (const button of buttons) button.addEventListener('click', () => { topic = button.dataset.topic; update(); });
  for (const link of document.querySelectorAll('[data-topic-link]')) link.addEventListener('click', () => { topic = link.dataset.topicLink; search.value = ''; update(); });
  document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; topic = ''; update(); search.focus(); });
}
