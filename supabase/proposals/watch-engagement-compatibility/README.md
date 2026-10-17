# Prepared Watch compatibility package

October 17, 2026. **Applied and verified in BCM Test after owner-approved rollback rehearsal. Production untouched.** Both hosted suites passed before application and again afterward: 66 Watch checks and 55 broader access checks. Preservation hashes/counts match the pre-change baseline, and every postcheck assertion passed. No commit, push, default-branch merge, account creation, email, external monitoring, or paid research was performed. See `hosted-verification.json` and the before/after preservation receipts.

## Resulting behavior

An active Client opens Watch through their own accepted engagement grant, independent of an older configuration's service binding. Each authorized engagement can have its own Watch settings; records remain attached to their original legal client and engagement. One configuration opens directly; multiple authorized configurations get an explicit selector on the existing setup page. There are no new engagement-management pages or feature tiers.

Saving includes configuration identity and version, rejects unauthorized/mixed-scope marks, and serializes on the same client lock as closure. The ten-selected-mark limit remains **per legal client across active configurations**, including other users' configurations. Responses do not include other configurations’ mark IDs or counts; an over-limit selection gets a generic rejection. One user cannot overwrite another scope's settings.

Closing an engagement pauses only its scoped Watch configuration. Its findings and history remain retained and hidden from Clients without an active grant; MFA-protected attorney review continues. Different legal clients (including a company and its founder personally) remain separate even if they share a login.

## Database scope

- One new private RLS-protected table: `watch_scope_settings`, with immutable configuration identity and legal-client/engagement foreign keys.
- One nullable configuration reference and supporting index on existing `watch_runs`. Converted run history is linked to the original scoped configuration. Legacy settings, marks, findings, grants, service bindings and scope-ledger entries are retained.
- Three existing functions replaced: `vb_watch_snapshot`, `vb_watch_save`, and `vb_watch_run_due`. The old save API rejects converted clients and remains functional for unconverted clients. Existing worker endpoint names, HTTP runner, ingestion, matching rules and Production workflow/release pin remain unchanged.
- Private helpers and triggers validate configuration/run identity, stop a closed scope's schedule, and reject stale singleton writes. `portal_actor_scope`, `portal_row_read`, `portal_scope_new_record`, `watch_access` and the existing closure function are **not replaced**. Their fingerprints are guarded.
- The worker still processes at most one due configuration per invocation, using existing matching/lookback rules. It rechecks eligibility after taking the client lock; incomplete sources back off without reporting a successful check. Converted singleton schedules are excluded, preventing duplicate processing.
- Migration copies existing settings values and scope; it aborts on missing or mismatched settings, mark, finding or run provenance. It does not guess from a user's newest grant. It takes the existing Watch advisory lock and a temporary exclusive lock on the client table while copying, so Test workspace requests can wait until commit/rollback. Old in-flight writes fail safely through the new legacy-write guard rather than modifying the retired singleton.

## Files and sequence after action-time approval

1. Run `06-preservation.sql` read-only and save its result. It returns hashes/counts and configuration flags, not private Member planning text. The Kit hashes cover only the two disclosed Test users.
2. Verify `prepared-manifest.json` against the files. Run **`prepared-rehearsal.sql`** in BCM Test. It installs the whole change inside one transaction, exercises the Watch scenarios, rolls those fixtures back to a savepoint, then runs the adapted broad access regression before the outer rollback. Expect results from both suites; stop on any error and roll back the session. No Edge Function, HTTP worker, email, ingestion or paid research call is invoked.
3. Rerun the preservation query; every field must match. Only after a successful hosted rehearsal and owner approval covering application, run **`prepared-apply.sql`**. Test identity, table structure, authorization dependencies and installed function definitions are checked before changes. All DDL/data-copy operations commit together.
4. Run **`prepared-installed-checks.sql`**, which ends in rollback. Run `06-preservation.sql` and `07-postcheck.sql`; verify original values, account/grant counts, Kit hashes, unchanged readiness flags, no retained scenario records and correctly scoped run references.
5. Use the existing private Client and attorney sessions to review empty setup, authorized settings, saved state and attorney projection. Do not start real monitoring or send invitations as part of this application step.
6. Before recommending release/default-branch merge, complete independent-session concurrency checks below. Then obtain a separate commit/push/merge decision. Production rollout and the later database audit remain separate.

No new Edge Function deployment, Auth redirect, credential, API key or public signup setting is needed.

## Verification performed locally

- **66 SQL access/worker/lifecycle scenario assertions passed** in PGlite 0.5.10, using the actual prepared migration, RPCs, triggers and worker matching SQL.
- Additional local migration checks refused missing settings scope, mismatched mark scope and missing finding scope. A valid migration preserved settings values and run provenance; the unconverted legacy snapshot/save path remained functional.
- The local harness uses the repository's foundation and scope functions. It substitutes local Auth/JWT helpers and empty non-Watch closure dependency tables, and omits only the explicitly marked hosted database/fingerprint metadata guard. This is not proof of hosted Supabase RLS or a hosted migration.
- Broad JavaScript/controller tests and the unchanged Watch Python runner tests are recorded in `local-verification.json`. The scoped UI tests cover explicit selection, filtering, disabling controls during saves, keeping selection on reload, empty setup, access loss and failed-save edits.
- The browser visual check uses clearly labeled synthetic data and an in-memory repository; it is **not** a connected Test success claim. The connected Test denial was subsequently resolved by the approved Test application; actual Client and MFA attorney screens were verified.
- Normalized source-body fingerprints confirm all three replacement functions were derived from the installed Test versions. The prepared migration guards the original complete server definitions and authorization dependencies too.

