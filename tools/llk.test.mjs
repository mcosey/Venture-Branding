import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {categories,categoryTasks,milestones,emptyProgress,decodeProgress,milestoneStatus} from '../free/assets/llk-data.mjs';
test('progress survives reload and can be undone; all tasks required for completion',()=>{
 const m=milestones.find(x=>x.id==='founders');const p=emptyProgress();
 assert.equal(milestoneStatus(p,m).label,'Not started');p.tasks[m.id]=[true,false,false,false];
 assert.equal(milestoneStatus(p,m).percent,25);p.notes[m.id]='Discuss vesting.';
 const reload=decodeProgress(JSON.stringify(p));assert.equal(reload.notes[m.id],p.notes[m.id]);assert.equal(milestoneStatus(reload,m).label,'In progress');
 reload.tasks[m.id]=m.tasks.map(()=>true);assert.equal(milestoneStatus(reload,m).percent,100);assert.equal(milestoneStatus(reload,m).label,'Completed');
 reload.tasks[m.id][0]=false;assert.equal(milestoneStatus(reload,m).label,'In progress');
});
test('malformed or incompatible saved data cannot break the roadmap or invent completion',()=>{
 assert.deepEqual(decodeProgress('{bad'),emptyProgress());assert.deepEqual(decodeProgress('{"version":2}'),emptyProgress());
 const p=decodeProgress(JSON.stringify({version:1,tasks:{founders:['true',1,true,null]},notes:{founders:'x'.repeat(4000)},unrelated:'private'}));
 assert.deepEqual(p.tasks.founders,[false,false,true,false]);assert.equal(p.notes.founders.length,3000);assert.equal(p.unrelated,undefined);
});
test('all working milestones link to existing articles and have unique route ids',()=>{
 assert.equal(new Set(milestones.map(m=>m.id)).size,milestones.length);assert.equal(new Set(categories.map(c=>c.id)).size,categories.length);
 for(const m of milestones){assert.ok(m.tasks.length>0);assert.ok(m.questions.length>0);for(const [,slug] of m.resources)assert.ok(fs.existsSync(new URL('../blog/posts/'+slug+'.html',import.meta.url)),slug);}
});

test('each category has satellites and every working satellite opens an existing milestone',()=>{
 for(const category of categories){assert.ok(categoryTasks[category.id].length>0);for(const task of categoryTasks[category.id]){assert.ok(task.x>0&&task.x<100&&task.y>0&&task.y<100);if(task.id)assert.ok(milestones.some(m=>m.id===task.id));}}
 assert.equal(categoryTasks.formation.length,milestones.length);
});

test('People task labels face outward, away from their category circle',()=>{
 const category=categories.find(c=>c.id==='people');
 for(const task of categoryTasks.people){assert.ok(task.x<category.x);assert.equal(task.side,'left');}
});
