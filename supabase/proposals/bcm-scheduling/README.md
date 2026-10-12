# BCM scheduling — database verified in Test, worker not activated

October 10, 2026: `setup.sql` applied in BCM Test only. All 38 hosted database checks passed: 23 scheduling/compatibility assertions, 12 authenticated/anonymous role and client-isolation checks, and 3 checks using overlapping database sessions. All temporary fixtures rolled back. Postflight confirmed zero saved setups, scans, schedules and recurring BCM jobs; readiness remains false. Production is untouched.

Approved worker trial completed in BCM Test: `bcm-schedule` deployed, built-in `pg_net` enabled, and the user privately configured matching worker/Vault keys. Legacy JWT verification is off for this function only; its dedicated private-key checks passed all seven deployed HTTP cases. The two-minute Cron dispatcher produced a real public-page baseline and comparison. Actual authenticated database-role checks verified Pause/Resume and monthly saving without automatic restart. A hosted unavailable-page check recorded failure and the correct next calendar-month date.

Test job removed and all exact fixtures cleaned up: zero saved settings, scans, schedules or recurring BCM jobs; readiness false. Worker, dispatcher function and private Test configuration remain installed but inactive. Cotivate is visibly confirmed paused, as requested. Production remains untouched. Hosted scan evidence used the one-page public example.com site; this is not a claim of complete site coverage or an end-to-end Production portal release.

Clients choose weekly/monthly in their existing BCM settings. Saving always pauses recurring monitoring. Start/resume queues a check; the first successful check for that settings version becomes the baseline and later checks compare against it. Pause invalidates a running automatic check before it can persist. Manual scans remain available when automatic monitoring is paused or disconnected.

Public readable pages only. No login fields, stored website passwords, JavaScript browser service, new account, local installation, AI service or subscription is part of this implementation.

## Files and boundaries

- `setup.sql`: guarded for the previously verified BCM Test database. Adds per-client schedule status, client controls, worker reservation/current-job checks and a finalizer wrapper. Existing configurations start paused; a private readiness switch remains false. **Creates no recurring job.** Requires the already tested one-link schema.
- `test-scheduling.sql`: verified transaction using the existing Cotivate Filing and Mithril Zeppelin Filing Test users. Changes roll back. Exercises separate saving/activation, stale revisions, cross-client control rejection, worker restrictions, weekly/monthly dates, duplicate reservations, pause invalidation, revoked access and manual-scan compatibility. **23 assertions passed.** Simulated service claims in SQL are test context; the real worker uses its server-side service connection and never impersonates a client.
- `activate-cron.sql`: separate later approval. Requires the existing Supabase pg_cron/pg_net capabilities, a deployed `bcm-schedule` function and matching private Vault/worker secret. No secret values are present in these files. It creates one job for this project only, every two minutes; SQL skips the Edge Function call when no check is due. Do not activate until private-header authorization has been tested against the deployed function.
- `deactivate.sql`: Test-only job shutdown, preserves saved settings/scans and other jobs. All schedules pause and in-flight automatic results are invalidated. Removes only the precisely named BCM dispatch job; it does not drop the schema, remove secrets or change other projects.

The database and worker execute on the existing Supabase platform. These capabilities may need enabling in that project with approval; nothing is installed on the user's computer. Provider documentation: [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [pg_net request timeout](https://supabase.com/docs/guides/database/extensions/pg_net).

## Review details

The schedule table has client-scoped reads and no direct browser writes. A client must still have active access to start/pause/resume. Monitoring controls use both the saved settings version and schedule revision so an older tab cannot overwrite a newer change. Background checks revalidate the saved activating user's membership, workspace availability and public scope before fetching and again before accepting results. Saving, pausing, or removing access prevents acceptance of a running automatic result.

Reservation uses the same client-first lock order as manual scans. One automatic job runs globally at a time; the existing two-minute reservation expiry and per-client cooldown apply. This is an MVP throughput limit: at one eligible client per two-minute tick, simultaneous due clients wait in order. Manual checks can also temporarily delay a due job.

Weekly means 168 hours after reservation; monthly means one calendar month in UTC, preserving PostgreSQL's end-of-month behavior. A failed check is recorded and the next check remains at the normal frequency; the client can use Run scan immediately when cooldown allows. No retry loop, email notification, billing subsystem or configurable exact time-of-day was added.

The previously tested snapshot validator is copied verbatim into a private function, with only its name and qualified snapshot parameter renamed. The public finalizer adds the scheduled-revision check; existing manual scans keep their established validation and result format. Brand Map continues reading the same saved snapshots and does not need its own scheduling changes.

## Completed validation and remaining activation

1. Completed: applied setup and ran transactional checks in BCM Test, including actual authenticated/anonymous database roles, client-scoped RLS and simultaneous reservations in separate sessions.
2. Completed with approval: configured private worker authorization and built-in Supabase scheduling, rejected unauthorized HTTP requests, observed real Cron-driven baseline/comparison, and verified hosted failure handling and actual client-role controls. The failure test used one server dispatch after a genuine cooldown-skipped tick; no scan timestamp or clock was altered. No client Run scan was used.
3. Completed: stopped the precisely named Test job and removed only identity/row-guarded disposable fixtures; original empty Test settings/scans state restored. Private Test configuration retained. Cotivate remains paused and BCM Test active, per the latest user instruction. Ask before restoring Cotivate afterward.
4. Production connection and publishing remain a separate approved phase after Test succeeds. These drafts reject the Production database.

Local code checks and the fictional browser simulator validate controls and worker orchestration, **not a running Supabase schedule**. Never report recurring monitoring as connected from this preview.
