import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sql=await readFile(new URL('../supabase/proposals/evidence-policy-correction/01-prepared-apply.sql',import.meta.url),'utf8');

test('forward evidence correction only alters the existing SELECT policy',()=>{
 const commands=sql.replace(/--[^\n]*/g,'');
 assert.equal((commands.match(/alter policy /gi)||[]).length,1);
 assert.match(commands,/alter policy evidence_read on public\.vb_evidence using/i);
 assert.doesNotMatch(commands,/\b(?:create|drop|grant|revoke|insert|update|delete|truncate)\b/i);
 assert.match(commands,/m\.id=vb_evidence\.mark_id/);
 assert.match(commands,/m\.client_id=vb_evidence\.client_id/);
 assert.match(commands,/^begin;/m);
 assert.match(commands,/commit;\s*$/);
});

test('correction refuses missing, drifted or disabled baseline permissions',()=>{
 assert.match(sql,/p\.polcmd <> 'r'/);
 assert.match(sql,/not p\.polpermissive/);
 assert.match(sql,/p\.polroles is distinct from array\['authenticated'::regrole::oid\]/);
 assert.match(sql,/p\.polwithcheck is not null/);
 assert.match(sql,/regexp_replace\(pg_get_expr\(p\.polqual,p\.polrelid\)/);
 assert.match(sql,/lock table public\.vb_evidence in access exclusive mode/);
 assert.match(sql,/relrowsecurity/);
});
