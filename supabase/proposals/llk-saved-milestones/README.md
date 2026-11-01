# Saved progress for Trademark Protection and Vibe Coding

Applied and verified October 31, 2026 after the owner’s action-time approval.
**Do not rerun the one-time update.** The owner requested working account
saving for both pages and made saving part of the normal LLK page workflow.

The browser now uses one milestone registry, renderer and account progress store
for all seven working milestones. Existing Formation task offsets, notes and
account revision handling are preserved. Trademark Protection has six tasks;
Vibe Coding Considerations has two. Both retain their existing links, expandable
context and resources. They gain the existing progress summary and save/retry/
conflict controls. No new planning-notes field or consultation CTA is added.

`01-apply.sql` targets only main Venture Branding. It requires the exact freshly
inspected save-function body hash, then replaces only its milestone allowlist to
add `considerations` and `trademarks`. The function OID, owner, ACL, definer/search
path, owner-only check, payload validation, revision checks, locking and identical
retry behavior stay unchanged. No table, RLS policy, permanent grant, credential,
account setting, worker or scheduled job is installed.

The same transaction runs 20 checks with two fictional Auth identities and two
fictional planning companies. Those fixtures are rolled back before the update
can commit. Checks cover both new milestone saves, unchecking, stale revisions,
identical retry, anonymous/cross-owner/suspended denial, direct-write denial,
input validation and the existing Formation save path. All checks and record/
permission fingerprint comparisons must succeed or the transaction fails.
Existing row fingerprints stay inside the database; only counts and success
indicators are returned. Temporary fixtures can advance existing audit sequence
counters even though their rows roll back. No email or Auth API is called.

`02-readonly-verification.sql` checks the resulting function hash, security
settings, grants, RLS and fixture absence without returning account contents.
`function-baselines.json` records the inspected body and exact intended result.
The package received action-time approval and was executed in the browser. The
first attempt was rejected at SQL parsing because the editor inserted it into
older text. No database change occurred on that attempt. After clearing the
editor, the exact prepared source completed successfully.

Local validation: 514 portal checks passed, including both new milestones’
fresh-session saves, unchecking/reset, retained retry work, stale-session denial,
explicit browser import, shared-renderer callbacks and server/registry ID parity.
The live transaction passed all 20 checks and preservation comparisons. Nine
independent metadata checks then passed. In the existing signed-in Client account,
both pages saved a temporary checkmark, retained it across a full reload, saved
unchecking, and reloaded the original all-unchecked state. No notes or Formation
checkmarks were changed. Two empty progress rows remain for the restored new
checklists. Actual second-device sign-in was not repeated.
The diagnostics integrity manifest was refreshed for the progress-store import.
No software installation, hosting, Test activation, Cotivate-project change,
external provider request or website publishing is included.
