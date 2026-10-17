import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(dataset={}) {
  return {dataset,hidden:false,value:'',events:{},attributes:{},addEventListener(name,fn){this.events[name]=fn;},setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;}};
}
test('topic and search combine; empty results reset both; hero topic links select the topic', () => {
  const search=element(), count=element(), empty=element(), reset=element();
  const cards=[element({category:'Trademarks',search:'trademark business name'}),element({category:'Venture Law',search:'business financing'}),element({category:'Founders',search:'founders agreements'})];
  const buttons=['','Trademarks','Venture Law','Founders'].map(topic=>element({topic}));
  const hero=element({topicLink:'Founders'});
  const selectors={'#blog-search':search,'#result-count':count,'#no-results':empty,'#clear-search':reset,'.search':element(),'.topic-filters':element()};
  vm.runInNewContext(fs.readFileSync(new URL('../blog/assets/blog.js',import.meta.url),'utf8'), {document:{querySelector:s=>selectors[s]||null,querySelectorAll:s=>s.startsWith('#article-list')?cards:s==='[data-topic]'?buttons:[hero]}});
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
  search.value='  AGREEMENTS ';search.events.input();assert.equal(cards[2].hidden,false);
});
