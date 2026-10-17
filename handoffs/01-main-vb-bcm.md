# Main Venture Branding development handoff

Updated October 9, 2026. Read this first when continuing the main VB work. This note supplies context; the user's next request supplies authorization. BCM remains the active development task. The three new feature documents are separate proposed workstreams and must not enlarge BCM's agreed scope.

## Working with Mario

- Mario is nontechnical. Explain what the user will be able to do, what is actually connected, and what remains in plain language.
- End each response with one concrete next step and a suitable model/effort recommendation. Ask approval before a new phase or major code, infrastructure, account, security, deployment, or computer change. Complete already authorized work without repeatedly requesting approval for routine details.
- Be precise about remaining work. Mario dislikes an expanding checklist and repeated setup/testing cycles. State a bounded completion criterion and stick to it.
- Keep interface copy short. Avoid boxes within boxes, implementation explanations, and unnecessary demo labels. Fixtures must still remain separate from genuine client records.
- Commit only when approved. Mario normally pushes using GitHub Desktop, then asks us to verify. Do not infer deployment or push permission from design approval.
- Do not start other agents unless explicitly authorized. Four handoff files were requested; no parallel feature implementation has been authorized by creating these files.

## Efficient startup

1. Check branch, working tree, and applicable repository instructions. Read this note and only the files needed for the next task.
2. Use `BCM.md` for implementation detail. `HANDOFF.md` contains historical notes; newer conversation checkpoints and this dated note supersede conflicting older claims.
3. Do not audit the whole repository, compare old design variants, reread the private business memo, or explore other projects merely to get up to speed.

## Repository and architecture

- GitHub: https://github.com/mcosey/Venture-Branding
- Checkout: `/Users/mcosey/Documents/Codex/2026-09-27/venture-branding-is-a-project-i-2/venture-branding`
- Branch observed when preparing this note: `codex/attorney-workspace`.
- HEAD observed: `4d14b2d` — Refine Brand Change Monitor findings. Verify it on arrival.
- Plain HTML, CSS, and JavaScript. V8 / Interactive is the canonical public-site design. Preserve navy/coral/cream, typography, and logo. Leave other versions and their selector alone.
- Local preview: `http://127.0.0.1:8000/`. Reuse the running static server when available.
- Supabase now supplies authentication, client/staff access, client/mark records, invitations, and BCM persistence. The earlier frontend-only restriction was explicitly expanded for these phases.
- Client access is invitation-only and tenant-scoped; staff requires approved membership and MFA. Separate login URLs alone do not enforce access.
- Attorney controls client/mark records and initiates USPTO import. Clients configure permitted VB Agents preferences. Do not let client inputs change their membership or staff role.
- Services exclude enforcement and litigation. A request or scheduled call does not automatically create or expand representation. Clio/QuickBooks integrations and hosting work remain deferred.

## Main pages and supporting files

- `v8.html`: public site; `portal.html`: client dashboard; `portfolio.html`: legal inventory.
- `automations.html`: labeled **VB Agents** in the interface; retain existing routes unless a change is approved.
- `brand-monitor.html`, `portal/assets/brand-monitor.js`, `portal/assets/brand-monitor.css`: BCM setup, findings, scan history.
- `auth/bcm.mjs`: validation, saved settings, scans, comparisons, candidate cues.
- `supabase/functions/bcm-scan/{index.ts,handler.mjs,record.mjs}`: hosted scanner and safe public fetching.
- `supabase/migrations/20261008000100_bcm_settings.sql`, `20261008000200_bcm_baseline.sql`, `20261008000300_bcm_comparisons.sql`, `20261009000100_bcm_configured_public_pages.sql`: reproducible BCM schema changes.
- `supabase/tests/database/bcm_settings.test.sql` and `bcm_baseline.test.sql`: rollback database suites.
- `tools/bcm.test.mjs`, `tools/bcm-scan.test.mjs`: local checks. `tools/bundle-bcm-dashboard.mjs`: reproducible dashboard deployment bundle.
- `auth/connection.mjs`, `portal/assets/client.js`, `attorney/assets/workspace.js`: shared access/loading and portal rendering.

## BCM purpose and current boundaries

BCM is a client-facing tool configured in VB Agents. It checks a client's own public website/product for branding cues such as named product/feature launches, renames, slogans, and textual rebrand announcements. Findings can prompt discussion with the attorney. They do not make legal conclusions or automatically create an engagement.

