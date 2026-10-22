# Finished scheduler-log retention — LOCAL PREPARATION ONLY

This package schedules one daily, bounded cleanup of technical `cron.job_run_details` history. It has **not** been applied, scheduled or run in any hosted database. It grants no access and adds no application function, table, extension, worker, credential or notification. Automatic alerts remain a separate decision.

Owner-approved preparation: October 21, 2026. Main Venture Branding target is `omvkwiosonatswocbdgx`, historical cluster `7690937621030482216`, database/executor `postgres`. Independently verify the dashboard project URL; the database name alone is not project identity. A changed identity, schema or executor must stop the package; do not remove guards.

## Rule

- Only known terminal `succeeded` / `failed` rows with a non-null end time **strictly older than 30 days** are eligible. Exactly thirty days old, recent/future, unfinished/null-ended, running and unknown-status rows remain.
- At most 5,000 oldest eligible entries per invocation, locked with `FOR UPDATE SKIP LOCKED`. The DELETE rechecks the predicate. Locked rows can wait for a later day; this is not a promise every expired row disappears on its first eligible day.
- Runtime holds a row-exclusive history-table lock while checking the schema and deleting. Unexpected user triggers, rewrite rules or dependent foreign keys stop cleanup rather than risk side effects. Primary-key/type and existing SELECT/DELETE privileges are checked. No grants or RLS changes are made.
- One daily native job, `vb-ops-cron-history-retention-30d`, at `17 3 * * *` (03:17 UTC). The installer requires existing cron timezone GMT/UTC and run logging on. It changes neither setting. The command requests a ten-second statement timeout and one-second lock timeout, plus its 5,000-row batch cap. Actual timeout enforcement must be checked for the installed native cron execution mode before activation.
- It never targets clients, evidence, audit/revision history, invitations, Watch/research records or private inbox messages. Provider log retention and GitHub's existing retention stay separate.

The October 21 approved main-project read found 5,826 rows / ~1.01 MiB and zero finished entries older than thirty days. That is historical evidence of a small table, not an urgent bloat problem or a fresh installation preflight. Deletion does not necessarily shrink allocated files immediately; no full vacuum/rebuild is proposed.

## Files and later operator procedure

1. `01-readonly-preflight.sql`: target/extension/timezone/logging/table/privilege checks; rejects the exact job name, common competing cleanup names or a visible cron command mentioning `job_run_details`. Returns only aggregate candidates/size/job count, then ROLLBACK. This can conservatively reject a read-only history command; inspect instead of bypassing it. It cannot prove the absence of external/manual cleanup or hidden helper calls. Review those operational arrangements separately.
2. `02-prepared-schedule.sql`: a separate SERIALIZABLE transaction repeats guards and schedules only; it **does not execute cleanup immediately**. It checks the resulting ID, name, exact command, cadence, active state, local host/port, database and executor before commit. Same-name jobs are refused rather than updated. The transaction must finish without error through COMMIT before the returned `installed_job_id` is accepted as a receipt. Preserve that ID, command digest, prior jobs and source hashes outside public logs.
3. `03-prepared-stop.sql`: deliberately blocked by `__REVIEWED_INSTALL_JOB_ID__`. After installation, prepare a reviewed copy replacing only that marker with the positive numeric ID from its receipt. It verifies that exact ID, name, command digest, schedule, host/port, database and owner before `cron.unschedule(id)`. It also works for an otherwise identical paused job. Drift/reinstallation needs fresh review; an old receipt must not stop a new job. Stop leaves history/business records intact and does not cancel a cleanup already executing. **It stops future expiry; it cannot restore already deleted logs.**

The cleanup command is maintained once, inside the installer's `$cleanup_command$` literal; the stop script contains its digest, not a second implementation. The source check fails if they diverge. SERIALIZABLE install/stop transactions are intended to abort on competing changes, including named-job upsert races. Do not retry an error blindly: allow rollback, inspect the actual state, refresh preflight and review. The local harness does not prove an independent-session race or native scheduler behavior.

All scripts stay outside automatic migrations. No existing scheduler needs pausing to prepare this package. **No hosted query, application, deletion, scheduling, permission or deployment action follows from a Git commit.** Before hosted use, separately approve the exact target-specific preflight/rehearsal/application. Before activating expiry, obtain action-time approval for irreversible old-log deletion. Do not resume Test or interrupt Cotivate without coordination.

## Local checks — no installation required

Run only with the runtime already available; the optional SQL harness refuses to install one:

```sh
NODE_OPTIONS='--import ./tools/no-network.mjs' node --test tools/scheduler-log-retention.test.mjs
PGLITE_MODULE=/absolute/path/to/already-installed/pglite/dist/index.js \
  NODE_OPTIONS='--import ./tools/no-network.mjs' node tools/test-scheduler-log-retention-local.mjs
```

The SQL harness runs isolated synthetic native-schema doubles in the existing PGlite. It changes the historical cluster pin to that isolated database's real control-system identifier **in memory only**, and changes the stop digest accordingly. The cleanup predicates, type/trigger/dependency guards and permissions logic are not replaced. The fixtures explicitly model scheduler metadata/functions; they do not install or execute native pg_cron. An explicit local test transaction fixes the clock for the exact cutoff check; a separate case executes the complete maintained command batch.

Checks cover strict time/status boundaries, the 5,000-row limit and order, schema/dependency rejection, wrong identity/role/timezone, logging disabled, missing extension metadata, same-name/competing jobs, unexpected scheduler metadata, no immediate purge, stop receipt/drift rejection and preserved unrelated records. Ordinary source checks also bind the stop digest to the canonical command.

Limits: PGlite PostgreSQL/WASM is not the hosted PostgreSQL/native pg_cron runtime. Independent-connection races, skipped locked rows under contention, hosted-role/catalog permissions, wall-clock scheduling, real cleanup and native notifications are unverified. No new software or network/application request is needed for these checks. The optional SQL runner is not automatically added to CI; the two source checks are picked up by the existing Node test glob without a new dependency.

The job command contains no explicit BEGIN/COMMIT because native pg_cron background workers reject transaction-control statements; the scheduler executes its SQL batch atomically. Install/stop are operator transactions, not scheduled commands.

A separately approved hosted rehearsal must inspect actual cron function signatures and execution-mode timeout handling, table RLS/roles/timezone, visible and externally managed cleanup, and local host/port assumptions. Rehearse preservation/stop behavior without triggering real expired-log deletion. Any unforeseen permission requirement is a reason to stop and review, not to broaden access. Native functions can consume sequence IDs during a rolled-back rehearsal; logical row preservation does not promise contiguous IDs.

References checked October 21: [Supabase Cron cleanup guidance](https://supabase.com/docs/guides/cron/quickstart), [pg_cron](https://github.com/citusdata/pg_cron), [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html). Their guidance supports the platform patterns; thirty days and the batch/cadence limits are this proposal's choices. No independent outage monitoring or launch certification is claimed.
