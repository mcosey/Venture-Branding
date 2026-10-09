# Brand Launch Review handoff

Updated October 9, 2026. Proposed feature; implementation has not begun. This note supplies context, not authority to build or deploy. Main BCM work continues separately in `handoffs/01-main-vb-bcm.md`.

## Work efficiently with Mario

Mario is nontechnical. Explain the flow in plain language; use short product copy. End responses with a concrete next step and a suitable model/effort recommendation. Ask before a new phase or major code, account, security, infrastructure, or deployment changes. Complete approved work without repeated permission questions. Keep an agreed finite scope. Commit only when approved; Mario normally pushes in GitHub Desktop. Do not start agents unless explicitly requested.

Read this note, check applicable instructions and Git status, and inspect only relevant files. Do not repeat the repository audit or analyze unrelated projects. The attached document is a proposal; direct user decisions take precedence.

## Source vision

Source: `/Users/mcosey/Downloads/Launch Clearance Gate _ Brand Launch Review.docx`. The relevant content is summarized here.

A founder-facing workflow initiates attorney review when a founder plans a new product, feature, service, sub-brand, slogan, logo, or other brand launch. Proposed intake: name/slogan, asset type, short product/service description, intended launch date, where/how the branding will be used, relevant links, optional design upload, and whether already publicly in use.

The document proposes a saved request with statuses Submitted → Information Review → Clearance Review → Attorney Recommendation → Complete. It proposes attorney follow-up for missing information, appropriate clearance work, internal analysis, and a client-facing attorney recommendation. Possible outputs include additional information required, review underway, discussion of possible issues, an application recommendation, or alternative branding.

The reviewed launch can later link to a Brand Map asset and an attorney-created Portfolio record. Example: COTIVATE → COACHIVATE launch review → agreed application work → Portfolio record → permitted monitoring/capture. The sequence must preserve explicit attorney decisions and agreed scope.

AI assistance may organize intake/search preparation or summarize material, but legal recommendations come from the attorney. Notion/Linear/Jira integration is a long-term suggestion, not current scope.

## Direct user decisions that must govern this proposal

Mario previously decided that most new-service requests create or expand engagements. He wants the client to provide context and then **schedule a call**, with confirmation that the call does not create representation or automatically expand an existing engagement. A submission must not imply accepted work, purchased services, a completed clearance opinion, or a filing authorization.

The existing Add New Mark flow was built around this decision. Scheduling remains unconnected; Mario explicitly deferred Calendly. Messages were to be left alone at that stage. The attorney workspace is a client-management hub; Mario favored **Client requests** rather than an abstract Review Queue or general task feed. Reconcile the document's deeper request/status workflow with these direct decisions before implementing it. Do not silently replace the agreed call-first flow or add a Review Queue.

Attorney creates/controls actual marks and USPTO identifiers. A client-submitted proposed name is not automatically a legal Portfolio mark. Attorney review can identify a next action; it cannot silently add scope or charges.

## Repository and starting files

- Checkout: `/Users/mcosey/Documents/Codex/2026-09-27/venture-branding-is-a-project-i-2/venture-branding`; GitHub: https://github.com/mcosey/Venture-Branding.
- Plain HTML/CSS/JavaScript, Supabase Auth/database, canonical V8 aesthetic. Preserve the logo and shared shell.
- Branch last observed: `codex/attorney-workspace`. Pending BCM and Watch changes exist. Use approved isolation for implementation; preserve unrelated work.
- `portal/assets/new-mark.js`: existing proposed-mark intake, in-memory draft, Schedule a call dialog, representation/scope copy. It currently does not submit a request or book a call.
- `portal/assets/client.js`, `portal.html`, `portfolio.html`: authenticated client rendering and entry points.
- `attorney.html`, `attorney/assets/workspace.js`, `workspace.css`: client-management hub and Client requests section.
- `auth/connection.mjs`, `auth/account.mjs`, `supabase/migrations/`: authenticated records, client-scoped access, staff MFA, existing database contracts.
- `auth/bcm.mjs`, `portal/assets/brand-monitor.js`: BCM finding discussion currently prepopulates a proposed-mark intake; does not itself send a request/book.
- `handoffs/04-living-brand-map.md`: related brand-asset linking proposal.

## Security and service boundaries

Client access is invitation-only. Every request, attachment, status, and recommendation must be scoped to the correct client server-side; approved staff uses MFA. Clients must not write attorney recommendation/internal analysis fields. Keep internal legal analysis distinct from client-visible updates. Upload handling and model transmission require an agreed design and approval.

VB excludes enforcement/litigation. Hosting, Calendly, Clio, QuickBooks, and project-management integrations are deferred. Do not build those as hidden prerequisites. No new database table or deployment is authorized by handing off this document.

## Bounded next step

Propose one coherent flow showing how this idea extends the existing Add New Mark → Schedule a call experience. Explicitly resolve whether a request is saved before the call and which limited states the client sees before new work is agreed. State the smallest change to the attorney Client requests page. Ask Mario to approve that flow before building.

If a prototype is approved, use isolated fixtures and the existing design: intake, scheduling confirmation, request detail/status, and attorney client-request view. Completion means the founder can communicate launch context, the attorney can review it, and no screen implies automatic engagement or clearance. Actual saving, uploads, scheduling, AI assistance, and recommendations need explicitly scoped implementation phases.

Coordinate shared client/brand IDs and review-status meanings with Brand Map and Preflight before shared database edits. Keep the Brand Map dependency optional for an initial useful flow.

Suggested starting prompt: “Read handoffs/03-brand-launch-review.md. Propose a Brand Launch Review flow that preserves my existing call-first engagement policy and uses Client requests in the attorney hub. Show the smallest useful version before making changes.”
