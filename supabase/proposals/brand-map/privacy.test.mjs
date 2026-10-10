// UNRUN against PostgreSQL. Uses only an explicitly approved local test target.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { localTestConnection } from './concurrency.test.mjs';

export function checkPgTap(output) {
  const lines = output.split(/\r?\n/);
  const plans = lines.filter(line => /^1\.\.\d+$/.test(line));
  const assertions = lines.filter(line => /^(?:not )?ok\s+\d+(?:\s|$)/.test(line));
  if (plans.length !== 1 || Number(plans[0].slice(3)) < 1) throw new Error('Database test results have no complete test plan.');
  const total = Number(plans[0].slice(3));
  if (assertions.length !== total || assertions.some((line, index) => Number(line.match(/^(?:not )?ok\s+(\d+)/)[1]) !== index + 1)) {
    throw new Error('Database test results are incomplete or out of order.');
  }
  if (lines.some(line => /^Bail out!/.test(line)) || assertions.some(line => /^not ok/.test(line))) {
    throw new Error('One or more database privacy assertions failed.');
  }
  return total;
}

async function main() {
  if (process.env.BRAND_MAP_TEST_APPROVED !== 'local-disposable') {
    throw new Error('Explicit local disposable test-environment approval is required before running this file.');
  }
  const connection = localTestConnection(process.env.BRAND_MAP_TEST_DATABASE_URL);
  const sql = await readFile(new URL('./brand-assets.test.sql', import.meta.url), 'utf8');
  const output = await new Promise((resolve, reject) => {
    const child = spawn('psql', ['-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'], {
      env: { PATH: process.env.PATH, ...connection, PGAPPNAME: 'brand-map-privacy-test',
        PGOPTIONS: '-c vb_brand_map.test_approved=local-disposable' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Database privacy tests timed out; results remain unverified.'));
    }, 60000);
    child.stdout.on('data', value => { stdout += value; });
    child.stderr.on('data', value => { stderr += value; });
    child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); reject(new Error('Cannot start psql; no database privacy results are available.')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        const state = stderr.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1] || 'unknown';
        reject(new Error(`Database privacy execution failed (${state}); tests are not verified.`));
      } else resolve(stdout);
    });
    child.stdin.end(sql);
  });
  const total = checkPgTap(output);
  console.log(`PASS ${total} database privacy assertions. Synthetic fixtures rolled back.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
