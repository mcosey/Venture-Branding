import test from 'node:test';
import assert from 'node:assert/strict';
import { localTestConnection } from './concurrency.test.mjs';
import { checkPgTap } from './privacy.test.mjs';

test('accepts explicit disposable local targets without exposing credentials', () => {
  const config = localTestConnection('postgresql://test_user:secret%20value@127.0.0.1:54322/venture_brand_map_test');
  assert.equal(config.PGHOST, '127.0.0.1');
  assert.equal(config.PGPORT, '54322');
  assert.equal(config.PGDATABASE, 'venture_brand_map_test');
  assert.equal(config.PGPASSWORD, 'secret value');
  assert.equal(config.PGSSLMODE, 'disable');
});

test('database test runner accepts a complete passing pgTAP plan', () => {
  assert.equal(checkPgTap('setup noise\nok 1 - private read denied\nok 2 - owner can read\n1..2\n'),2);
});

test('database test runner rejects failures, absent plans, and partial results', () => {
  for (const output of ['ok 1 - only result\n', 'ok 1 - first\n1..2\n',
    'not ok 1 - leaked rows\n1..1\n', 'ok 2 - out of order\n1..1\n',
    'ok 1 - result\n1..1\nBail out! interrupted\n']) {
    assert.throws(() => checkPgTap(output));
  }
});

test('rejects remote, ordinary application, redirected, and missing targets', () => {
  for (const value of [undefined, '', 'not a URL',
    'postgresql://u:p@remote.example/venture_brand_map_test',
    'postgresql://u:p@localhost/postgres',
    'postgresql://u:p@localhost/venture_brand_map_test?host=remote.example',
    'postgresql://u:p@localhost/venture_brand_map_test#options',
    'https://u:p@localhost/venture_brand_map_test',
    'postgresql://localhost/venture_brand_map_test']) {
    assert.throws(() => localTestConnection(value));
  }
});