The adapted broad enforcement suite is generated from the existing 54-check source. It updates the changed Watch expectation (B can open its own setup without inheriting A), adds a scoped-schedule closure assertion, and temporarily removes grants from its selected Member fixture because that real Test identity may now be a Client. All such fixture changes roll back. The original suite is preserved unchanged. **Hosted execution passed all 55 assertions both in rehearsal and after application.**

## Hosted verification

The initial rehearsal reached the final 55-check result without errors. The assembler was then adjusted only to enforce expected counts and return a single 66/55 receipt; the apply package hash remained unchanged. The repeated rehearsal passed both suites, the new table was absent afterward, and every baseline field matched. The approved apply package then committed successfully. Both installed suites passed again, followed by exact preservation equality and all postcheck assertions.

Actual returning Client Watch results and setup now load the authorized empty configuration. Save/start are disabled because its engagement has no available word marks. No existing user settings were changed. Actual MFA attorney Watch review loads all three active Cotivate configurations. An already-open attorney tab retained the old renderer until a full reload; the refreshed source rendered correctly. Browser save/reload with new persisted fixtures and independent races remain separate; SQL scenarios cover save/version/closure behavior.

Evidence screenshots are in the parent task outputs: `watch-connected-client-results.jpg`, `watch-connected-client-setup.jpg`, and `watch-connected-attorney-review.jpg`. `test-preservation-after-rehearsal.json`, `test-preservation-after-apply.json`, and `test-postcheck.json` record the hosted integrity checks. The original local-verification file remains a dated local-only receipt, not the current deployment status.

The generated manifest describes reproducible package preparation, not whether the SQL is installed. Do not rerun the apply migration on this already migrated Test database. Use the installed checks for future rollback verification.

## Concurrency verification and remaining limitation

The separately approved package in `../watch-concurrency/` has now passed all eight hosted independent-session pairs, final assertions, companion continuation and cleanup. All 28 preservation fields matched exactly. See its `hosted-verification.json`. The installed frozen legacy-write guard was verified after a real lock wait; the exact old-function/migration-DDL transition was not replayed on the already-migrated Test database. A separate scratch database would be needed for that specific historical transition.

The original concurrency checklist below is retained as the test design, not a claim that all items remain unrun. PGlite executes through one connection, so it cannot establish independent-session race behavior. After hosted application, use explicitly approved disposable Test fixtures and two separate database sessions. Prepare/fingerprint the fixture state first; do not use or close an actual retained engagement for these tests.

- **Concurrent first save, same scope:** hold the first client's save transaction; issue the same first-save request with null identity/version zero from the second session. After the first commits, the second must get `40001`; only one configuration exists.
- **Concurrent updates and cap:** use independent scopes of the same fictional legal client. Concurrent selections exceeding ten in total must serialize; one succeeds and the other fails atomically. No scope loses its existing choices.
- **Close versus save:** hold the protected closure transaction before committing; issue a save for that scope in another session. It must wait and then fail `42501`. Reverse the order too: a save committed first must then be stopped by closure.
- **Close versus worker:** exercise the actual SQL worker under `service_role` claims with synthetic complete source data. Whichever takes the shared client lock first determines ordering; no finding or schedule can be committed for a scope after its closure commits. The other active scope continues.
- **Migration versus an old writer:** an old singleton save blocked across migration must be rejected by the frozen-legacy-write trigger; it must not silently succeed into retired settings. Restore/reset any test-only source/schedule changes and verify fixture cleanup and unchanged nonfixture fingerprints.

Do not label these races verified based only on source inspection or the sequential rollback checks. Any additional committed fixture grants or closure actions need the corresponding Test authorization before running them.

## Rebuilding locally

`node tools/prepare-watch-compatibility.mjs` assembles the apply/rehearsal/installed-check packages and hashes. It does not execute SQL. Source-anchor and normalized installed-body guards stop assembly if its baseline changes.

For the optional local SQL harness, install `@electric-sql/pglite@0.5.10` into a temporary directory with a temporary npm cache and `--ignore-scripts`. Set `PGLITE_MODULE` to its `dist/index.js`, then run `node tools/watch-compatibility-local.mjs`. No new application dependency or lockfile is added to the repository.

On a failed hosted rehearsal/application, execute `rollback;` and investigate; do not resume fragments or disable protections. After a committed application, there is no automatic reverse migration: do not drop the new table or restore old functions once scoped settings exist. Prefer a reviewed forward fix; pausing Test access/monitoring must preserve the scoped settings and history and needs its own approval.
