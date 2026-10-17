# Test registration and sign-in integration — October 16, 2026

## Current status

Source implementation connected to Test; **30 local checks and all 19 hosted onboarding checks passed**. `05-test-onboarding.sql` applied successfully and the exact Test callback was saved with explicit user confirmation. A real private email/password signup and email-delivery walkthrough is still pending the user.

## Scope

- Isolated preview: `http://127.0.0.1:8893/signup.html`, started with `python3 tools/bcm-ai-portal-server.py --port 8893`. The server uses only existing installed Python and vendored Supabase SDK. Never replaces the normal Production configuration or other preview processes.
- Browser-safe Test config alone enables registration. Source `auth/config.js` remains Production configuration and does not enable Member registration. Wrong project, Production, and non-loopback hosts fail closed.
- Test Auth settings observed read-only: new email signup ALREADY enabled, Confirm email enabled, anonymous signup disabled. Do not assert that hosted Test signup was disabled based on stale local config templates. No setting has been changed by this phase.
- Test Auth redirects observed: empty list, default Site URL `http://localhost:3000`. Add ONLY `http://127.0.0.1:8893/login.html`; preserve default URL and any other existing settings.
- `vb_onboard_test_member` requires an authenticated, email-confirmed non-staff identity, current notice and confirmation, and valid profile; atomically creates only the caller's Member account/profile/company. No legal-client match, membership, engagement grant, or finalized policy acceptance is created. Retrying is idempotent; suspended/archived accounts cannot reactivate through signup.
- A protected `portal_test_onboarding` table records a server-timestamped TEST acknowledgment with NULL Terms/Privacy versions. There is no finalized policy publication. Test signup wording does not assert acceptance of missing documents.
- `vb_portal_entry` derives routing from backend identity/access: existing legacy clients retain normal portal routing, Members enter Member home, and verified new users complete onboarding. New scoped engagement grants do not yet enable legacy client tools.
- SDK alone receives the entered password; the page clears password inputs after a submission. Pending company details use sessionStorage, are applied only to the matching verified email/current notice, and contain no password or final acceptance. A different browser requires reentering the details.
- Member pages verify identity and routing before reading account company data. Profile edits use the owner's RLS-protected table. Signed-in company-name display comes from the server; no automatic import of old browser profiles/notes.
- Legal Launch Kit visual design stays intact. Test checklist/planning progress remains browser-local, now namespaced by verified user ID to prevent cross-account mixing. Cross-device progress is not yet implemented. Existing preview progress is preserved in its old keys, never silently imported.
- Sign-in/MFA and staff entrance are preserved. Member sign-out clears the local Auth session. No Production calls/config changes, external installations, commits, merges, pushes, job activation, or real account creation by the agent.

## Application and verification after approval

1. Apply `05-test-onboarding.sql` ONLY in Test system `7692130048193495360`; create the guarded Test onboarding and routing functions, protected Test onboarding record table, and authenticated execution rights.
2. Run `06-test-onboarding-access.sql`; expect 19 passing checks and rolled-back synthetic users/data. Verify old client/membership fingerprints still match the baseline and no synthetic `f1660000-*` Auth users remain.
3. Add the single exact Test callback URL above; do not broaden to wildcards or disable verification.
4. Ask the user to create a real Test Member privately through the isolated signup page using an email they control. The user enters/submits their own password and opens their verification email; never ask for credentials/codes in chat. Do not create or change their credential through browser automation.
5. Verify Member landing, saved company name, refresh/sign-out/re-login, no legal-client access, and owner-only profile. If default Test email delivery rejects the chosen address, report the provider's real limitation; do not install/configure a mail service or disable email verification as a workaround.

## Workspace recovery

At the beginning of this phase, GitHub Desktop had switched this same checkout to `codex/watch-manual-test-publication` and preserved all 17 pending LLK/Member files in `stash@{0}` (`!!GitHub_Desktop<codex/legal-launch-kit>`). Restored `codex/legal-launch-kit` and applied that exact stash. The stash was deliberately kept as a recovery copy. No Watch edits were overwritten, no merge/commit performed. Some new files were restored staged by Desktop's saved state; do not infer commit approval.

## Applied and verified — October 16, 2026

The user explicitly approved the prepared functions, 19 checks and exact callback address. Applied package 05 successfully; package 06 returned `passed_checks=19`, `all_passed=true`. All synthetic fixtures rolled back. Verification returned Test system `7692130048193495360`, unchanged legacy client/membership fingerprints, zero synthetic `f1660000-*` Auth users, zero retained Test onboarding records, and zero finalized policy acceptances.

Saved exactly `http://127.0.0.1:8893/login.html` to the Test Auth allowlist. UI confirms Total URLs: 1. Site URL remains `http://localhost:3000`; email confirmation remains enabled and anonymous signup disabled (neither setting was changed). No Production changes. Test signup page returned HTTP 200 after application. Evidence saved in the parent chat outputs: `member-onboarding-test-checks.jpg` and `member-signup-test-callback-saved.jpg`.

Next required step is user-operated registration/password entry and email verification, then verifying real Member landing and company persistence. Do not claim the live signup/email roundtrip has passed yet. Source is uncommitted; no commit, merge, push, or public deployment was performed.

## Real Member walkthrough verified — October 16, 2026

Owner privately registered/verified the Mithril address and reported reaching Member home. Observed the signed-in Test page displaying MZP117 LLC, verified its persistence across a full reload, opened the Brand Map lock explanation, and opened the account-backed company profile without returning to acknowledgments. Read-only Test SQL confirmed email verified, account active, one Member profile, one matching company, one completed Test onboarding record, zero client memberships and zero engagement grants. Returned owner to Member home and preserved their session. No company edits, sign-out, credentials inspection, or access mutations performed during verification. Sign-out/re-login and cross-device progress were not independently verified. Screenshot: parent outputs/member-live-signup-verified.jpg. Current signup is functional in Test; Production registration remains disabled by the local feature guard.
