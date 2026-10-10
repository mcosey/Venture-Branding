# Brand Map implementation blueprint

October 9, 2026. Mario approved the shared product rules and preparation of this blueprint. This document proposes implementation details; it does not authorize applying a migration, changing accounts, or deploying. No implementation changes were made in this phase.

## The bounded feature

Clients describe brand-related IP assets and the products, features, services, and websites that provide business context. They can add or edit an asset and propose or confirm its place in the map. An attorney can associate an asset with an existing legal trademark record.

The company stays the workspace grouping. Products and websites are context, not automatic claims of IP protection. The map shows business relationships and linked record facts separately. Portfolio remains the legal inventory.

The first version is manual. Requests, scheduling, uploads, evidence capture, monitoring feeds, AI, filing checks, legal recommendations, licensing, and multi-parent graphs are outside this build. Launch Review and Preflight need only compatible IDs later; they are not dependencies of this version.

## Proposed stored records

Use three new record types. Do not add client-editable business fields to `vb_marks`.

| Proposed record | Information retained | Editing authority |
| --- | --- | --- |
| `vb_brand_assets` | Stable ID, client ID, name, kind, short description, self-reported business use, version, identity revision, source kind, timestamps | Authorized client or MFA staff, through guarded saves |
| `vb_brand_relationships` | Stable ID, client ID, child asset, optional parent, proposed/confirmed state, version, confirmation actor/date | Authorized client or MFA staff; business confirmation is explicitly distinct from legal review |
| `vb_brand_legal_links` | Stable ID, client ID, asset, optional existing legal mark, version, reviewed asset identity revision, reviewed mark identity fingerprint, attorney/date | MFA staff only |

All new IDs are server-generated UUIDs. Client IDs, legal mark IDs, and asset IDs retain separate meanings.

Asset kinds: master brand, product, feature, service, sub-brand, logo, slogan, website, or not specified. Name: 1–200 trimmed characters. Description: up to 2,000 characters. Business use: planned, in use, inactive, or not specified. Store text as text and render safely; no HTML or automated URL fetching.

Each child has at most one current relationship slot. No parent means a root-level asset. Assigning a parent sets the relationship to proposed; confirmation applies only to that exact relationship version. Clearing a parent clears its state and confirmation without deleting history. Enforce same-client endpoints, no self-parenting, and no cycles, including proposed edges.

Each asset has at most one current legal-link slot. Several assets may reference one legal record. Clearing or changing a link retains the prior association in protected history. It never deletes, archives, or rewrites a trademark record. No permanent asset deletion is included initially; clients can describe business use as inactive.

## Database boundaries

Use composite references containing both record ID and client ID for assets, parents, and legal links. Proposed supporting unique keys are `(id, client_id)` on assets and on the existing `vb_marks` table. The latter is database metadata supporting a same-client foreign key; it changes no mark values, but would still require approval as part of a future migration.

Client ownership is immutable for existing assets and link/relationship slots. A legal record linked to an asset cannot silently move to a different client: the same-client reference must reject that reassignment. Any legitimate transfer needs a separately reviewed process.

Reuse protected audit history for attributable before/after revisions. Adapt its triggers for the new records during implementation, preserving existing audit behavior. History and raw actor identifiers stay internal; clients receive permitted business fields, source labels, and confirmation information through an explicit response projection.

There is no internal legal-analysis field in these client-facing asset records. Future attorney notes and published recommendations require separate protected records and separately approved functionality.

## Reads and saves

Use one guarded `vb_read_brand_map(target_client)` operation. It validates the caller before querying and returns only the allowed asset fields, visible relationships, current legal-link facts, and permitted existing mark details for that workspace. Never retrieve all clients and rely on browser filtering. Counts and search use the same protected data. Do not expose internal history or analysis through a broad `select('*')` response.

Enable row-level security on all new tables. Authenticated clients can read only with the existing active membership/portal checks. Authorized staff use the existing MFA-protected staff role. Anonymous access is denied. This adds no roles and does not change memberships.

Do not grant browser roles direct select/insert/update/delete rights on the new tables. The guarded read operation is the client-facing projection; actor IDs, identity fingerprints, and history are omitted. Its privileged execution must check membership or the MFA staff role explicitly before querying, just as write operations do. Use narrowly scoped database save functions, following the existing guarded-save pattern:

| Operation | Guarded behavior |
| --- | --- |
| Save an asset | Accept only name, kind, description, business-use state, and expected version. Check the caller’s workspace rights; server sets source/actor/timestamps. |
| Set or clear a parent | Check both endpoint permissions, expected relationship version, and the complete same-client ancestor chain. Reset confirmation after a change. |
| Confirm a relationship | Check workspace permission and exact expected version; record the actual caller and date. Display business confirmation, not attorney clearance. |
| Set, clear, or reconfirm a legal link | Require MFA staff; validate same-client active asset/mark and current asset identity revision. Clients cannot invoke this successfully. |

