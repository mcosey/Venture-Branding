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
  const cards = [...document.querySelectorAll('[data-search]')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#no-results');
  document.querySelector('.search').hidden = false;
  const update = () => {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      card.hidden = !words.every(word => card.dataset.search.includes(word));
      if (!card.hidden) visible++;
    }
    count.textContent = `${visible} ${visible === 1 ? 'article' : 'articles'}${words.length ? ' found' : ''}`;
    empty.hidden = visible !== 0;
  };
  search.addEventListener('input', update);
  document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; update(); search.focus(); });
}
