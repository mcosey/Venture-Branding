# Remaining Brand Map tests — prepared only

October 10, 2026. Initial approved scope was files-only preparation. A subsequent separately approved read-only connection probe passed: two simultaneous participant backends and an independent observer were verified; both bounded queries finished, zero probe connections remained, and application/prerequisite metadata matched. No accounts, application data, installations, deployments or product changes were made. Sequential database testing previously passed all 133 assertions and verified rollback. This package grants no execution approval.

## Proposed route

Use BCM Test (`imvkhicfmidzbzsbhkzs`) through the existing Supabase Dashboard. First establish whether three browser SQL-editor batches can overlap on three distinct PostgreSQL backends. Two bounded read-only pauses plus a third scoped activity observer can test that without touching application records. The three supplied probe files are blocked until a separately approved read-only run verifies the exact dashboard project and supplies a fresh cluster pin.

**Read-only simultaneous backend capability is now verified.** The specific write-race synchronization remains unimplemented/unverified. Three browser tabs do not prove three database sessions. Require two simultaneously active, distinct probe PIDs, both different from the observer PID, with their bounded `PgSleep` waits visible. No other session's query, IP or user data is exported. If the editor queues requests or the probe is inconclusive, stop; no paid runner, software installation, service key or new account is silently introduced. [Supabase connection monitoring](https://supabase.com/docs/guides/database/connection-management)

The proposed race transport sends a complete transaction in each SQL request; never rely on an editor preserving a connection between clicks. A winner performs its mutation, holds the transaction briefly, then commits; a loser establishes its read snapshot and attempts the competing write while the winner is uncommitted. The observer must record the actual lock wait and `pg_blocking_pids` pointing to the intended winner before accepting the result. A sleep alone is not race evidence. Use transaction-local application labels and bounded limits. [Supabase connection/session behavior](https://supabase.com/docs/guides/database/connecting-to-postgres)

## Files and limits

- `probe-first.BLOCKED.sql`, `probe-second.BLOCKED.sql`, `probe-observer.BLOCKED.sql`: proposed read-only transport check, not run.
- `test-matrix.json`: the exact 12 existing concurrency cases plus 22 defined client sign-in/API checks, all marked unrun.
- `setup-and-cleanup.md`: exact future changes, authorization boundary, test-account handling, setup and cleanup order.
- `race-protocol.md`: synchronization, expected outcomes and evidence requirements.

The original local-only runner remains unchanged. No enabled hosted setup, fixture cleanup, sign-in harness, or write-race script is delivered by this planning package. They need a later approved implementation/execution phase after the read-only capability result. The read-only transport probe passed; the browser write-race route remains a proposal, not a working concurrency runner.

## Current product status

The authorized-trademark homepage works. New saved IP/business assets, relationships and trademark associations passed sequential database tests but remain unapplied and unconnected. Real client-token privacy, simultaneous edits, staff-MFA browser behavior and final production integration are not established by this package.

## Recorded read-only capability result

The October 10 probe passed on its first run: participant PIDs `74976` and `74977`, observer `74978`; both participants simultaneously active in `PgSleep`, three distinct connections. Participants returned the same identifiers after completion, and no labelled connections remained. Before/after application fingerprint `0af1c031dfcef3c5807f250eec838d8632c751049a2ce6219dd86573e82b3ac2` and prerequisite state matched. The supplied default probe copies remain blocked; approval for this run does not authorize another probe or any write setup. No concurrency-case or real-sign-in result is added.
