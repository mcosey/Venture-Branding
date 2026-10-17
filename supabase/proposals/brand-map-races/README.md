# Brand Map simultaneous-edit test package

Prepared October 10, 2026. **Files only; no database execution in this phase.**

The existing client homepage works with authorized trademark records. The proposed IP asset, relationship and legal-link backend remains unapplied and unconnected. The earlier 133 sequential database assertions passed and rolled back. The earlier browser probe proved simultaneous read-only connections. Neither result proves these 12 write races, which remain unrun. Real-client login/API checks also remain unrun.

## Scope and review status

This package adapts the reviewed local concurrency runner into full SQL-editor batches for BCM Test `imvkhicfmidzbzsbhkzs`. No installations, passwords, credential discovery, network calls or browser automation are part of its generator or local checks. Main project `omvkwiosonatswocbdgx`, paused Cotivate Development `yjhzhflyuxcxugfgspby` and FlowRata are excluded.

`package.mjs` prepares 55 SQL files plus fixture/source manifests. Every rehearsal/setup/race/verification/cleanup file is BLOCKED before its first change. `package.test.mjs` uses synthetic reports to test rejection paths; synthetic reports are never database evidence. The SQL splitter checks statement boundaries/quoting, not PostgreSQL compilation. Hosted SQL syntax, locks, transaction cleanup and SQL-editor result transport still require execution.

Local verification: 14 new package checks, 10 existing hosted-package checks, and 4 original local-guard checks passed (28 total). The three original reviewed source files remain byte-for-byte unchanged. Shared branch `codex/attorney-workspace`, staging and parallel-feature edits were preserved.

## Files

- `prepared/00-readonly-preflight.sql`: existing schema/identity checks plus USPTO-save, Auth fixture metadata and control-table checks.
- `prepared/gate-rehearsal/`: three blocked read-only full batches that rehearse controlled lock release before any application writes.
- `prepared/01-setup.BLOCKED.sql`: guarded, temporary committed backend/fixture setup.
- `prepared/cases/`: controller, first writer, competing writer and independent verifier for each of 12 cases.
- `prepared/02-cleanup.BLOCKED.sql`: guarded transaction that removes only owned test objects/data and checks preservation.
- `prepared/03-readonly-postcheck.sql`: independent confirmation after cleanup.
- `prepared/fixture-manifest.json`: exact IDs, namespace, scenario order, isolation and expected SQLSTATE.
- `prepared/source-manifest.json`: source/SQL hashes and explicit zero database/login runs.
- `operator-runbook.md`: execution, evidence and failure procedure for the next separately approved phase.

The generator CLI accepts no activation or credential arguments. Running it creates a fresh namespace for a completely new review bundle. **Never regenerate the manifest of an installed run, overwrite evidence, mix namespaces, or edit BLOCKED flags by hand.**

## Exact planned database effects — not executed

Only BCM Test, during an approved coordinated testing window:

1. Temporarily commit the unchanged backend draft: three Brand Map tables, five public functions, five private helpers, its triggers/policies/grants and one mark uniqueness constraint. Add only whichever of three nullable date fields are genuinely missing. Install no extension.
2. Add one additional private, denied-access test-control table (`vb_private.brand_map_race_runs`). Add one synthetic client, its five disabled service preferences, 14 IP/business assets, six synthetic trademark records and two SQL-only Auth fixture rows with client/staff memberships. Auth fixtures have no password, identity, session, invitation, email confirmation or login. Simulated staff claims do not test actual MFA.
3. Run six scenarios at each of READ COMMITTED and REPEATABLE READ: circular relationship, stale edit, access revocation, changed mark identity via direct update, changed identity through the existing USPTO-save function, and a compatible factual status refresh after review. The USPTO-save path is database-only; it makes no request to USPTO or other external services.
4. Verify each committed outcome and restore only the synthetic membership revoked by that case. Then remove the fixtures, draft objects and run-added date fields in one guarded cleanup transaction, followed by independent read-only confirmation.

Committed setup is necessary because separate connections cannot see another connection's uncommitted fixtures. This differs from the earlier rollback-only sequential test. Audit numbering can advance even when a transaction is rolled back; harmless number gaps can remain. Never reset shared sequences. Adding/removing columns may leave physical catalog slots/counters; preservation compares live application schema, rules, existing rows and extensions, not internal allocation counters.

