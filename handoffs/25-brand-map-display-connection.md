# Brand Map: saved monitor display connection

2026-10-10. Branch: codex/attorney-workspace. Local implementation only; no commit, push, deployment, installation, database/account changes, or scanner runs.

## Approved scope
Connect existing BCM saved findings/activity to the approved client homepage as a display-only view, alongside existing legal trademark records. Preserve parallel work. Larger editable IP-asset backend and sign-in write-test plan remain outside this phase; do not resume them from earlier handoffs without a new explicit request.

## Implemented
- portal/assets/brand-map-bcm.mjs: existing client access check, read-only client-scoped query of 10 latest vb_bcm_scans; retrieves referenced older baselines with the same client filter. Reuses findBcmCandidates from auth/bcm.mjs unchanged.
- brand-map.js: dashed possible finding cards selectable for observed text, reason, source page, and date; links to existing BCM page. Recent scan activity, loading/empty/error/incomplete states. Legal record counts/status remain independent. Existing paging, zoom, mobile cards preserved.
- client.js: asynchronous display guarded against late results after client switching, sign-out, hidden tab, refresh, or Messages. Sign-out clears cached records and rendered content. Other page renderers preserved.
- Small appended CSS rules and portal.html cache version updates only.

## Verification
43 local checks passed across tools/brand-map.test.mjs, bcm.test.mjs, connection.test.mjs, auth.test.mjs, and monitor-loading.test.mjs. Includes read scoping, older baseline retrieval, foreign-client exclusion, duplicate findings, no signed-out queries, delayed client switch/sign-out/tab hiding, factual legal counts, text escaping, and failed loads retaining legal records.
Browser checked with fictional data at 1440px desktop, 1280px laptop, and 390px phone. No horizontal page overflow. Finding selection/source details, mobile back-to-map, empty/error states, and client switching checked. No browser errors observed.

## Limits and next approval
No live signed-in database/RLS verification in this phase. Monitor findings are unconfirmed changes from the latest 10 scans, not a permanent or complete inventory; no actual logo images, legal protection, ownership, or parent/sub-brand relationships inferred. Watch fixtures/use evidence not integrated. Current saved Cotivate comparison reportedly has no specific branding cue; a correct empty finding display is expected, not fabricated assets.
Recommended next phase, requiring approval: a read-only signed-in check in BCM Test using existing test accounts and saved data. No new accounts, scans, writes, permission changes, or deployment. If prerequisites are missing, report them rather than expanding scope.

Fictional offline review: /Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/outputs/brand-map-bcm-preview/review.html
Screenshot proof: same directory desktop.png and mobile.png. Review is a self-contained copy of current renderer/model and existing detection rules; no authentication configuration or connection calls. Preview navigation is inert. No real client data included.
