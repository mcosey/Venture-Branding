# Brand Change Monitor — saved settings

## Scope and approval
Client-facing configuration in VB Agents. October 8: user approved saved settings and access rules, then explicitly approved hosted application and isolation tests. Applied to omvkwiosonatswocbdgx on October 8. No scanner, schedule, credential store, external calls, invitation, or booking is created. Existing sample Coachivate finding remains UI-only and is not stored as a real finding.

## Files
- `supabase/migrations/20261008000100_bcm_settings.sql`: one settings row per client; RLS reads and narrow save RPC.
- `auth/bcm.mjs`: validation, role checks, scoped load and versioned save.
- `portal/assets/brand-monitor.js`: load, review, Save settings, explicit reload after conflicts.
- `supabase/tests/database/bcm_settings.test.sql`: rollback fixtures for two clients, staff, anonymous and unassigned users.
- `tools/bcm.test.mjs`: local validation and connection tests with mocked database calls.

## Rules
Clients read/write only their own active workspace. Approved staff with MFA may read for oversight; this RPC only allows client membership to save. No direct client insert/update/delete privileges. Settings saves are audited and increment an integer version; a stale tab must explicitly reload rather than overwrite. Saving records the signed-in user and permission confirmation timestamp. It does not enable the existing service preference or start any jobs.

URLs are bounded and exclude embedded credentials, query strings and fragments; exclusions are paths. Dedicated-account access is only a saved preference: no password/session fields exist. The settings validator is NOT a safe-fetch boundary: a future scanner still must block private/local addresses, DNS rebinding and redirect escapes, impose time/size/page limits, and treat page content as untrusted data. No website is fetched at this stage.

## Activation checklist
1. DONE: applied the new migration to Venture Branding project `omvkwiosonatswocbdgx`.
2. DONE: all 32 rollback SQL assertions passed (finish returned only 1..32, no failure summary). Confirmed settings table exists, zero saved settings and zero fixture users afterward.
3. DONE: signed-in Cotivate client saved user-approved https://example.com; page refresh restored stored configuration. Removed only that temporary version-1 row and refreshed to confirm empty configuration. Fresh sign-in persistence not separately tested; stale revision rejection and isolation covered by SQL tests.
4. No scheduler, baseline or monitoring activation until its separately approved phase.

Missing table/function shows a pending-setup message and prevents saving; failure is never represented as a successful save. Existing migrations plus this file reproduce the structure in a replacement project; real saved records would require backups separately.

## Verification
16 local BCM and existing connection tests passed. JavaScript syntax and whitespace checks passed. All 32 hosted SQL checks passed via Supabase SQL Editor. Actual client-browser save/refresh verified with user-approved temporary settings and cleanup. Fresh sign-in not separately tested; SQL save/read/update and access isolation verified.

Browser UI save and explicit reload were also checked against an in-memory stub; saved values were restored after an unsaved edit. This does not establish hosted persistence or SQL isolation.
