// UNRUN against PostgreSQL. No dependencies beyond Node and an existing psql.
// Never reads the application's config or credentials. Run only after approval.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

export function localTestConnection(value) {
  if (!value) throw new Error('Provide a separately approved local disposable database URL.');
  let target;
  try { target = new URL(value); } catch { throw new Error('Invalid local test database URL.'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || target.pathname !== '/venture_brand_map_test'
    || target.search || target.hash || !target.username) {
    throw new Error('Tests require a local database named venture_brand_map_test, with no URL options.');
  }
  return {
    PGHOST: target.hostname === '[::1]' ? '::1' : target.hostname,
    PGPORT: target.port || '5432',
    PGDATABASE: 'venture_brand_map_test',
    PGUSER: decodeURIComponent(target.username),
    PGPASSWORD: decodeURIComponent(target.password),
    PGSSLMODE: 'disable',
    PGCONNECT_TIMEOUT: '5',
  };
}

class DatabaseError extends Error {
  constructor(stderr) {
    const code = stderr.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1] || 'unknown';
    super(`Test database operation failed (${code}).`);
    this.code = code;
  }
}

// Each Session is an actual independent PostgreSQL connection, not a mock.
class Session {
  constructor(connection, name) {
    this.stderr = '';
    this.buffer = '';
    this.pending = null;
    this.sequence = 0;
    // Do not inherit PG service files/options that could redirect the target.
    this.child = spawn('psql', ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'], {
      env: { PATH: process.env.PATH, ...connection, PGAPPNAME: name },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child.stderr.on('data', data => { this.stderr += data; });
    this.child.stdout.on('data', data => {
      this.buffer += data;
      this.complete();
    });
    this.child.on('error', () => this.fail(new Error('Cannot start psql. No database tests ran in this session.')));
    this.child.on('close', code => {
      this.closed = true;
      if (this.pending) this.fail(new DatabaseError(this.stderr));
      this.exitCode = code;
    });
    this.child.stdin.on('error', () => {});
  }
  complete() {
    if (!this.pending) return;
    const needle = `${this.pending.marker}\n`;
    const index = this.buffer.indexOf(needle);
    if (index < 0) return;
    const output = this.buffer.slice(0, index).trim();
    this.buffer = this.buffer.slice(index + needle.length);
    const job = this.pending;
    this.pending = null;
    clearTimeout(job.timer);
    job.resolve(output);
  }
  fail(error) {
    this.failure = error;
    if (!this.pending) return;
    const job = this.pending;
    this.pending = null;
    clearTimeout(job.timer);
    job.reject(error);
  }
  step(sql) {
    if (this.failure) return Promise.reject(this.failure);
    if (this.closed) return Promise.reject(new Error('Test database session closed.'));
    if (this.pending) throw new Error('One statement batch at a time per test connection.');
    return new Promise((resolve, reject) => {
      const marker = `brand_map_done_${++this.sequence}`;
      const timer = setTimeout(() => {
        this.fail(new Error('Test database operation timed out.'));
        this.child.kill('SIGTERM');
      }, 15000);
      this.pending = { marker, resolve, reject, timer };
      this.child.stdin.write(`${sql}\nselect '${marker}';\n`);
      this.complete();
    });
  }
  stop() {
    this.child.stdin.end(); // Closing an unfinished transaction rolls it back.
    if (!this.closed) this.child.kill('SIGTERM');
  }
}

const quote = value => `'${value.replaceAll("'", "''")}'`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const business = name => quote(JSON.stringify({ name, kind: 'product', description: '', business_use: 'in_use' })) + '::jsonb';

async function main() {
  if (process.env.BRAND_MAP_TEST_APPROVED !== 'local-disposable') {
    throw new Error('Explicit local disposable test-environment approval is required before running this file.');
  }
  const connection = localTestConnection(process.env.BRAND_MAP_TEST_DATABASE_URL);
  const sessions = new Set();
  const prefix = `brand-map-test-${randomUUID()}`;
  const open = suffix => {
    const session = new Session(connection, `${prefix}-${suffix}`);
    sessions.add(session);
    return session;
  };
  const admin = open('admin');
  const client = randomUUID();
  const user = randomUUID();
  const staff = randomUUID();
  const auth = `set local role authenticated; select set_config('request.jwt.claims',${quote(JSON.stringify({ sub: user, role: 'authenticated', aal: 'aal1' }))},true);`;
  const staffAuth = `set local role authenticated; select set_config('request.jwt.claims',${quote(JSON.stringify({ sub: staff, role: 'authenticated', aal: 'aal2' }))},true);`;
  let fixtureCreated = false;
  try {
    assert.equal(await admin.step('select current_database();'), 'venture_brand_map_test');
    assert.equal(await admin.step("select to_regprocedure('public.vb_read_brand_map(uuid)') is not null;"), 't', 'Apply the draft to the approved test database before running tests.');
    await admin.step(`begin;
      insert into auth.users(id,email) values(${quote(user)},'concurrency-${user}@example.invalid');
      insert into auth.users(id,email) values(${quote(staff)},'concurrency-${staff}@example.invalid');
      insert into vb_private.staff_members(user_id) values(${quote(staff)});
      insert into public.vb_clients(id,name,client_type,contact_name,portal_enabled)
        values(${quote(client)},'Disposable concurrency fixture','business','Test contact',true);
      insert into vb_private.client_memberships(client_id,user_id) values(${quote(client)},${quote(user)});
      commit;`);
    fixtureCreated = true;

    async function assets(count) {
      const ids = Array.from({ length: count }, () => randomUUID());
      await admin.step(`insert into public.vb_brand_assets(id,client_id,name,kind,business_use,source_kind) values
        ${ids.map((id, n) => `(${quote(id)},${quote(client)},'Concurrent asset ${n}','product','in_use','manual_client')`).join(',')};`);
      return ids;
    }
    async function waitForLock(name, query) {
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        if (await admin.step(`select exists(select 1 from pg_catalog.pg_stat_activity
          where application_name=${quote(name)} and wait_event_type='Lock');`) === 't') return;
        const settled = await Promise.race([query.then(() => true, () => true), delay(100).then(() => false)]);
        if (settled) throw new Error('Competing write did not wait on the intended database lock.');
      }
      throw new Error('Could not verify an overlapping blocked write.');
    }
    async function race(isolation, index, winnerSql, loserSql, expectedCodes, revoke = false, actingAuth = auth) {
      const name = `race-${index}`;
      const first = open(`${name}-first`);
      const second = open(`${name}-second`);
      let outcome;
      try {
        await first.step(`begin isolation level ${isolation}; ${revoke ? '' : actingAuth}`);
        await second.step(`begin isolation level ${isolation}; ${actingAuth}
          select public.vb_read_brand_map(${quote(client)});`);
        await first.step(winnerSql);
        // Attach a rejection handler immediately while the query waits.
        outcome = second.step(loserSql).then(
          () => ({ succeeded: true }), error => ({ succeeded: false, error }));
        await waitForLock(`${prefix}-${name}-second`, outcome);
        if (revoke) {
          await admin.step(`update vb_private.client_memberships set active=false
            where client_id=${quote(client)} and user_id=${quote(user)};`);
        }
        await first.step('commit;');
        const result = await outcome;
        if (expectedCodes === null) {
          assert.equal(result.succeeded,true,'A compatible factual status update should succeed.');
          await second.step('commit;');
        } else {
          assert.equal(result.succeeded, false, 'Competing invalid write must fail.');
          assert.ok(expectedCodes.includes(result.error.code), `Unexpected failure code: ${result.error.code}`);
        }
        console.log(`PASS ${isolation}: ${name} (${result.succeeded ? 'compatible save' : result.error.code}; overlapping connections verified)`);
      } finally {
        first.stop(); second.stop();
        if (outcome) await outcome;
        if (revoke) await admin.step(`update vb_private.client_memberships set active=true
          where client_id=${quote(client)} and user_id=${quote(user)};`);
      }
    }

    let index = 0;
    for (const isolation of ['read committed', 'repeatable read']) {
      const [a, b] = await assets(2);
      await race(isolation, `cycle-${++index}`,
        `select public.vb_set_brand_parent(${quote(client)},${quote(a)},${quote(b)},1);`,
        `select public.vb_set_brand_parent(${quote(client)},${quote(b)},${quote(a)},1);`,
        isolation === 'read committed' ? ['22023'] : ['40001']);
      assert.equal(await admin.step(`select count(*) from public.vb_brand_relationships
        where client_id=${quote(client)} and child_asset_id in (${quote(a)},${quote(b)}) and parent_asset_id is not null;`), '1');

      const [editable] = await assets(1);
      await race(isolation, `stale-edit-${++index}`,
        `select public.vb_save_brand_asset(${quote(client)},${quote(editable)},1,${business('Winning name')});`,
        `select public.vb_save_brand_asset(${quote(client)},${quote(editable)},1,${business('Losing name')});`, ['40001']);
      assert.equal(await admin.step(`select name from public.vb_brand_assets where id=${quote(editable)};`), 'Winning name');

      const [revoked] = await assets(1);
      await race(isolation, `membership-revocation-${++index}`,
        `select id from public.vb_clients where id=${quote(client)} for update;`,
        `select public.vb_save_brand_asset(${quote(client)},${quote(revoked)},1,${business('Must not save')});`,
        isolation === 'read committed' ? ['42501'] : ['40001'], true);
      assert.equal(await admin.step(`select version from public.vb_brand_assets where id=${quote(revoked)};`), '1');

      // Exercise both existing attorney mark-write paths against link review.
      for (const path of ['direct-mark-update', 'uspto-import']) {
        const [legalAsset] = await assets(1);
        const mark = randomUUID();
        await admin.step(`insert into public.vb_marks(id,client_id,name,mark_type,status,record_owner)
          values(${quote(mark)},${quote(client)},'Concurrency legal mark','word','inactive','Test owner');`);
        const stamp = await admin.step(`select updated_at::text from public.vb_marks where id=${quote(mark)};`);
        const identity = quote(JSON.stringify({ client_id: client, name: 'Concurrency legal mark', mark_type: 'word', record_owner: 'Test owner' })) + '::jsonb';
        const review = `select public.vb_review_brand_legal_link(${quote(client)},${quote(legalAsset)},${quote(mark)},1,1,${identity});`;
        const fields = { name: 'Concurrency legal mark', mark_type: 'word', status: 'inactive',
          record_owner: 'Changed owner', application_number: '99999999', registration_number: null,
          source_checked_at: '2026-10-09T00:00:00Z', uspto_status_text: 'Synthetic fixture status' };
        const mutation = path === 'direct-mark-update'
          ? `update public.vb_marks set record_owner='Changed owner' where id=${quote(mark)};`
          : `select public.vb_save_uspto_mark(${quote(client)},${quote(mark)},${quote(stamp)}::timestamptz,${quote(JSON.stringify(fields))}::jsonb);`;
        await race(isolation, `${path}-${++index}`, mutation, review, ['40001'], false, staffAuth);
        assert.equal(await admin.step(`select mark_id is null from public.vb_brand_legal_links where asset_id=${quote(legalAsset)};`),'t', 'Changed mark identity must not receive stale review.');
      }

      const [statusAsset] = await assets(1);
      const statusMark = randomUUID();
      await admin.step(`insert into public.vb_marks(id,client_id,name,mark_type,status,record_owner)
        values(${quote(statusMark)},${quote(client)},'Status refresh mark','word','inactive','Test owner');`);
      const stamp = await admin.step(`select updated_at::text from public.vb_marks where id=${quote(statusMark)};`);
      const identity = quote(JSON.stringify({ client_id: client, name: 'Status refresh mark', mark_type: 'word', record_owner: 'Test owner' })) + '::jsonb';
      const factualUpdate = quote(JSON.stringify({ name: 'Status refresh mark', mark_type: 'word', status: 'pending',
        record_owner: 'Test owner', application_number: '99999998', registration_number: null,
        source_checked_at: '2026-10-09T00:00:00Z', uspto_status_text: 'Synthetic status refresh' })) + '::jsonb';
      await race(isolation, `review-and-status-refresh-${++index}`,
        `select public.vb_review_brand_legal_link(${quote(client)},${quote(statusAsset)},${quote(statusMark)},1,1,${identity});`,
        `select public.vb_save_uspto_mark(${quote(client)},${quote(statusMark)},${quote(stamp)}::timestamptz,${factualUpdate});`,
        null, false, staffAuth);
      const reader = open(`status-reader-${index}`);
      try {
        const state = await reader.step(`begin; ${staffAuth}
          select (x->>'review_state') || ':' || (x->>'linked_record_status')
          from jsonb_array_elements(public.vb_read_brand_map(${quote(client)})->'legal_links') x
          where x->>'asset_id'=${quote(statusAsset)}; commit;`);
        assert.ok(state.endsWith('current:pending'), 'Status refresh must preserve identity review and show current facts.');
      } finally { reader.stop(); }
    }
    console.log('Database concurrency tests passed. Synthetic committed fixtures will now be removed.');
  } finally {
    for (const session of sessions) if (session !== admin) session.stop();
    try {
      if (fixtureCreated) await admin.step(`begin;
        delete from public.vb_brand_legal_links where client_id=${quote(client)};
        delete from public.vb_brand_relationships where client_id=${quote(client)};
        delete from public.vb_brand_assets where client_id=${quote(client)};
        delete from public.vb_marks where client_id=${quote(client)};
        delete from vb_private.audit_events where client_id=${quote(client)};
        delete from public.vb_service_preferences where client_id=${quote(client)};
        delete from vb_private.client_memberships where client_id=${quote(client)};
        delete from public.vb_clients where id=${quote(client)};
        delete from vb_private.staff_members where user_id=${quote(staff)};
        delete from auth.users where id in (${quote(user)},${quote(staff)});
        commit;`);
    } catch {
      console.error('Fixture cleanup failed. Discard the disposable test database before further use.');
      process.exitCode = 1;
    } finally { admin.stop(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
