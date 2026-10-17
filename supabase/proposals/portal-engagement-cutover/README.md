# Engagement cutover — Test preparation

October 16, 2026, `codex/legal-launch-kit`. Owner approved starting the Test integration after progress checkpoint `499af80`. **The approved four-client Test mapping is applied and verified. Engagement enforcement is now applied and verified in Test; no worker deployment or Production action has occurred.**

Actual enforcement is documented in `ENFORCEMENT.md`. The combined 05–06 migration is applied; 54 rehearsal checks and 54 installed checks passed. Package 07 fixtures rolled back, 09 preservation checks passed, and 08 remains an unapplied fail-closed fallback. The 01 mapping below remains applied. Historical staging results below predate this enforcement.

## Observed baseline

Executed `00-test-inventory.sql` read-only in `imvkhicfmidzbzsbhkzs`; returned system identifier `7692130048193495360`. Full observed result is saved outside Git in the parent chat `outputs/engagement-test-inventory-2026-10-16.json`. This is hosted schema evidence, not a claim that the cutover has passed.

| Existing fictional Test client | ID | Marks | Active memberships | Engagements |
| --- | --- | ---: | ---: | ---: |
| WATCH TEST — Fictional Match Client | `7126efcc-9034-4cfc-964f-c2694d315526` | 2 | 1 | 0 |
| WATCH TEST — Fictional Isolation Client | `b8566912-9e75-45c0-a85c-a7e2a3075f85` | 1 | 1 | 0 |
| Cotivate — FICTIONAL FILING TEST | `b9100000-0000-0000-0000-000000000001` | 1 | 1 | 0 |
| Mithril Zeppelin — FICTIONAL FILING TEST | `b9100000-0000-0000-0000-000000000002` | 1 | 1 | 0 |

No existing engagement scope can be inferred: the engagement table is empty. Proposed dry-run mapping is one explicitly fictional Test engagement per selected client, with its current marks placed under a Test matter and its existing Test user linked through protected administration. Owner explicitly approved all four fictional clients. This mapping is now applied. Do not equate the new Mithril Member account with the older Mithril legal-client record by name or email. Use existing protected membership user IDs for this proposed legacy mapping; first-time Member-to-client relationships require their own explicit invitation/acceptance.

## Why routing alone cannot complete the change

The observed client role and legacy helper still depend on `client_memberships`. The new `vb_portal_entry` intentionally prioritizes this old role, so an engagement closure alone currently does not revoke legacy tools. Replacing the helper with “any active engagement for this client” is insufficient: it would expose closed engagement records whenever a second engagement remains active for that client.

Observed legacy paths requiring coordinated changes:

| Boundary | Required scope |
| --- | --- |
| Marks and portfolio | Matter -> engagement; active grant and portfolio permission |
| Evidence metadata, uploads, removal and private object downloads | Authorized mark/matter plus use-history permission; worker finish must recheck the same scope |
| Maintenance publications | Authorized mark/matter and maintenance permission |
| BCM settings, scans, observations, publications and schedules | Explicit engagement binding, BCM permission, history segregation, reservation and completion rechecks |
| Watch private settings/findings/runs and access RPC | Authorized engagement and selected marks; scheduler and publication paths must obey closure |
| Digest preferences and inbox snapshots | Engagement-specific preferences and source items; an aggregate client snapshot cannot leak closed matter content |
| Client header/list and sign-in | Derive accessible clients from authorized scopes; final closure returns to Member functionality |
| Attorney records | Retain MFA staff access to closed records; closure must not delete legal records |

The hosted inventory contains 44 relevant tables and 21 functions directly referring to legacy/new access helpers. This count is an inventory result, not an exhaustive security-boundary count: callers of these functions, worker-only functions, storage policies, and functions using intermediate helpers also need inspection. Test currently has the Watch private tables but does not have `vb_brand_assets`, `vb_brand_relationships`, or `vb_brand_legal_links`; do not pretend the separate editable Brand Map proposal is deployed here. The client map in this branch consumes marks and reviewed BCM publications.

## Bounded implementation sequence

