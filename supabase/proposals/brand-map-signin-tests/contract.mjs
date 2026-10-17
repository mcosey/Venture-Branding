// Pure Test-only contracts: no network, storage or application imports.
export const PROJECT = 'imvkhicfmidzbzsbhkzs';
export const ORIGIN = `https://${PROJECT}.supabase.co`;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const CASES = ['A-own-read','B-own-read','A-empty-read','A-foreign-read','B-foreign-read','A-own-create','B-own-create','A-foreign-create','A-foreign-save','A-foreign-parent','A-foreign-confirm','B-foreign-write','A-legal-review','A-forged-fields','A-stale-save','raw-table-denials','private-helper-denials','anonymous-denials','A-revoked-session','B-disabled-portal','signout-clears-test-view','payload-safe-rendering'];
export const PAYLOAD = '<img src=x onerror="window.__brandMapPayloadExecuted=true">';
export const business = name => ({name,kind:'product',description:'',business_use:'in_use'});
export function ensure(value, message) { if (!value) throw new Error(message); }
export function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length===keys.length && Object.keys(value).every(k=>keys.includes(k));
}
export function validateManifest(m, bound=false) {
  ensure(exactKeys(m,['prepared_only','project','run_id','label','users','clients','assets','marks','unknown_client']), 'Unexpected manifest fields.');
  ensure(m.prepared_only===true && m.project===PROJECT && UUID.test(m.run_id) && m.label===`bm-login-${m.run_id}`, 'Wrong Test manifest.');
  ensure(exactKeys(m.users,['A','B']) && exactKeys(m.clients,['A','B','C']) && exactKeys(m.assets,['A','B']) && exactKeys(m.marks,['A','B']), 'Incomplete fixtures.');
  ensure(m.assets.A.length===2 && m.assets.B.length===1 && m.marks.A.length===2 && m.marks.B.length===1, 'Fixture counts changed.');
  const ids=[m.run_id,...Object.values(m.clients),...Object.values(m.assets).flat(),...Object.values(m.marks).flat(),m.unknown_client];
  for(const actor of ['A','B']) {
    const u=m.users[actor];
    ensure(exactKeys(u,['id','email']) && u.email===`${m.label}-${actor.toLowerCase()}@example.invalid`, 'Wrong disposable account.');
    ensure((!bound && u.id===null) || UUID.test(u.id), 'Observed Auth user IDs required.');
    if(u.id) ids.push(u.id);
  }
  ensure(ids.every(id=>UUID.test(id)) && new Set(ids).size===ids.length, 'Invalid/reused fixture ID.');
  return m;
}
export function validateConfig(c) {
  ensure(exactKeys(c,['execution_approved','setup_verified','project','manifest','database_identity','installed_schema']), 'Unexpected configuration fields.');
  ensure(c.execution_approved===true && c.setup_verified===true && c.project===PROJECT, 'Live testing is blocked until separately approved and setup verified.');
  validateManifest(c.manifest,true);
  ensure(/^[1-9][0-9]{14,19}$/.test(c.database_identity) && /^[a-f0-9]{64}$/.test(c.installed_schema), 'Fresh Test setup pins required.');
  return c;
}
export function validateKey(key) {
  ensure(typeof key==='string' && /^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(key), 'Use only a Test publishable key; secret and legacy keys are refused.');
  return key;
}
export function validateMap(map,m,workspace, expectedAssets, expectedMarks) {
  const top=['client_id','assets','relationships','legal_links','marks','counts'];
  ensure(exactKeys(map,top) && map.client_id===m.clients[workspace], 'Map contains unexpected fields or workspace.');
  ensure(exactKeys(map.counts,['assets','legal_records','linked_legal_records']) && map.counts.assets===expectedAssets.length && map.counts.legal_records===expectedMarks.length && map.counts.linked_legal_records===0, 'Unexpected map counts.');
  const specs={
    assets:['id','client_id','name','kind','description','business_use','version','identity_revision','source_kind','created_at','updated_at'],
    relationships:['id','child_asset_id','parent_asset_id','state','version','confirmed_by_role','confirmed_at'],
    legal_links:['id','asset_id','mark_id','version','reviewed_at','reviewed_by_role','review_state','linked_record_available','linked_record_status'],
    marks:['id','client_id','name','mark_type','status','uspto_status_text','application_number','registration_number','record_owner','source','source_checked_at','filing_date','registration_date','uspto_status_date','updated_at']
  };
  for(const [collection,keys] of Object.entries(specs)) ensure(Array.isArray(map[collection]) && map[collection].every(row=>exactKeys(row,keys)), 'Unexpected/private record fields.');
  const same=(actual,expected)=>actual.length===expected.length && new Set(actual).size===actual.length && actual.every(id=>expected.includes(id));
  ensure(same(map.assets.map(x=>x.id),expectedAssets) && same(map.marks.map(x=>x.id),expectedMarks), 'Foreign or missing records.');
  ensure(map.assets.every(x=>x.client_id===m.clients[workspace]) && map.marks.every(x=>x.client_id===m.clients[workspace]), 'Foreign ownership.');
  ensure(same(map.relationships.map(x=>x.child_asset_id),expectedAssets) && same(map.legal_links.map(x=>x.asset_id),expectedAssets), 'Missing or foreign slots.');
  ensure(map.relationships.every(x=>x.parent_asset_id===null && x.state===null && x.version===1 && x.confirmed_by_role===null && x.confirmed_at===null) && map.legal_links.every(x=>x.mark_id===null && x.version===1 && x.review_state==='not_linked' && x.reviewed_at===null && x.reviewed_by_role===null && x.linked_record_available===false && x.linked_record_status===null), 'Unexpected relationship/legal mutation.');
  return map;
}
export function renderMap(container,map) {
  container.replaceChildren();
  for(const a of map.assets) {
    const card=container.ownerDocument.createElement('article');
    const name=container.ownerDocument.createElement('strong'); name.textContent=a.name;
    const detail=container.ownerDocument.createElement('p'); detail.textContent=`${a.kind} · ${a.business_use} · version ${a.version}`;
    card.append(name,detail); container.append(card);
  }
  if(!map.assets.length) container.textContent='This test workspace is empty.';
}
export function safeEvidence(row) {
  ensure(exactKeys(row,['case_id','actor','status','checks','fresh_logins']), 'Unexpected evidence fields.');
  ensure(CASES.includes(row.case_id) && ['A','B'].includes(row.actor) && row.status==='PASS' && Number.isInteger(row.checks) && row.checks>0 && Number.isInteger(row.fresh_logins) && row.fresh_logins>0, 'Incomplete evidence.');
  return {...row};
}
