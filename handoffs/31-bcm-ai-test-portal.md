# BCM — existing portal integration in Test

Completed October 11, 2026. Approved scope: client settings/reviewed updates and private attorney queue in the existing portal, Test only.

## Working

- Existing client portal: VB Agents has a Test-only BCM entry. brand-monitor.html now shows saved website/categories/weekly-monthly settings, a separate paused monitoring panel, reviewed updates and research history when explicitly configured for Test.
- Existing attorney workspace: each active Test client has a Review brand discoveries link. Private queue includes evidence, notes, approval, dismissal/withdrawal and same-asset linking; normal staff/MFA and database policies still apply.
- Client preferences saved through the normal portal. Five earlier research runs remained visible. No new paid calls ran.
- Actual normal Test attorney sign-in/MFA completed. Approved the existing temporary Harvey II observation through the integrated queue with a TEST ONLY note. Actual integrated client page displayed the approved snapshot without notes or raw findings. Withdrew it through the integrated staff UI; client refresh showed no reviewed updates. No active Test publication remains from this check; original evidence and review/audit history retained. This completes the earlier browser-withdrawal limitation.
- Region loading, retry, dispose/late response protection and clearing records on failed protected actions are included. Shared dropdown/button spacing remains in use. Local screenshots checked at the current compact browser width.
- Seven new meaningful checks passed for Test/Production separation, session-key isolation, local-only Test auth, stale response disposal, no raw client observations, paid controls disabled even if backend reports ready, and clearing private records on failed protected actions. Existing auth, connection, worker and retirement checks also passed: 40 unique focused checks in total.

## Configuration and limits

Production auth/config.js unchanged; BCM remains retired for the normal Production configuration. Test is explicit (environment=bcm-test and exact Test project URL), local-only, and uses separate Test session keys. The local server serves a browser-safe Test configuration on port8885, never edits Production config, hides dotfiles, and adds a prominent Test banner. Uses installed Python and existing vendored Supabase client; nothing installed. Paid controls are disabled by the local config in addition to the existing database pause flags.

No new schema, worker deployment, account access changes, scheduling activation, commit or push in this phase. Saving Test preferences and temporary review/withdrawal records were the only Test database writes. Brand Map restoration/connection and Production activation remain outside this phase. Findings are hosted research observations, not complete snapshots or proof of a new launch.

## Review

Client: http://127.0.0.1:8885/brand-monitor.html
Attorney: http://127.0.0.1:8885/attorney.html#bcm-b9100000-0000-0000-0000-000000000001
Entrances: http://127.0.0.1:8885/tools/bcm-ai-portal-test/

Start/restart with the installed Python: tools/bcm-ai-portal-server.py from the main repo. Loopback8885 only. Current server session49585. Existing private passwords/authenticator remain user-entered.

Next proposed step: separately approved commit/push of completed BCM work, preserving unrelated parallel work. No Production deployment implied.

Implementation: portal/assets/bcm-ai.js + bcm-ai.css; Test branches in portal/assets/client.js and attorney/assets/workspace.js; explicit Test-only support in auth/flow.mjs, connection.mjs, auth.js; loopback preview tools/bcm-ai-portal-server.py; regression tools/bcm-ai-portal.test.mjs. Production auth/config.js untouched.
