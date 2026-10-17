# BCM general-client Production rollout — applied

October13,2026. Approved bounded scope: replace one-client/lifetime pilot with general active-client access and eight attempts/client/month,200 attempts/VB/month. No public publication or commit/push included in implementation approval.

## Working functionality

All active invited client workspaces can now use BCM through normal VB Agents and Brand Map entrances. Each client controls its own website, categories, exclusions, weekly/monthly preference, baseline collection and Start/Pause. Three successful baseline passes retained. Approved-only publication flow unchanged. No previously paused schedule auto-enrolled. No crawler, login/image scanning, new services or account installation. Existing verified private scheduler and Production worker remain.

The Production singleton has client_month_limit8/global_month_limit200. Counters use UTC calendar month; every reservation counts, including failed/discarded ones. Settings changes do not reset allowance. Old pilot fields remain historical metadata, but no active readiness/reservation/claim/current/start/dispatch function uses them. Historical lifetime max_runs7 no longer gates active behavior; pilot_client_id cleared. Existing four October attempts count, leaving four for Cotivate until November1UTC.

Shared global-row locking serializes reservations before checking both counters; last allowed reservation remains eligible to finish. Exhausted clients are skipped in due selection; another eligible client can run. Exhausted/global-paused research is shown accurately. Pause monitoring stays usable when research is unavailable; saving preferences remains available. No client can see shared usage totals or another client's allowance. Existing MFA/staff/client authorization retained; new public allowance RPC checks accessible-client/staff membership and denies anonymous execution.

## Verification

91 focused local checks passed, including two new UI budget/pause checks, existing map publication/withdrawal, late-response isolation, auth and worker behavior. Actual Production transaction applied migration plus two rollback-only fixture sets before commit. Monthly matrix checked client/global boundary, previous-month exclusion while retaining baseline, failed-attempt counting, final allowance completion, active/archived eligibility, exhausted-first queue fairness, global pause, other-client allowance denial and raw finding/private-note exclusion. Reservation lock order reviewed; no independent concurrent load/stress test claimed.

The existing saved-candidate replay was reused to verify baseline behavior, later discovery review, duplicate handling, current-revision approval, actual authenticated-role snapshot access and withdrawal. All temporary fictional client workspaces, memberships (reusing the existing actor), run records, notes, publications and temporary config/settings writes were rolled back to savepoints before migration commit. No new login identities or paid API calls.

Three initial transaction attempts stopped before commit because a fixture omitted required started_at, then attempted to insert a schedule already created by the settings trigger, then expected the former error wording. Fixtures corrected to the existing flow/new message; final transaction returned all verification flags true. No protections weakened or verification skipped.

Final read-only Production state: readiness true,8/200 limits, no selected pilot, runs4/observations25/publications0 unchanged, fixture clients0, anonymous allowance executionfalse, legacy jobs0, existing AI jobactive. Only previously enabled Cotivate schedule remains enabled. OpenAI weekly website/preference and October19,9:22p.m.Central next check unchanged. Client screen shows4 of8 used/4 remaining, November1UTC reset, baseline3/3 and Pause.

## Files and operational boundaries

New source package supabase/proposals/bcm-ai-client-rollout: setup.sql, verify.sql, apply-verified.sql, README.md. apply-verified.sql atomically saves the rollout only after tests pass and rollback of all fixture writes. It is a one-time additive migration and must not be blindly reapplied.

Updated auth/bcm-ai.mjs, portal/assets/bcm-ai.js, client.js, attorney/assets/workspace.js and targeted HTML cache versions, tests/bcm-ai-portal tests. Older retired-scanner drafts untouched. No worker redeployment or gateway/auth change needed. Source package/baseline/review history preserved.

Public portal hosting remains unconfirmed: localhost8000 is the review location. Production backend and general client portal code are ready; internet hosting/origin configuration is a separate website publication step. Current OpenAI key must be privately renewed before expiration/October19 check. This credential task does not require further BCM development.

## Next step

Approve scoped commit/push of this completed rollout. No further pilot or discovery refinement phase proposed. Appropriate model for saving work/administration: GPT-6.1 Sol medium.