1. COMPLETED: owner selected all four fictional legacy clients for the dry run. Preserve their IDs, existing membership identities, marks and evidence. Record an explicit mapping before seeding active engagements. Do not backfill real Production relationships or manufacture legal dates.
2. Add explicit matter/engagement scope at record roots, with same-client validation and protected administrative writes. Children inherit the root's scope; historical records retain it after closure. Shared client services need an explicit engagement binding rather than opportunistically inheriting whichever engagement remains active. Multiple engagements for a single client must work without one changing the other's scope.
3. Add protected MFA attorney lifecycle operations and first-relationship acceptance. Existing Members reuse their Auth identity; signup and company editing grant no representation access. A later engagement in an already accepted relationship may be authorized by staff. Use revision checks and a common lock order for closure, grants and worker reservation/completion.
4. Update record RLS, security-definer RPCs, object access, service workers and scheduled work together for the selected Test clients. Keep existing clients on legacy behavior until their mapping and affected paths are ready. Do not add a permissive legacy OR condition for a client after it has been cut over. Do not silently disable everyone while awaiting a mapping.
5. Connect portal routing and the shared Member/Client shell to the new scope. A global Client badge never authorizes an individual record. Preserve Member planning data independently and keep the Kit's visual design unchanged.
6. Run actual rollback-based database checks and authenticated walkthroughs. At minimum: Member direct-request denial; invited versus accepted grant; closed A/active B across clients and within the same client; final closure and reopening/new engagement; suspended account without terminated engagement; staff MFA and retained closed records; cross-scope evidence and digest snapshots; queued/in-flight services after closure; unrelated clients unchanged. Do not label a source-only mock as proof of RLS or worker enforcement.

## Release and fallback

Prepare a narrowly guarded Test migration and non-destructive disable path, and compare the legacy fingerprints before and after authorized mapping changes. Retain existing permission definitions for rollback. A fallback must not re-expose closed records: disable cutover entry points/services if permissions cannot be restored safely. No cascade deletion of legal records. Account archive and engagement closure remain independent.

Production, public signup settings, paid research, and scheduled-job activation are outside this phase. Do not commit, merge or push without owner approval. Future agents should continue from this directory and the persistent branch note; the read-only inventory is complete and should not be repeated without a reason such as intervening schema changes.

## Applied mapping checkpoint — October 16, 2026

Owner explicitly answered “Yes, use the four fictional clients.” Applied `01-stage-test-mapping.sql` only to the named Test project after a successful rollback rehearsal. Result: **4 engagements, 4 matters, 4 migrated existing-user grants, 32 tool entitlements and 111 mapped records** (including all 5 marks). The tool entitlements do not turn on preferences, jobs, Watch, paid research or any scheduler. The existing free Member is not linked to the older similarly named client.

The mapping tables are private, RLS-enabled and have no `anon`/`authenticated` grants. Cross-client engagement/matter bindings are rejected by composite foreign keys. Each source row is identified by its real PostgreSQL primary key (including composite keys) and a fingerprint; original source rows are untouched. This is a **preparatory snapshot**, not a new authorization mechanism or automatically maintained ledger. Rows added after this checkpoint must be reconciled before cutover. Filing revisions/reviews inherit their existing draft root later; global Watch source datasets are not client records.

The migration verified **27 snapshots** of existing source data and legacy access-function definitions remained identical. Hosted `02-test-mapping-checks.sql` returned **66 passed checks, all_passed=true** both in rehearsal and after application. It tested actual database roles for mapped-user engagement/matter visibility, a second engagement for the same client, closure/final closure, Member isolation, suspension and staff MFA/retained records. All lifecycle edits and the extra same-client engagement/matter rolled back. **These checks intentionally do not assert legacy marks/services are closed off:** the original access paths still use legacy membership and remain to be converted.

Read-only `03-mapping-postcheck.sql` confirmed 4 active mapped engagements, 111 mapped records, 5 mapped marks, both mapping tables protected by RLS, original client/membership fingerprints unchanged, zero retained rollback engagement/matter, no client grant for the new free Member, and `legacy_cutover_enabled=false`. Package `04-disable-staged-test-grants.sql` is a prepared, unapplied non-destructive fallback for this staging checkpoint. It retains records/accounts and deliberately does not alter legacy access. Do not use it as a post-cutover rollback.

Evidence in parent chat outputs: `engagement-test-mapping-applied.jpg`, `engagement-test-mapping-checks.jpg`, `engagement-test-mapping-postcheck.json`. Machine-readable repository evidence: `mapping-verification-2026-10-16.json`. Source remains uncommitted. No legacy access rule replacement, public invitation workflow, actual attorney lifecycle UI, worker change, Production mutation, commit, push or merge is included in this mapping checkpoint.
