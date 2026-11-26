import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(dataset={}) {
  return {
    dataset,hidden:false,value:'',events:{},attributes:{},children:[],
    addEventListener(name,fn){this.events[name]=fn;},
    setAttribute(name,value){this.attributes[name]=value;},
    replaceChildren(){this.children=[];},
    append(child){this.children.push(child);},
    focus(){this.focused=true;},
    scrollIntoView(){this.scrolled=true;}
  };
}
function browse(cards, buttons, links = []) {
  const search=element(), count=element(), empty=element(), reset=element();
  const title=element(), pager=element(), pageNumbers=element(), prev=element(), next=element();
  const selectors={
    '#blog-search':search,'#result-count':count,'#no-results':empty,'#clear-search':reset,
    '.search':element(),'.topic-filters':element(),'#articles-title':title,
    '.article-pagination':pager,'.article-pagination__pages':pageNumbers,'#previous-articles':prev,'#next-articles':next
  };
  vm.runInNewContext(fs.readFileSync(new URL('../blog/assets/blog.js',import.meta.url),'utf8'), {document:{
    querySelector:s=>selectors[s]||null,
    querySelectorAll:s=>s.startsWith('#article-list')?cards:s==='[data-topic]'?buttons:links,
    createElement:()=>element()
  }});
  return {search,count,empty,reset,title,pager,pageNumbers,prev,next};
}
test('topic and search combine; empty results reset both; hero topic links select the topic', () => {
  const cards=[element({category:'Trademarks',search:'trademark business name'}),element({category:'Advanced Venture Law',search:'business financing'}),element({category:'For Founders',search:'founders’ agreements'})];
  const buttons=['','Trademarks','Advanced Venture Law','For Founders'].map(topic=>element({topic}));
  const hero=element({topicLink:'For Founders'});
  const {search,count,empty,reset} = browse(cards, buttons, [hero]);
  buttons[1].events.click();
  assert.deepEqual(cards.map(c=>c.hidden),[false,true,true]);
  assert.equal(buttons[1].attributes['aria-pressed'],'true');
  search.value='financing'; search.events.input();
  assert.equal(empty.hidden,false);
  assert.match(count.textContent,/0 articles/);
  reset.events.click();
  assert.deepEqual(cards.map(c=>c.hidden),[false,false,false]);
  assert.equal(buttons[0].attributes['aria-pressed'],'true');
  assert.equal(search.value,''); assert.equal(search.focused,true);
  hero.events.click();
  assert.deepEqual(cards.map(c=>c.hidden),[true,true,false]);
  search.value="  FOUNDERS' AGREEMENTS ";
  search.events.input();
  assert.equal(cards[2].hidden,false);
});

test('the library paginates filtered and unfiltered results nine at a time', () => {
  const cards = Array.from({length:60}, (_, index) => element({
    index, category:index < 17 ? 'Trademarks' : 'For Founders', search:index % 2 === 0 ? 'filing guide' : 'search guide'
  }));
  const topics = ['', 'Trademarks', 'For Founders'].map(topic => element({topic}));
  const {search,count,title,pager,pageNumbers,prev,next} = browse(cards, topics);
  const visible = () => cards.filter(card => !card.hidden).map(card => card.dataset.index);

  assert.deepEqual(visible(),[0,1,2,3,4,5,6,7,8]);
  assert.deepEqual(pageNumbers.children.map(button => button.textContent),['1','2','…','7']);
  assert.equal(prev.disabled,true);
  assert.equal(pager.hidden,false);
  next.events.click();
  assert.deepEqual(visible(),[9,10,11,12,13,14,15,16,17]);
  assert.equal(pageNumbers.children[1].attributes['aria-current'],'page');
  assert.equal(title.focused,true);
  assert.equal(title.scrolled,true);

  pageNumbers.children.at(-1).events.click();
  assert.deepEqual(visible(),[54,55,56,57,58,59]);
  assert.match(count.textContent,/Showing 55–60/);
  assert.equal(next.disabled,true);
  prev.events.click();
  assert.equal(visible()[0],45);

  topics[1].events.click();
  assert.deepEqual(visible(),[0,1,2,3,4,5,6,7,8]);
  next.events.click();
  assert.deepEqual(visible(),[9,10,11,12,13,14,15,16]);
  search.value = 'filing';
  search.events.input();
  assert.deepEqual(visible(),[0,2,4,6,8,10,12,14,16]);
  assert.equal(pager.hidden,true);
});
