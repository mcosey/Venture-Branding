import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {categories,categoryTasks,milestones,savedMilestones,emptyProgress,decodeProgress,milestoneStatus,taskProgressIndex} from '../free/assets/llk-data.mjs';
test('progress survives reload and can be undone; all tasks required for completion',()=>{
 const m=milestones.find(x=>x.id==='founders');const p=emptyProgress();
 assert.equal(milestoneStatus(p,m).label,'Not started');p.tasks[m.id]=Array(taskProgressIndex(m,m.tasks.length)).fill(false);p.tasks[m.id][taskProgressIndex(m,0)]=true;
 assert.equal(milestoneStatus(p,m).percent,Math.round(100/m.tasks.length));p.notes[m.id]='Discuss vesting.';
 const reload=decodeProgress(JSON.stringify(p));assert.equal(reload.notes[m.id],p.notes[m.id]);assert.equal(milestoneStatus(reload,m).label,'In progress');
 reload.tasks[m.id]=Array(taskProgressIndex(m,m.tasks.length)).fill(true);assert.equal(milestoneStatus(reload,m).percent,100);assert.equal(milestoneStatus(reload,m).label,'Completed');
 reload.tasks[m.id][taskProgressIndex(m,0)]=false;assert.equal(milestoneStatus(reload,m).label,'In progress');
});
test('malformed or incompatible saved data cannot break the roadmap or invent completion',()=>{
 assert.deepEqual(decodeProgress('{bad'),emptyProgress());assert.deepEqual(decodeProgress('{"version":2}'),emptyProgress());
 const p=decodeProgress(JSON.stringify({version:1,tasks:{founders:['true',1,true,null]},notes:{founders:'x'.repeat(4000)},unrelated:'private'}));
 assert.deepEqual(p.tasks.founders.slice(0,4),[false,false,true,false]);assert.ok(p.tasks.founders.slice(4).every(x=>x===false));assert.equal(p.notes.founders.length,3000);assert.equal(p.unrelated,undefined);
});
test('revised founder decisions never inherit completion from the original discussion checklist',()=>{
 const m=milestones.find(x=>x.id==='founders');
 const p=decodeProgress(JSON.stringify({version:1,tasks:{founders:[true,true,true,true]},notes:{founders:'Existing founder notes.'}}));
 assert.equal(milestoneStatus(p,m).done,0);assert.equal(milestoneStatus(p,m).label,'Not started');
 assert.equal(p.notes.founders,'Existing founder notes.');
 p.tasks.founders[taskProgressIndex(m,9)]=true;
 const restored=decodeProgress(JSON.stringify(p));assert.equal(milestoneStatus(restored,m).done,1);
 assert.equal(restored.tasks.founders[taskProgressIndex(m,9)],true);
 assert.equal(m.tasks[9],'Document founder IP assignments.');
});
test('all working milestones link to existing articles and have unique route ids',()=>{
 assert.equal(new Set(savedMilestones.map(m=>m.id)).size,savedMilestones.length);assert.equal(new Set(categories.map(c=>c.id)).size,categories.length);
 for(const m of savedMilestones){assert.ok(m.tasks.length>0);assert.ok(Array.isArray(m.questions));for(const [,slug] of m.resources)assert.ok(fs.existsSync(new URL('../blog/posts/'+slug+'.html',import.meta.url)),slug);}
});

test('each category has satellites and every working satellite opens an existing milestone',()=>{
 for(const category of categories){assert.ok(categoryTasks[category.id].length>0);for(const task of categoryTasks[category.id]){assert.ok(task.x>0&&task.x<100&&task.y>0&&task.y<100);if(task.id)assert.ok(savedMilestones.some(m=>m.id===task.id));}}
 assert.equal(categoryTasks.formation.length,milestones.length);
});

test('People task labels face outward, away from their category circle',()=>{
 const category=categories.find(c=>c.id==='people');
 for(const task of categoryTasks.people){assert.ok(task.x<category.x);assert.equal(task.side,'left');}
});
