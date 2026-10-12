# BCM AI — bounded Test deployment package

Status: Hosted Test research/scheduling trial completed on 2026-10-11: five successful runs (three manual, two scheduled), estimated $0.123894, 32 distinct observations. Both workers use built-in authorization; user saved the API key privately. Readiness flags false, schedules paused, AI cron inactive, all results preserved. Database privacy/review matrix and scheduler timing/pause regression passed. Existing Test MFA attorney UI approval and client approved/withdrawn display checks passed. Withdrawal used the guarded admin test harness through the review RPC, not a fresh staff browser withdrawal click. No Production changes.

Production BCM and its two retired workers remain retired. No automatic mark creation, client messages or Production Brand Map changes.

## What is ready locally

- Two new Test-only workers: `bcm-ai-scan` (client manual) and `bcm-ai-schedule` (private scheduler). The handler rejects every other project URL.
- Reuses existing website/category/frequency settings and client schedules; saving preferences continues to pause monitoring.
- New observations/history/review/publication tables, leaving legacy snapshots/history untouched.
- First successful research per client/domain is a baseline. Later unseen names are newly observed, never assumed newly launched. Exact existing word-mark names remain known.
- Stable normalized name identity per client/domain. Name/context/kind variations do not multiply alerts. Attorney alias links persist.
- Routine same-name wording changes do not requeue. Explicit newly identified rename/identity kinds may requeue a baseline observation. Approved/dismissed decisions persist; attorney can inspect latest evidence and explicitly approve another snapshot.
- No absence/removal inference. No broad similarity or trademark clearance opinions.
- Only staff with existing MFA can read raw findings/reviews or publish/withdraw an update. Clients can read their own approved snapshots and limited status history; private notes and raw AI coverage text are hidden.
- New Test table is capped at 20 attempts in total, including failures/manual/scheduled. No automatic retries. Maximum six web tool calls and two Responses requests per attempt.
- Exact portfolio matching happens in the database. OpenAI receives only the public website, categories, exclusions, and up to 50 previously observed public names. No client contact details, legal notes, portfolio records or credentials are sent.

## Evidence limits

OpenAI hosted search consults a varying subset of sources; it supplies no exhaustive website snapshot. Live web access is enabled, but freshness/completeness is not guaranteed. A supporting passage is extracted from the model's cited research, not independently verified against the original page. The review UI labels this and asks the attorney to verify the source. Source URLs must be consulted and on the enrolled domain. Exclusions filter reported evidence; they do not guarantee hosted search never visits an excluded path. Image-only logos and private/JavaScript-only content remain outside scope.

## Prepared execution, requiring user approval

One bounded Test trial; no new accounts, software installation, Production changes or commit/push.

1. Confirm Test ID `imvkhicfmidzbzsbhkzs`, system identifier `7692130048193495360`, legacy worker retirement, old BCM cron inactive, and existing Test accounts. Apply `setup.sql` once (transaction guarded before changes, readiness false, no cron).
2. Run `verify.sql`. It uses existing client/staff identities, synthetic branding/settings/portfolio rows and an actual restricted role for RLS checks. Everything—including audit fixtures—is rolled back. No new identities or API spend. Hosted database execution is REQUIRED; local tests cannot validate SQL/PLpgSQL.
3. Deploy prepared bundled workers from `tools/bcm-ai-test-review/deployment/`. Both new workers use legacy gateway JWT verification OFF. The manual handler still requires a bearer token verified by Supabase Auth, then the server-derived client role and client-scoped reservation RPC; this supports the existing publishable-key session. The schedule worker requires dedicated private-key authorization instead and rejects browser origins. Obtain action-time approval if UI security policy requires it; do not change unrelated workers.
4. User privately enters `OPENAI_API_KEY` in BCM Test worker secrets. The existing `BCM_SCHEDULER_SECRET` and Vault `bcm_scheduler_secret` must match; do not display or copy their values into chat/files. Existing Vault endpoint must be Test. Never put an API key in browser source code or client fields.
5. Apply `connect.sql` (manual research ready, no job). Use the existing Test client accounts and staff MFA. Confirm unauthorized/off-client access fails, preferences save independently, raw findings stay hidden, approved findings publish/withdraw, and stale reviews fail.
6. Run at most six paid research attempts across the approved openai.com and harvey.ai sites (including any scheduled attempt). Total trial spending limit proposed: $3; prior six-run trial estimated $0.17. The 20-attempt application ceiling is NOT a guaranteed dollar cap; watch recorded estimates and provider usage, stop before the approved budget. Do not enable unrelated clients or retry indefinitely.
7. After manual success only, apply `activate-cron.sql` to test one due schedule and its weekly/monthly next-run calculation. Use Test settings, no fabricated new users. Then apply `pause.sql`, leaving new Test research disconnected and its job inactive. Preserve results and code; report successes and limitations. No ongoing paid monitoring remains enabled at trial end.

## Verification and review

Local command: `node --test tools/bcm-ai.test.mjs tools/bcm-retirement.test.mjs` — 20 passing checks. Provider responses are mocked; this does not claim live Phase 2 success. Local UI approval/alias/publication/save-pause flow checked with fictional records. The Phase 1 live retrieval trial is documented separately in the chat workspace.

Preview: `http://127.0.0.1:8885/tools/bcm-ai-test-review/`. Defaults to fictional local data; Test sign-in is explicit and uses the existing public Test key. No production navigation is restored. Fictional preview data is memory-only and resets on refresh. The client review page resumes its own previously saved Test session after server access checks; ?view=attorney opens the attorney sign-in mode.

Test SQL/PLpgSQL and restricted-role RLS checks completed without errors. Live manual and scheduled research succeeded. The scheduled claim had a PL/pgSQL alias collision, corrected in setup.sql and repair-scheduler.sql; verify-scheduler.sql passed with rollback. pause.sql uses cron.alter_job rather than direct writes to cron.job, which the hosted role disallows. After pause: readiness false, active schedules/jobs zero, five runs and 32 observations retained. Clients saw no raw findings or unapproved updates. Existing Test staff MFA screen/approval and client publication display completed. Guarded withdraw-ui-test.sql soft-withdrew only the explicitly labeled temporary publication through the review RPC using transaction-local staff test claims; actual client refresh hid it. This is distinct from testing a new MFA-authenticated browser withdrawal click. A later Production phase needs separate approval and a deployment decision; this trial does not establish complete coverage or genuine website-change detection.

## Existing portal integration — October 11
Client settings, reviewed publications and history, plus per-client private attorney queue now use the normal portal in explicit local Test configuration. tools/bcm-ai-portal-server.py serves only Test config on loopback8885 without editing Production auth/config.js. Test session keys are distinct from Production and require local hostname. Research controls are disabled by local config; Test readiness stays false. Normal Test staff MFA login, UI approval, actual client publication display, UI withdrawal and client disappearance all verified using the labeled temporary Harvey II Test observation. No additional research calls, schema, deployment, account changes, commit or push. Seven new portal guard/privacy/stale-response tests pass; see handoffs/31-bcm-ai-test-portal.md. Brand Map and Production connection remain separate scope.
