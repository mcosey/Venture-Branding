# Watch simultaneous-action checks

Prepared October 17, 2026. **Executed under owner approval in BCM Test: all eight paired checks passed in distinct database backends, final assertions and the companion continuation passed, disposable fixtures were removed, and all 28 preservation fields matched exactly.** No credentials, accounts, invitations, external jobs, Production settings or installed functions/permission policies were changed. Temporary synthetic engagement grants were added and removed as explicitly approved. See `hosted-verification.json`. Existing Watch implementation and Legal Launch Kit design are unchanged by this preparation.

## Purpose and exact proposed Test effects

Verify that independent PostgreSQL sessions cannot overwrite newer settings, exceed the shared ten-mark limit, or restart monitoring after access ends. Engagements here are security fixtures, not a matter-management feature.

The approved setup temporarily committed **eight clearly labeled disposable clients, sixteen engagements and sixteen accepted grants** to the two existing disclosed Test identities. Every engagement includes all Client features; there are no tiers. It adds 26 synthetic word marks, seven synthetic complete source-file rows and two synthetic application rows. No new Auth account, policy acceptance, contact email, invitation or message is created. Member profiles and private Legal Launch Kit data are untouched.

Committing disposable fixtures is necessary for a second session to see them. Their grants were visible temporarily in those two Test accounts. No existing engagement is closed. Setup requires the Test scheduler to remain disabled and Watch already enabled; it changes neither readiness setting. One synthetic configuration is temporarily due for the locked-worker scenario. No HTTP worker, ingestion, email or paid research is invoked. Two cases call the actual SQL Watch worker against synthetic marks/source rows; the worker-first case commits only its disposable client's result. The other worker probes roll back.

Cleanup deletes only the reserved disposable records, their synthetic audit events, and reserved source rows. It does not delete any existing user or account. Sequence counters may advance; they are not reset. Existing table contents and readiness flags must match before/after hashes. Owner approval explicitly covered this disposal; cleanup committed successfully.

## Prepared cases

| Case | Session A | Session B | Required result |
|---|---|---|---|
| 1 | First save holds client lock | Competing first save captures null ID/version zero | A commits one configuration; B waits and gets `40001` |
| 2 | Update holds client lock | Update captures the older version | A commits one new version; B waits and gets `40001` |
| 3 | Scope A selects six marks | Scope B tries six more | A commits; B waits and gets `22023`; B's original selection remains |
| 4 | Protected MFA closure holds client lock | Client tries to save/start | Closure commits; waiting save rechecks access and gets `42501` |
| 5 | Save/start holds client lock | Protected MFA closure | Save commits first; closure then stops that scope's schedule |
| 6 | Closure holds client lock on a due scope | SQL worker sees committed pre-closure due state | Worker skips locked client promptly and commits nothing; active companion later still processes in a rollback probe |
| 7 | SQL worker processes only fixture A and holds client lock | Protected MFA closure | Worker commits first; closure then stops A; its retained run predates closure; B stays active |
| 8 | Client lock held after installed cutover | Captured legacy write waits, then reaches frozen-singleton trigger under original authenticated claims | Write gets `42501`; old singleton stays unchanged |

Case 8 tests the installed stale-write protection after a real independent-session wait. It **does not replay migration DDL or prove an already-running pre-cutover function across the migration**. Replaying that exact transition requires a separate disposable database initialized to the old schema. Do not restore old functions, remove guards, or rerun the one-shot migration on BCM Test.

## Hosted execution receipt

All eight A/B pairs returned passing receipts in different PostgreSQL backend PIDs. Waiting competing save/closure operations took roughly 17–21 seconds; the locked-worker probe returned promptly and rolled back. `10-verify.sql` and `11-companion-worker-rollback.sql` passed. `12-cleanup.sql` committed. `00-preservation.sql` then matched all 28 baseline fields, including source values, audit rows, grants and private Kit hashes. `13-final-preservation-receipt.sql` compares the entire original JSON baseline in the database and returns a readable final receipt. Before/after JSON and paired receipts are saved beside this file; AX evidence and a screenshot are in the parent task outputs.

