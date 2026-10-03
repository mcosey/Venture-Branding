import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build, readPosts, root} from './build-blog.mjs';

function fixture(t) {
  fs.mkdirSync(path.join(root,'work'),{recursive:true});
  const dir = fs.mkdtempSync(path.join(root,'work/blog-test-'));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  const sourceDir = path.join(dir,'source');
  const outDir = path.join(dir,'output');
  fs.mkdirSync(sourceDir);
  function post(slug,status='published',date='2020-01-01',body='Readable **article**.') {
    fs.writeFileSync(path.join(sourceDir,`${slug}.md`),`---\ntitle: "${slug}"\ndescription: "A useful summary"\nauthor: "Test Author"\ncategory: "Trademark Basics"\ndate: "${date}"\n${status ? `status: "${status}"\n` : ''}---\n${body}\n`);
  }
  return {sourceDir,outDir,post};
}
test('normal build excludes draft, sample, missing-status, and future articles everywhere',t => {
  const f=fixture(t);
  f.post('approved'); f.post('unfinished','draft'); f.post('example','sample'); f.post('unspecified',''); f.post('future','published','2099-01-01');
  const result=build(f);
  assert.equal(result.count,1);
  assert.deepEqual(fs.readdirSync(path.join(f.outDir,'blog/posts')),['approved.html']);
  const index=fs.readFileSync(path.join(f.outDir,'blog.html'),'utf8');
  for(const slug of ['unfinished','example','unspecified','future']) assert.ok(!index.includes(`${slug}.html`));
  const article=fs.readFileSync(path.join(f.outDir,'blog/posts/approved.html'),'utf8');
  assert.ok(!article.includes('unfinished.html'));
  assert.ok(article.includes('<strong>article</strong>'));
});
test('preview includes draft and sample with labels and noindex; related links resolve',t => {
  const f=fixture(t); f.post('draft-post','draft'); f.post('sample-post','sample');
  assert.equal(build({...f,preview:true}).count,2);
  const html=fs.readFileSync(path.join(f.outDir,'blog/posts/sample-post.html'),'utf8');
  assert.ok(html.includes('noindex,nofollow'));
  assert.ok(html.includes('Layout sample.'));
  assert.ok(html.includes('draft-post.html'));
  assert.ok(fs.readFileSync(path.join(f.outDir,'blog.html'),'utf8').includes('Draft · Preview only'));
  // Verify generated relative links and assets, including their in-page targets.
  for (const file of [path.join(f.outDir,'blog.html'),...fs.readdirSync(path.join(f.outDir,'blog/posts')).map(name=>path.join(f.outDir,'blog/posts',name))]) {
    const content=fs.readFileSync(file,'utf8');
    for(const [,url] of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(url)) continue;
      const [pathname,anchor]=url.split('#');
      const target=pathname ? path.resolve(path.dirname(file),pathname) : file;
      assert.ok(fs.existsSync(target),`Missing ${url} from ${file}`);
      if(anchor) assert.ok(fs.readFileSync(target,'utf8').includes(`id="${anchor}"`),`Missing anchor ${url}`);
    }
  }
});
test('moving an article to draft removes its stale generated page, preserving unrelated files',t => {
  const f=fixture(t); f.post('retired'); build(f);
  fs.writeFileSync(path.join(f.outDir,'blog/posts/unrelated.html'),'Handwritten page');
  f.post('retired','draft'); build(f);
  assert.ok(!fs.existsSync(path.join(f.outDir,'blog/posts/retired.html')));
  assert.ok(fs.existsSync(path.join(f.outDir,'blog/posts/unrelated.html')));
});
test('metadata errors fail before changing the previous build; raw HTML and script links cannot run',t => {
  const f=fixture(t); f.post('safe','published','2020-01-01','<script>alert(1)</script>\n\n[Unsafe](javascript:alert%281%29)');
  build(f);
  const html=fs.readFileSync(path.join(f.outDir,'blog/posts/safe.html'),'utf8');
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('href="javascript:'));
  const before=fs.readFileSync(path.join(f.outDir,'blog.html'),'utf8');
  f.post('bad','published','2026-02-30');
  assert.throws(()=>build(f),/invalid date/);
  assert.equal(fs.readFileSync(path.join(f.outDir,'blog.html'),'utf8'),before);
});
test('ordering is newest first and unknown status is rejected',t => {
  const f=fixture(t); f.post('older','published','2020-01-01'); f.post('newer','published','2021-01-01');
  assert.deepEqual(readPosts(f.sourceDir).map(p=>p.slug),['newer','older']);
  f.post('typo','publish'); assert.throws(()=>readPosts(f.sourceDir),/invalid status/);
});
