# Watch compatibility after portal consolidation

October 17, 2026. Local implementation and Test package prepared with owner approval. No hosted migration, function/permission change, worker run or deployment has been performed. See README.md for the executable packages, local verification and pending hosted checks.

## Observed Test state

A read-only transaction in Venture Branding BCM Test (`imvkhicfmidzbzsbhkzs`, system identifier `7692130048193495360`) confirmed:

- Cotivate fictional client `b9100000-0000-0000-0000-000000000001` has its Watch service binding assigned to legacy engagement `f1700000-0000-0000-0000-000000000003`.
- The returning plus-address user has an accepted active grant to engagement `63dfa7ef-095e-4004-b62b-65cf8f3a79d7`. `portal_actor_scope` confirms Watch entitlement there, but not for the old binding.
- Cotivate has **no Watch settings row** and **no Watch settings/findings/run scope rows**. The attorney page's paused/empty display is the snapshot's default, not a persisted configuration.
- Installed function fingerprints: `watch_access(uuid)` = `7cd89c83d3cebb8b2533f697111dea3a`; `vb_watch_snapshot(uuid)` = `e490907f92a9a783b3154fb69bf70724`; `vb_watch_save(uuid,integer,uuid[],boolean)` = `b0d77e308ab93325ca98b764cbe081f7`.

The denial is expected from the installed code: `watch_access` calls `portal_require_service`, which checks the single client/service binding. It happens before the snapshot's per-record filtering.

## Why a permission-only patch is insufficient

`watch_settings` has `client_id` as its primary key. Saving, worker eligibility, settings/run scope inheritance, and engagement closure all depend on that singleton configuration/binding. Removing the snapshot guard alone would reveal an empty screen but leave saving broken. Moving the binding to the newest engagement would shift the failure to other authorized users and could later reassign the meaning of retained state. Expanding all service helpers would change unrelated products and could expose closed or unrelated records.

Do not apply any of those shortcuts. The existing legacy binding must not become the current user's entitlement, nor should an invitation silently grant access to the old engagement.

## Approved focused implementation scope

Support separate Watch configurations for the existing authorization scopes, behind the existing Watch interface. This is an internal Watch compatibility change, not a new engagement/matter-management feature or a Client tier.

1. Separate permission to open Watch from permission to read or modify an existing configuration. An active authorized Client can open Watch and start setup for their own active scope. An empty portfolio gets a truthful empty state without pretending monitoring is running.
2. Store each scoped configuration with an immutable identity and its existing legal-client/engagement scope. Preserve existing configuration values and their original scope during migration. Do not move marks, findings, check history, or client grants. Unconverted legacy clients retain their existing behavior.
3. Resolve authorized setup targets on the server. The browser cannot invent a scope or rebind an existing configuration. Selected marks must be authorized word marks for that configuration. If multiple scopes are available, expose an explicit authorized selection; never silently select the newest engagement. Keep any necessary control within Watch, using approved display labels rather than database IDs or internal matter-management terminology.
4. Update Watch snapshot/save contracts and the connected Watch interface together. Return only authorized configurations, published findings, and their check histories. Use configuration identity plus version for concurrent saves; prevent any partial save if a submitted selection contains an unauthorized mark. Preserve staff MFA and private-note projection boundaries.
5. Update only Watch worker/configuration selection and closure handling to process the correct active configuration. Closing A stops A and retains its records; B's authorized configuration continues. Existing source ingestion, matching rules, processing limits, Production workflow/release pin, and paid-research settings remain unchanged. Preserve the current client-level ten-mark selection cap unless a separate product decision changes it; multiple configurations must not silently multiply the cap or remove another scope's choices.
6. Prepare a guarded Test-only migration, rollback rehearsal, installed checks, and postcheck. Compare installed function definitions first and stop on unreviewed drift. Retain the original combined branch as the review checkpoint; do not merge to `tg`, push, or apply the package without the appropriate next approval.

## Required verification before requesting database application

Use synthetic fixtures with rollback and no external workers, email, ingestion or research calls:

- Returning Client with an unrelated legacy binding and no settings can load its authorized empty setup and save a paused selection for an authorized mark.
- Two active scopes for the same legal client can save independently without overwriting each other's settings; the original user retains authorized access.
- A user with both grants can view both authorized sets. A user with only B sees no A configuration, selected mark IDs, history, unpublished evidence, or private notes.
- Person and company legal clients remain separate even when one login is granted access to both.
- Member, anonymous, suspended, revoked, unaccepted and closed-only identities cannot obtain or modify Client Watch state through direct RPCs.
- Cross-client, forged configuration identity, unauthorized mark, mixed-scope selection, stale version, concurrent first-save, closure-versus-save, and closure-versus-worker scenarios fail safely. Concurrent behavior needs independent-session verification; a single rollback script is insufficient evidence.
- Closing A retains its data, disables only its schedule, hides its records from the Client, and leaves B functional; final closure routes to Member and preserves private Kit data.
- MFA-protected attorney review and approved-publication/withdrawal behavior remain intact. No private notes reach the Client response.
- Migrated settings retain original scope, versions and enabled/scheduled values. Missing or ambiguous scope metadata aborts migration instead of guessing.
- No duplicate processing for an unchanged source/configuration; incomplete source handling and bounded check budgets remain enforced across configurations.
- Client-wide mark limit remains ten without leaking hidden selections or allowing one scope to overwrite another. Worker dispatch remains bounded; no duplicate schedules appear after migration.
- Existing Watch unit/worker tests and portal access/lifecycle regression checks pass. Read-only postcheck confirms unchanged research flags, user/grant counts, private Kit fingerprints and no retained fixtures.

## Approval boundary

Local implementation, guarded rehearsal and conditional Test application were approved. The package is now installed in BCM Test; both suites passed before and after application and preservation checks matched. See hosted-verification.json. Obtain action-time confirmation for any further database permission changes through the browser. Independent-session concurrency verification was subsequently approved and passed in the separate watch-concurrency package; any commit/push/default-branch merge remains a separate decision.

If implementation reveals that other services need the same redesign, report that as separate follow-up work. Do not broaden this Watch fix into a database audit/refactoring project.