No real client accounts or data are intentionally edited, and the portal is not connected in this phase. Cleanup refuses to proceed if other work depends on the fixtures, if any SQL-only fixture has acquired an actual Auth identity/session, if existing rows/rules changed, or if extra Brand Map records exist. A refusal leaves the temporary setup in place for investigation, rather than deleting shared work.

## Evidence and synchronization

The controller owns a transaction-level advisory gate. The first writer performs its actual edit and waits on that gate while retaining its real row locks. The competing writer first reads its permitted Brand Map and then attempts its conflicting write. The controller releases the gate only after seeing the exact three-connection blocking chain. For the revocation cases, it commits synthetic membership revocation before releasing the gate. PostgreSQL releases transaction-level advisory locks at transaction end. [PostgreSQL 17 locking documentation](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS).

The competing writer catches only the expected SQLSTATE; unexpected errors or success fail the case. Its initial authorized read occurs outside the error-catching block. PL/pgSQL exception blocks roll back changes within the failing block. [PostgreSQL 17 exception documentation](https://www.postgresql.org/docs/17/plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING).

A report alone is insufficient: the whole batch must finish without an error, the controller proof must have committed, and an independent verifier must confirm the saved database state. `verifyCompletedRun` requires all 12 distinct cases, saved participant evidence, cleanup and zero leftovers before returning PASS. Partial execution or cleanup alone cannot count as passing coverage.

All waits are bounded: 20-second controller deadline, 8-second competing-writer startup, 20-second lock/25-second statement/idle-transaction limits; setup/cleanup use 3-second lock and 30-second statement limits. Failures stop the run. Never weaken protections to make a test pass.

## Changes from the original runner

- Full batches and a controller gate replace the local runner's continuously open connections. Controlled release must first pass its own read-only rehearsal through the actual browser SQL editor.
- Synthetic application numbers are distinct eight-digit values per case, avoiding collisions in the existing per-client unique index. This is a fixture correction, not a change to business rules.
- Preservation compares bounded row counts/digests without exporting client rows. Only this run's synthetic rows are excluded. For preexisting marks, only date fields recorded as added by this run are temporarily omitted; date fields already present remain protected.
- Evidence/control rows, fixture ownership checks and guarded cleanup are additional test scaffolding. The original backend and original local-only execution guards remain unchanged.

## Approval boundary

The next phase requires explicit approval before running even the rehearsal and before temporary committed Test setup. Approval may cover rehearsal, conditional setup, all 12 races and guarded cleanup as one bounded phase. If the rehearsal fails, stop before setup. Coordinate the testing window before writes; do not message other chats without human authorization. Do not create a cloud runner, install software, activate real-client test logins, deploy, commit or push.

Later phases remain real-client isolation checks, connecting the approved backend to the homepage and completing bounded client/staff interactions. Each requires its own defined scope and approval. Recommended model for race execution/debugging: GPT-6.1 Sol with high reasoning because concurrency and privacy are intertwined.

## October 10 prerequisite amendment

Fresh hosted preflight found the shared USPTO-save function absent; execution stopped before any rehearsal/setup/write. The user subsequently approved adding that one prerequisite temporarily and resuming the bounded Test phase. `uspto-save.reviewed.sql` copies exactly the three create/revoke/grant statements from the existing upstream migration (full upstream SHA256 `6846444ac19732973406ab86095bdb29c7f75b570a654ba27b45d2c787bc6b5e`; extracted source SHA256 `c4b3160d01eb56aaacceab3b6dabcc5af32d3f150b7b31bcd4cd70f5deed641d`). It is source material for the guarded generator, not a standalone execution instruction.

`buildSetup` accepts `temporaryUsptoApproved:true` only with the exact `usptoSource`. It rejects every preexisting overload of that function name instead of replacing/claiming another feature's function. Baseline preservation is recorded before the addition; the ownership payload records the optional prerequisite and its source hash. Cleanup removes it only for the owned mode and unchanged installed schema, before removing run-added date fields. Independent postcheck/coverage verification compares its final availability to fresh preflight. No upstream unique index or whole import migration is added. Two new local checks cover the prerequisite scope and restoration (16 new checks total).

The original `prepared/` bundle and delivered ZIP remain the earlier blocked review snapshot. Current amended/enabled copies and evidence belong in the separate chat execution-work folder, retaining the same saved namespace. Never run an older cleanup against an amended installation.
