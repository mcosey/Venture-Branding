# Shared brand-asset plan

Prepared October 9, 2026. Mario approved these product rules and the next blueprint phase after clarifying that the map includes brand-related IP assets and business context. Database design, implementation, and application still need separate approval. Based on the Brand Map, Launch Review, and Filing Preflight handoffs and the existing portal’s behavior. The parallel workstreams have not independently agreed to this contract; no messages were sent to them.

## What this would make possible

A client could describe the brands used in their business and see how they fit together. An attorney could link an asset to an existing trademark record without changing that record. Launch Review and Filing Preflight could refer to the same asset and legal record instead of making competing copies.

Today, the homepage shows the company workspace and its saved trademark records. Business assets and their relationships are not saved. The existing Add New Mark flow holds a draft on the page; it does not submit a request or book a call. BCM, Watch, evidence, and attorney decisions do not feed the map.

## Keep three things distinct

| Item | Meaning | Who controls it |
| --- | --- | --- |
| Business asset | A name, product, feature, service, sub-brand, logo, slogan, or website used or planned by the business | Client describes it; authorized staff can help |
| Business relationship | For example, a feature belongs under a product | Client proposes and confirms business accuracy |
| Legal trademark record | The existing Portfolio record, with its saved status and USPTO information | Attorney controls it; client reads permitted details |

The company remains a workspace grouping. It is not automatically designated a master brand. Clients may describe a master brand as a business asset, but that designation is not a legal conclusion.

**Adding an asset, confirming a relationship, or requesting a call must not create a legal record, file an application, authorize charges, or create or expand representation.** Keep the existing call-first confirmation and separately agreed scope of work. Scheduling stays unconnected until separately approved.

## Smallest useful first version

Allow manual business assets with a name, type, short description, and self-reported use state: **Planned, In use, Inactive, or Not specified**. These are business descriptions, not verified use evidence or trademark statuses.

Each asset may have one parent asset in the same client workspace. Proposed relationships use dashed lines; client-confirmed relationships use solid lines. No asset may be its own parent, form a cycle, or belong to a different client’s graph. A first version with one parent keeps the map readable; complex licensing and multiple-parent networks remain deferred.

An attorney may establish one optional legal-record link per asset. Multiple assets can refer to the same legal record. The link points to the existing Portfolio ID; it does not copy the mark or let the client edit it. The map must not imply that the linked record protects everything shown in the asset description.

The asset panel labels any legal status **Linked record status**. A child never inherits a parent’s status. No linked record means exactly that, not “unprotected.” Marking business use inactive does not archive a trademark record. Cotivate’s abandoned application remains an inactive legal record with no registration claim.

Unlinked legal records remain available in Portfolio and a clearly labeled map grouping. When an asset is linked, show the record in its details rather than duplicating it as another brand. Counts keep business assets and distinct legal records separate.

## Shared information contract

These are conceptual fields, not new tables or changes to the existing database.

| Shared reference | Rule |
| --- | --- |
| Client ID | Existing workspace ID. Every asset, relationship, link, request, and review belongs to one authorized client. |
| Brand asset ID | New stable ID for a business asset; never substitute a trademark ID. |
| Parent relationship | Own ID, child/parent asset IDs, proposed or confirmed state, confirmer, and confirmation date. |
| Legal mark ID | Optional existing Portfolio ID, in a separate attorney-controlled link. Must belong to the same client. |
| Provenance | Source type, optional source reference, actor, and date. A BCM cue is a source, not an approval. Server records the true actor; clients cannot claim attorney origin. |
| Revision | Identifies the exact asset, relationship, or filing draft version reviewed. Stale edits must not overwrite newer work. |
| Review decision | Subject ID, review scope, reviewed revision, authorized reviewer, decision, and date. There is no blanket “approved” status covering every feature. |
| Visibility | Explicit client-visible summary/publication, separate from internal analysis. Legal publication is attorney-controlled. |

Changing a name, asset type, or substantive description after an attorney link should flag the link for recheck. Keep the historical link and legal record intact; do not present the earlier association as approval of the changed asset. Relationship changes need fresh business confirmation. Filing edits invalidate readiness for the older draft revision.

## How the parallel features use it

**Brand Map:** owns the business display and relationships. Client confirmation means “this describes our business,” not “an attorney cleared this brand.” Legal-record links and approved client-facing attorney updates are displayed separately.

**Launch Review:** may reference an existing asset and optionally its legal record. A proposed name or intake draft does not automatically create either. The call-first flow remains in place. Whether requests are saved before a call, and their client-visible states, must be approved in the Launch Review phase; this contract does not adopt the source document’s deeper clearance workflow. Any future agreed attorney work and client-facing recommendations remain explicit.

**Filing Preflight:** references the client, optional asset, legal record when available, and its own exact filing-draft revision. Checklist flags and readiness stay internal. Only an explicitly published attorney request or update becomes client-visible. “Ready to file” is neither a Brand Map status nor evidence that filing occurred. A draft may exist before a Portfolio record, so the optional asset and mark references must not force premature record creation.

Each feature owns its own workflow states. Business confirmation, legal-record status, request progress, and filing readiness must not share one generic status field.

## Privacy and editing rules

- Server/database checks must restrict reads and writes, graph edges, source references, counts, search, and links to authorized client workspaces. Browser filtering is an additional safeguard only.
- Clients may edit permitted business fields and confirm business relationships. They cannot set legal links, attorney review decisions, internal fields, or legal publication. Existing staff MFA remains required.
- Keep internal analysis and client-visible publications in separate protected records. Row access alone does not safely hide confidential columns in an otherwise readable row. Client responses use an explicit field list.
- Material revisions and approvals need attributable history. Recheck authorization on every save, including after a workspace is archived or access is withdrawn. Handle concurrent relationship changes without allowing a cycle.
- Saving assets does not enable uploads, external fetching, AI transmission, scheduled monitoring, or external integrations. Those need separate designs and approvals. Initially, logo assets can have a name/description and a generic icon.

## Required checks before a connected version is released

Use two authorized test clients to prove that reads, counts, search, relationships, provenance references, and legal links cannot cross client boundaries. Also check that a client cannot forge an attorney decision; inactive business use leaves the legal record unchanged; a proposed relationship stays visibly proposed; changed revisions do not reuse old approvals; and repeated links do not inflate legal-record counts.

The existing homepage’s signed-in, unavailable-ID, and phone checks passed. Full live cross-client database isolation remains unverified. It is a release prerequisite, not a reason to assume the new model is secure.

## Recommended next bounded phase

If Mario approves these product rules, prepare one implementation blueprint: proposed record boundaries, read/write permissions, revision handling, and concrete privacy tests for the smallest manual asset-and-relationship version. Keep legal links attorney-controlled. Reconcile that blueprint with the parallel workstreams before any schema is applied.

That next phase would still make no database, account, client-record, deployment, or external-service changes. Actual schema changes and connected implementation require a subsequent explicit approval. Do not add request saving, scheduling, preflight execution, uploads, or monitoring as dependencies of the first asset version.