Reject unexpected fields rather than silently accepting forged approvals, provenance, versions, or legal IDs. Use an empty search path and fully qualified references in privileged functions; revoke public/anonymous execution. A privileged function must explicitly validate authorization, because its elevated rights must not become an access bypass.

Serialize writes using the client row lock, then recheck current permission. Require the expected version for updates. This also prevents concurrent parent changes from creating a cycle. Legal-link writes lock/validate their referenced records in a consistent order. During implementation, confirm concurrency behavior against the existing attorney mark-save/import paths.

Do not permit updates when a client is archived. Clients also lose read/write access when membership or portal access is disabled. Staff can prepare business assets for an otherwise active client whose portal is disabled; this does not enable client access.

## Revisions and labels

Every asset save advances its general version. Only changes to name, kind, or substantive description advance its identity revision. A change to self-reported business use does not independently invalidate the legal association or change legal status.

A legal link records the asset identity revision and a server-computed fingerprint of the linked mark’s identity fields: client, name, mark type, and record owner. If these no longer match, show **Link needs attorney review**. Keep the association/history intact, but do not present the old association as approval of the changed asset.

Always show the current legal status from the legal record as **Linked record status**, separately from the link-review label. A routine USPTO retrieval or status update refreshes the factual status without itself changing the identity fingerprint. An archived legal mark is unavailable for new links and its existing association is flagged for attorney review; it is not replaced by a synthetic record.

Solid lines mean confirmed business relationships. Dashed lines mean proposed relationships. No linked record is not a finding of “unprotected.” Children do not inherit trademark status. Business inactivity does not archive a legal record. Counts distinguish assets from distinct legal records; repeated links never inflate legal-record totals.

## Portal and attorney work

The client homepage gains a compact Add brand asset form and an edit panel for the approved business fields. Parent selection lists only authorized same-client assets. Confirmation is an explicit action. Legal-link controls are absent from client forms. Save errors preserve the unsaved text and offer reload/review for stale versions; failed saves do not appear successful.

The smallest attorney addition is a client-scoped action to associate or review an asset’s legal link. It uses the existing staff workspace and Portfolio records; it does not introduce a Review Queue, new navigation, or a general recommendation workflow.

Assets linked to records appear as business nodes with legal details in their panel. Unlinked legal records remain in a labeled Portfolio-record grouping. Empty states stay accurate. The existing homepage remains useful until the new backend is explicitly approved and available; no sample assets enter the authenticated production view.

## Concrete acceptance tests

| Test | Required result |
| --- | --- |
| Client A reads/searches/counts Client B’s assets | No rows or private information returned. Test the database/API, not only the UI. |
| Client A submits B’s parent, asset, mark, or source reference | Rejected without writing; no information-revealing response. |
| Client submits legal-link, actor, source, confirmation, or version fields through an asset save | Rejected; server-controlled fields remain authentic. |
| Client calls the staff legal-link operation, or staff lacks MFA | Denied, with no writes. |
| Anonymous, revoked, portal-disabled, or archived client access | Denied under the corresponding read/write rules. |
| Two edits use the same expected version | One succeeds; the stale write cannot overwrite it. |
| Self-parent, longer cycle, or simultaneous cycle-forming edits | Rejected; final graph is acyclic. |
| Parent changes after confirmation | Proposed state restored; old confirmation stays only in history. |
| Asset identity or linked mark identity changes | Link requires review; earlier approval is not silently reused. |
| Business use becomes inactive, or USPTO status updates | Legal record stays intact; factual linked status remains accurate. |
| Several assets link to one mark, including inactive Cotivate | Count the mark once; no inherited protection or fictional registration. |
| Script-like names, empty portfolios, large maps, phone/laptop layouts | Safe text, accurate empty states, reachable records, readable layout. |

Run database tests with two synthetic clients, their separate users, and MFA/non-MFA staff in an isolated disposable test database, not the configured live database. Test fixtures are temporary and do not provision real accounts. Run client/UI tests separately. Report simulated tests and live access verification distinctly; the prior signed-in single-client checks do not prove cross-client isolation.

## Recommended next bounded phase

Ask Mario to approve preparing the migration and executable privacy tests as local files only. No schema is applied, account created, or service connected in that phase. Use an existing isolated test database only if available and authorized; software installation or external database setup needs separate permission. If database execution is unavailable, label those tests unrun.

After that review, separately approve the backend application and connected UI build. Preserve the pending BCM, Watch, and maintenance work. Reconcile the asset/mark IDs with the parallel feature owners before applying a shared schema; this blueprint does not claim their agreement or authorize messaging them.
