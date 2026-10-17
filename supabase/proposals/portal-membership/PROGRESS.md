# Account-backed Legal Launch Kit progress — October 16, 2026

Implemented and applied only to Venture Branding BCM Test (`imvkhicfmidzbzsbhkzs`, guarded system identifier `7692130048193495360`). Source changes are not yet committed. Production configuration and database remain unchanged.

## Behavior

- The five implemented Formation milestones load and save checkmarks/planning notes from `vb_member_progress`, scoped to the verified Member's company ID. The current design, neon map and motion are unchanged. Other categories remain previews.
- Saved progress is read from the account rather than browser storage; another signed-in device can load the same rows. Actual second-device login has not been exercised. A fresh store/session load is covered in local tests and fresh authenticated page reload is verified live.
- No automatic upload/import of old browser profiles or notes. The existing signed-in user's namespaced browser progress, when present, gets an explicit import button. Import preserves checked account tasks and existing account notes. Generic/shared prototype keys and other-origin data are never automatically imported; old browser data is retained.
- Visible Saving/Saved/error states reflect the server result. Rapid note edits coalesce; writes are serialized, failed work remains pending for explicit retry, and failed initial loads cannot overwrite online records with blank defaults. Navigation warns only when actual pending changes exist.
- The owner-only `vb_save_member_progress` operation validates shape and note length, compares saved revisions, and rejects stale overwrites. Identical lost-response retries are idempotent. Direct table writes were removed to ensure callers use checked revisions. This preserves and narrows the existing owner-only scope; it does not grant access to another Member or to client tools.
- Account reset persists empty checklists/notes only after the user confirms it. Stale-tab conflicts require explicit reload before writing. No automatic conflict overwrite.
- Member/Alumni ownership and suspension checks remain enforced. Staff do not inherit access to Member planning notes. There is no attorney inbox, notification, client grant, paid research or legal-record mutation.

## Applied package and validation

`07-test-progress.sql` applied successfully. `08-test-progress-access.sql` returned **15 passed / all_passed=true**, then rolled back all synthetic fixtures. Checks cover persistence, cross-owner isolation, anonymous/suspended denial, direct-write bypass denial, schema validation, stale revisions, idempotent retries and reset. Do not rerun create-function package 07 against the initialized schema.

**34 focused local tests passed**, including eight progress-store tests and existing account/map/company behavior. New tests cover fresh account load, latest-note coalescing, retry, stale devices, failed-load write prevention, scope rejection, explicit import merge, and persisted reset.

Live signed-in MZP117 LLC Test check: the Business structure checklist started empty and its note blank. Checked one task and entered a temporary test note; waited for Saved to your account, performed full page reload, and observed the same checkmark and note. Unchecked that task and cleared the temporary note, waited for Saved, reloaded, and confirmed the original empty state restored. No user notes were overwritten or imported. A blank saved progress row may remain, representing the same restored state. User remained signed in.

Screenshot: parent outputs/llk-account-progress-reload.jpg shows the temporary verification state before cleanup. The new `09-disable-test-progress.sql` fallback is prepared, not applied; it stops writes while retaining all data. Source fingerprints and preservation result are in progress-verification-2026-10-16.json.

## Historical tests and limits

The original foundation package 02 tests predated the checked-write operation and include a direct owner update. After package 07, that direct update is intentionally denied. Keep the original file and its historical source hash as evidence of what was executed; package 08 is the current progress-write regression suite. Broader Member/engagement behavior remains as documented in REGISTRATION.md and README.md. This phase does not cut over legacy client records/workers or enable Production registration.