The first setup attempt hit an existing Test trigger that automatically inserts all Client features. It failed atomically; an explicit rollback followed. The fixture service insert was corrected to tolerate existing defaults with `ON CONFLICT DO NOTHING`, its isolated local preflight passed again, and the second setup succeeded. The actual installed authorization logic was not modified. The manifest records the corrected executed package. The earlier local-only verification remains a dated preflight receipt and is not the current hosted execution status.

There is no need to repeat this sequence before review simply because it is documented here. Re-execution after subsequent changes must again obtain any required temporary-access approval and a fresh preservation baseline. Do not rerun setup over existing fixtures.

## Reproducible execution sequence

1. Verify `manifest.json` hashes. Run `00-preservation.sql` and save its visible JSON result locally. No raw private Member text is returned. The snapshot includes existing settings, marks, grants, engagements, matters, services, source values, scope ledgers, audit records and the disclosed users' Kit hashes.
2. Use two SQL Editor tabs in project **imvkhicfmidzbzsbhkzs — Venture Branding BCM Test**. No direct connection credential is needed. Each script guards the system identifier and installed Watch function fingerprints. The `pg_temp` assertion/context functions and grants are session-local, never public application helpers.
3. Run `01-setup.sql` once. It aborts on any reserved-ID/source collision or missing existing identity. Do not repeat it over retained fixtures.
4. For each numbered pair, in order, submit **A**, then submit **B in the other tab while A is running**. A holds a separate advisory gate and the relevant real client lock, then waits 18 seconds before commit. B must observe A's gate in a different backend PID; it fails if the two requests did not overlap. Save/closure B cases must actually wait at least one second. The worker-skip case must return in under 14 seconds while seeing the pre-closure scope due. Timing is not a performance benchmark; it establishes the intended interleaving.
5. Save **both** A and B results, including backend PIDs. Do not infer a race passed from sequential execution or a successful first request. Run `10-verify.sql` only after both scripts in every pair finish. Then run `11-companion-worker-rollback.sql` to prove the active companion still processes after closure without persisting a check.
6. Run `12-cleanup.sql`. It refuses cleanup while any A gate is held and takes fixture client locks before deleting. Run `00-preservation.sql` again and compare every field with the baseline. All must match. Run the already-installed 66/55 rollback suites if a failure or repair warrants regression checking.
7. Record exact hosted receipts and remaining limitations. Only then propose the review/commit/push/default-branch merge decision. Production rollout and the later database audit are separate.

Each transaction has a 45-second statement limit, 30-second lock limit and 45-second idle-transaction limit. These are transaction-local. No background sleep or permanent test helper is installed. The scripts are not a scheduler.

If a script errors, run `rollback;` in that editor session, let the companion transaction finish or roll it back, and stop the sequence. Do not weaken assertions, permissions or locks to get a pass. Capture the failure and investigate. Cleanup covers only this package's reserved fixtures and is usable after an interrupted sequence once setup committed; it intentionally refuses partially absent/misidentified clients. If setup failed atomically, there is nothing to clean. Restart a failed scenario set with approved fixture cleanup and fresh setup, rather than reopening closed engagements or guessing expected versions.

## Local preflight and its limits

`node tools/prepare-watch-concurrency.mjs` generates the SQL and hashes without connecting anywhere. Optional isolated verification:

```sh
PGLITE_MODULE=/private/tmp/vb-watch-db/node_modules/@electric-sql/pglite/dist/index.js node tools/watch-compatibility-local.mjs --concurrency-preparation
```

The local harness first exercises the existing migration/66 SQL scenarios. It then checks setup, all eight case bodies, final assertions, companion continuation and cleanup sequentially. It confirms each unmodified B script refuses a missing A gate, and compares 19 original table hashes after cleanup. Local-only substitutions remove the hosted identity/fingerprint check, model the observed enabled Watch/disabled scheduler readiness, remove sleeps/overlap checks, and preserve the competing request's old CAS values. The generated hosted scripts retain all overlap checks. This is **syntax/fixture/expected-outcome preparation, not evidence of independent-session races or hosted Supabase permissions**. See `local-verification.json`.

No application code, deployment, schema refactoring, client-management feature, Calendly integration or Legal Launch Kit change is part of this package.
