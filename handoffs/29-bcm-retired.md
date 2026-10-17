# BCM retired — October 11, 2026

Approved single retirement phase completed. No data, users, keys, tables, functions, or original scanning implementation were deleted. No commit, push, installation, or new external service.

## Hosted state
Production omvkwiosonatswocbdgx: scheduler readiness false; vb-bcm-due-tick preserved with active=false. Existing setup (1), scans (3), and schedule (1) preserved. Digest job remains active and unchanged. Both bcm-scan and bcm-schedule deployed as no-op HTTP 410 retirement endpoints. Verified actual hosted POST responses, requests 26 and 27.

Test imvkhicfmidzbzsbhkzs: readiness false; no active BCM jobs. Existing zero settings/scans/schedules preserved; Test Digest job unchanged. Both workers deployed as retirement endpoints. Scheduled request 21 returned 410. Unauthenticated manual request 20 was rejected by its existing JWT gateway (401); authenticated manual path was not separately exercised this phase. Retirement source independently tested to return 410 before database or website access.

Cotivate Development was not resumed or changed. Gateway authentication settings were not changed. Saved schedule enablement/preferences were not rewritten: global readiness and inactive cron prevent work, and deployed retirement endpoints reject requests independently.

## Portal
Local portal at port 8000 reads Production records. BCM card removed from VB Agents. Old BCM route renders retirement notice without scanner import or controls. Brand Map no longer queries monitor tables and shows saved trademark records only; counts, selection, links, paging and zoom retained. Monitor activity/findings panels hidden. BCM digest selection removed and old digest BCM items display as historical text instead of active monitor links; saved preferences/messages retained. Existing digest backend remains in place, so saved historical BCM results may still appear in old messages or otherwise eligible historical digests; no new scans are generated.

Portal has no confirmed public deployment address. UI retirement is applied to the existing local portal and repository; hosted retirement is deployed to Production and Test. HTML entry points have updated client script versions, including Use History's shared entry script only. Parallel feature implementations were preserved.

## Validation
14 focused tests passed (Brand Map isolation, selection, paging, portal gate and retired worker no-access checks). Modified JS files pass syntax checks. Actual signed-in portal checked: Agents menu, Brand Map and trademark detail selection, Portfolio, Use History, Digest controls, and old BCM route. No settings were saved and no evidence was uploaded during these checks.

## Preservation and restoration
The before/ directory contains exact local versions before retirement edits; all four *-before.ts files are actual hosted source backups captured before replacement. Existing scanner source, configuration, migrations, tests, and prior output packages remain in place. Those older packages are historical ACTIVE-SCANNER versions: do not deploy them casually.

Restoration requires a separate approved phase: restore relevant local UI edits from before/ without overwriting subsequent parallel changes; remove the retirement guards in handlers; deploy the appropriate backed-up original worker versions; verify current keys/settings/access; only then explicitly re-enable scheduler readiness and the preserved Production cron job via cron.alter_job. Test had no BCM cron job before retirement. Do not automatically enable any client schedule. No key changes are required for retirement.

Next suggested action: review and approve a scoped commit/push preserving parallel changes. Nothing has been staged or committed.