Current UI deliberately hides routine copy differences. A heading alone is insufficient to create an alert. Findings without an identified cue show a short empty state. Scan history supplies the record of checks; it should not overwhelm founders with arbitrary added/removed text.

Production has a retained Cotivate public-homepage baseline and a manual comparison. The saved comparison had 8 added and 1 removed text segments but no qualifying branding cue. Preserve that real baseline. Current candidate detection is deterministic text rules, not an AI/legal analysis engine.

Configured public-page work is prepared locally and applied to BCM Test. The safe fetcher uses saved URLs and exclusions, bounded downloads/text/page counts, checked public DNS addresses pinned for connection, original-host TLS verification, and rejection of redirects/private targets. Preserve these protections when deploying. Dedicated-account login, credential storage, rendered browser crawling, recurring scheduling, logo-image analysis, and notifications are outside this current verification phase; do not add them as surprise steps.

## Exact stopping point and evidence

- **Settings/access Step 1 passed:** on October 9 the 37-assertion `bcm_settings.test.sql` suite ran in BCM Test with `finish(true)` followed by `rollback;`. It returned `1..37` without an error. `finish(true)` raises on failed assertions. This verifies settings isolation, rejected unsafe/secret fields, scoped writes, stale updates, staff MFA, and disabled/archived access at the database layer.
- A reporting experiment using nonexistent `results()` failed; the final successful run used `finish(true)` and rollback. Do not mistake that reporting error for a failing security assertion.
- Prior targeted hosted scanner/access checks: 9 passed, per `BCM.md`. Prior local JavaScript checks: 74 passed, per that checkpoint; not rerun while creating these handoffs.
- **Still unresolved:** the full `bcm_baseline.test.sql` regression previously reported two failures. Passing the 37 settings tests does not resolve or replace those scan/finalization failures.
- **Not done:** configured-page scanner deployment to BCM Test and a hosted end-to-end HTTP scan. Do not report the new scanner as deployed or fully validated.
- No code, migrations, or Production records were modified in the latest 37-test verification turn.

## Supabase project boundaries and last observed states

- VB Production: `omvkwiosonatswocbdgx`. Untouched by the latest test cycle.
- Venture Branding BCM Test: `imvkhicfmidzbzsbhkzs`. Confirmed **paused** after the latest checks.
- Cotivate Development: `yjhzhflyuxcxugfgspby`. Resume was requested during cleanup; its last observed status was **Coming up**, with pause controls disabled. It was not confirmed online or paused afterward.
- Mario subsequently instructed: **leave Cotivate Development paused until the BCM project switching is finished**. Once its controls are available, honor that instruction; do not repeatedly resume it after each test. No background task was created to do this automatically.
- Do not touch FlowRata projects or any other Supabase project. Cotivate LLC as a client within VB is distinct from Cotivate's separate Supabase application project.
- Free-project limits prompted the temporary pause/resume workflow. Verify actual states once before an approved hosted step; avoid endless polling. Never claim a transition finished without evidence.

## Next bounded step

The next proposed phase is the **hosted scanner check in BCM Test**. It has not been started since Mario asked for these handoffs. Present its scope before acting: keep Cotivate Development paused, resume BCM Test if capacity permits, resolve/verify the remaining full scanner database regression, deploy the prepared scanner only to BCM Test, then exercise a controlled client-scoped baseline/comparison and unauthorized/cross-client rejection. Temporary records must be identified and cleaned up; no real Production baseline is disposable.

Completion means the remaining scanner database checks are green and the hosted function demonstrates that it scans allowed public sources and saves/returns results only to the correct client. Explain any genuine blocker instead of adding unrelated features. Do not call all BCM capabilities complete merely because this verification phase passes. Reconcile any broader completion plan with the user's approved scope before expanding it.

Suggested starting prompt: “Read handoffs/01-main-vb-bcm.md. Tell me the exact scope of the next hosted scanner check and any unresolved prerequisites, in plain language. Continue only within the approved BCM plan.”

## Working tree protection

At handoff preparation, BCM changes include staged and unstaged files, and Watch UI changes are also pending (`watch.html`, `watch-finding.html`, `portal/assets/watch-*.js/css`, plus `portal/assets/client.js`). Preserve all existing work. Do not reset, stash, stage everything, or commit unrelated files. These four new handoff notes are documentation only and are not committed automatically.
