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

## Manual baseline pilot — deployed October 8
User approved the first manual scan and saved baseline for Cotivate.com. Migration `20261008000200_bcm_baseline.sql` is applied, 15 rollback SQL checks passed, and function `bcm-scan` is deployed in project `omvkwiosonatswocbdgx`. Dashboard bundle source is reproducible with `tools/bundle-bcm-dashboard.mjs`.

Scope: one fixed HTTPS homepage (`https://cotivate.com/`), public access only, no redirects, cookies, JavaScript execution, login, arbitrary crawling, AI calls, logo analysis, comparisons, or schedule. This intentionally narrow trusted-domain pilot is NOT a general URL fetcher. Expanding it requires destination/DNS/IP validation and SSRF-safe transport; do not simply substitute user URLs into fetch. Source-text extraction skips scripts/styles and is not a rendered visibility/accessibility analysis. Headings/title/text retained; no HTML rendered in portal. Page content is data, never instructions. Maximum 1 MB download, 60k text, 12-second fetch deadline.

The authenticated client reserves a scan under RLS/member checks and current settings version. Database serializes per client, limits to one attempt per two minutes and one completed baseline per settings version. Worker alone finalizes using service-role RPC. Finalization rechecks original user's membership, archive/portal access, current settings version and two-minute expiry. Failures never overwrite existing baseline. No new API key or paid service required.

Cotivate LLC's client saved the public homepage settings and ran the first real baseline. Scan history retained its page title and extracted homepage text through reload. Screenshot: `../outputs/bcm-live-baseline.png`. It does not identify changes or start recurring scans. 25 local tests and 15 hosted rollback SQL checks passed.

Next development step: compare a later homepage snapshot with this baseline and present candidate text changes for client consideration. Keep findings descriptive, with page evidence, and route discussion to attorney; do not make legal conclusions or automatically expand representation. Schedule, credentials, other URLs, visual logo analysis and outbound notifications are later phases requiring their own security review.
## October 8: Baseline deployed, awaiting client sign-in
User approved migration, deployment and first real Cotivate scan. Applied 20261008000200_bcm_baseline.sql successfully to omvkwiosonatswocbdgx. All 15 rollback baseline SQL assertions passed (finish only 1..15). Deployed tested dashboard bundle as bcm-scan; legacy JWT verification off, handler verifies Auth user + client role and RLS settings before fetch. No keys exposed. Screenshot ../outputs/bcm-scanner-deployed.png, tests ../outputs/bcm-baseline-sql-tests.png. User closed prior client tabs (sessions use sessionStorage). Opened login in tab12; client must sign in as cotivateapp@gmail.com before approved save of https://cotivate.com/ and first baseline scan can proceed. No real scan or saved Cotivate config yet. Deployment approved and complete; no need to ask deployment approval again. Work remains uncommitted.

## October 8: First live Cotivate baseline verified
User signed into client account; saved public https://cotivate.com/ settings (version 1), then successfully invoked deployed bcm-scan through Create baseline. Scan history showed Baseline saved at 2026-10-08 20:27:46 browser time, title Cotivate — Move forward, together, with actual relaunch homepage text. Full page reload retained settings and baseline; Create baseline disabled for that version and captured text remained readable in history. Screenshot ../outputs/bcm-live-baseline.png. This is a real retained baseline, not disposable test data. No comparison, findings, recurring jobs or legal analysis. 25 local checks and 15 hosted baseline SQL checks passed. User approval needed to commit this baseline phase; preserve unrelated Watch changes.


## Manual text comparisons — prepared October 8, pending hosted activation
User approved building the next manual scan’s comparison view. Migration `20261008000300_bcm_comparisons.sql` adds scan type and baseline link; the worker reuses the fixed Cotivate homepage fetch and only accepts comparisons tied to that client’s current settings baseline. Client history presents added/removed page text, unchanged results, time and captured text. Comparison is a deterministic text difference, not AI or a legal conclusion. Does not create a service request.

11 new local scanner/comparison checks plus existing settings/connection checks pass (27 total). The expanded hosted SQL suite is prepared but has not run. Comparison migration/function changes are not deployed and no second live scan was made. Ask approval to apply migration, run rollback tests, deploy the updated scanner, and run Cotivate’s second comparison against the retained baseline. Existing client pages continue to work with the previously deployed scanner until then.

## October 8: Manual comparison deployed and run
Supersedes the pending-activation note above. The user approved applying `20261008000300_bcm_comparisons.sql`, deploying the updated `bcm-scan` function, and running Cotivate's comparison. The migration and function were applied to project `omvkwiosonatswocbdgx`; the client completed a live manual comparison against the retained `https://cotivate.com/` baseline. History contains the baseline and comparison. The comparison reported 8 added and 1 removed text segments. This is source-text difference only, not brand detection, legal analysis, or a scheduled scan.

Local tests passed (27 scanner/BCM/connection checks before the final history-copy edit); latest `brand-monitor.js` syntax and diff-whitespace checks also passed. The hosted SQL Editor did not complete the full rollback test for the worker-only finalizer; it returned a role/scan-context error. A direct privilege check confirmed `authenticated` cannot execute the finalizer and `service_role` can. Do not describe the hosted full rollback suite as passed. Scan History copy now explains that scans are manual and text differences are not brand findings. Remaining work: make comparisons/history useful for identifying candidate branding changes, then build scheduling and safe expansion beyond the fixed Cotivate public homepage pilot in separately reviewed phases.
