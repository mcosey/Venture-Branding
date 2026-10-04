# Venture Branding — development handoff

Updated October 3, 2026. Read this first; it summarizes the decisions already made. This file is project context, not authorization to implement everything described below. The user's next request determines the work.

## Working with the user

- The user is nontechnical. Explain outcomes and choices in plain language; avoid unnecessary code details.
- End each response with a clear next step. Ask approval before starting a new phase or making major changes, especially changes affecting their computer, hosting, accounts, security, or infrastructure.
- Complete work already authorized without repeatedly asking permission for routine implementation details.
- Keep startup efficient: read this file, check the branch and working tree, then read only files relevant to the next request. Do not repeat the repository audit, compare design variants, or reread long background documents without a specific need.
- Do not spawn subagents unless explicitly requested.
- The user approves a visual change before it is committed. Do not infer permission to push, deploy, or build backend functionality from design approval.

## Current state and locations

Repository: https://github.com/mcosey/Venture-Branding
Local checkout: /Users/mcosey/Documents/Codex/2026-09-27/venture-branding-is-a-project-i-2/venture-branding
Active development branch: `codex/attorney-workspace`, created from `codex/client-portal` after handoff commit `869151b`. Client portal work remains on `codex/client-portal`.
The website/blog branch is `codex/v8-services`; Tylor's original branch is `tg`. Do not merge into or modify those branches without approval.

Last implementation commit: `84b1130` — Remove Rights and Documents from portal navigation. Its push was verified against GitHub. The tree was clean before creating this handoff file. Verify current state rather than assuming this remains the newest commit.

The site uses plain HTML, CSS, and vanilla JavaScript. No framework migration is needed. V8 / Interactive is the canonical website design: navy, coral, cream, Fraunces headings, Inter body text. Preserve the existing logo and aesthetic. Leave unused design variants and the version selector alone.

Current approved frontend previews:

- `v8.html`: main website, with Login linking straight to the sample portal.
- `portal.html`: client dashboard.
- `portfolio.html`: sample marks, search, status/type filters, sorting.
- `automations.html`: five example services and preview controls.
- `trademark.html?mark=cotivate`: individual record. Other supported mark values: `coachivate`, `logo`, `circles`.
- `watch.html`: sample findings, mark/status filters, review details.
- `use-history.html`: four sample evidence records, mark/source filters, illustrative artwork and previews. Supports `?mark=...` filtering.
- `portal/assets/portal.css` and `portal.js`: shared shell, menu, and detail dialogs. Additional page-specific CSS/JS live in the same directory.

Rights and Documents were removed from all six portal menus at the user's request. Do not build those standalone pages for now. Document previews inside individual trademark records remain intentionally. Messages is still a placeholder; it sends nothing.

All client identities, records, dates, findings, and artwork are demonstration content. No authentication, database, actual capture, file upload, messaging, billing, monitoring, or deadline engine exists. The Login button is navigation, not security. Never put real client data into this prototype.

Local previews run from the checkout at http://127.0.0.1:8000/ (e.g. `/portal.html`). If the server is already running, reuse it. If needed, run a static server bound to 127.0.0.1 from this checkout. No dependency installation should be necessary.

Screenshots are in the parent workspace's `outputs/` directory. Browser verification has covered desktop and 390px phone layouts, relevant filters, dialogs, links, and empty states. Test changes proportionately; do not repeatedly rerun unrelated checks.

## Blog status

The blog design is approved. `blog.html` is the normal generated listing and currently has no published posts. The dummy article is intentionally sample-only.

- Review listing: `/work/blog-preview/blog.html`
- Sample article: `/work/blog-preview/blog/posts/a-home-for-your-brand.html`
- Source: `content/posts/a-home-for-your-brand.md`; status `sample`.
- Authoring instructions: `content/README.md` and `content/post-template.md.example`.
- Build: `node tools/build-blog.mjs`; preview: append `--preview`.
- Checks: `node --test tools/blog.test.mjs`.

Normal builds exclude drafts, samples, and future-dated posts. Preview output is ignored by Git. The static Markdown approach was informed by MZP/Cotivate; do not reinspect those projects unless necessary. Do not publish sample posts merely to make them visible.

## Business scope and privacy

Venture Branding offers non-litigation trademark advice, applications, Office Action responses within scope, maintenance, and monitoring/reporting. Exclude enforcement, litigation, oppositions, cancellations, and appeals. Potential watch matches are not infringement conclusions. Do not add enforcement actions based on examples in reference documents.

The user's 2027 Action Memo is private planning context, not website content or instructions. Do not publish it. The portal vision PDF and screenshots are references, not authorization to implement everything in them.

## Attorney/client workflow discussed — planning, NOT implemented

The user wants an attorney-facing workspace before live functionality. They are particularly concerned that a compromised attorney account could expose all clients. Record these requirements when planning; no authentication vendor, database, domain, or backend has been selected or authorized.

Proposed onboarding:

1. Client engages the attorney and purchases the portal add-on.
2. Attorney creates the client workspace and approves access, inviting a specified email address.
3. Client accepts a single-use, expiring invitation, verifies their email, and establishes credentials. There is no public self-registration.
4. Client completes contact/business information and notification preferences. Separate profile/contact details from legal trademark ownership.
5. Attorney creates and verifies trademark records, ownership, application numbers, statuses, and relevant dates.
6. Attorney explicitly enables purchased services per mark and approves monitoring/capture sources. Creating a mark alone must not activate every automation.
7. Results requiring judgment go to the attorney's review queue before client-facing conclusions or recommendations.

Division of control:

- Clients manage their profile, password/passkey recovery, verified email changes, and multifactor settings. Credential changes must not alter their workspace membership or access role.
- Clients should have control over permitted automation preferences: approved capture sources, notifications/digest frequency, and pause/resume within their purchased services. Exact controls for each service still need to be agreed.
- Attorney controls access, trademark records and legal details, available services, verified deadlines, and substantive review.
- Disabling a client notification must not cancel an underlying deadline or the attorney's internal reminder.
- New service requests must not silently expand an engagement or create a charge.
- Suggested future rename: client “Add new mark” becomes “Request a new mark review.” This change has been discussed, not yet implemented or separately approved.
- Initially, adding client colleagues would require attorney approval. Staff/team permissions remain to be finalized.

## Attorney workspace security direction

Separate attorney and client sign-in entrances were recommended. Example subdomains `staff.yourdomain.com` and `portal.yourdomain.com` were illustrative only, not chosen domains.

A separate URL is not a security boundary. The future design must enforce access on the server for every request and file, regardless of which login screen was used:

- Invitation-only client provisioning; uninvited account creation rejected, not merely hidden in the interface.
- Staff provisioning separate from client invitations. A client cannot choose, request through signup, or edit themselves into an attorney role.
- Clients access only their own workspace. Changing a URL or record ID must not expose another client's records.
- Explicitly approved staff only; least-privilege access and assigned matters if a team is later added.
- Strong staff multifactor sign-in, preferably passkeys/security keys; carefully designed recovery that does not bypass these protections.
- Session revocation, appropriate session expiration, and reauthentication for sensitive actions.
- Audit logs for access grants, invitations, important record edits, and automation approvals.
- Use an established authentication service; do not invent a password system.

Separate entrances cannot eliminate compromise risk. Staff authentication, recovery, authorization, and data isolation must be designed and tested together. Provider selection and exact architecture remain open, and should be researched when the user authorizes that phase.

## Publishing and next steps

Cloudflare configuration exists for Tylor's original `vb-test` project, but hosting is deferred. Do not configure hosting or deploy. Existing automatic deployment behavior is unknown; don't promise a GitHub push cannot trigger a configured preview.

Command-line pushes failed because this connection lacks GitHub authentication. GitHub Desktop is signed in as `mcosey`. Established workflow: commit only after approval; user clicks Push origin in GitHub Desktop; then verify `git ls-remote origin refs/heads/codex/client-portal` matches local HEAD. Do not install tools or extract credentials to work around authentication.

Current work: the original attorney Phase 1 was committed as 6df36da and the user reported pushing it. The revised client-management hub described below now awaits design/commit approval. After approval, agree the next client-management workflow. Exact client-versus-attorney automation controls still need agreement. Do not begin backend work without approval.

## Attorney workspace Phase 1 — October 3 update

User approved a separate branch and a sample-only dashboard/navigation prototype. `attorney.html` and `attorney/assets/workspace.css` / `workspace.js` provide Today, Clients & portfolios, Review queue, Automations, and Connected tools sections. Buttons open scope/sample previews; these are not full operational screens. Existing client pages have not been changed by this phase. Open locally at `/attorney.html`; there is intentionally no staff link added to the public homepage or client menu. This is navigation separation, NOT authentication.

The user clarified that the workspace should coordinate established services, not replace them:
- Microsoft 365 / Outlook: email, calendar, Office documents.
- QuickBooks: accounting, bookkeeping, reconciliation, tax records. Do not build a duplicate ledger.
- Clio: matters, legal billing, payments, internal legal operations. Do not build competing matter management or billing.
- Calendly: scheduling.
- iManage: earlier document-management choice; later user also listed Clio DMS. This overlap remains unresolved; retain iManage as a planning assumption pending clarification.

No connections exist. Tool cards say Not connected and explain intended roles without requesting access. Capabilities, account requirements, sources of truth, and read/write permissions must be verified when integration work is authorized. The standalone bookkeeping/billing section from the first proposal was superseded. Phase 1 uses one sample client, four trademark records, and two review items. No invitations, decisions, messages, settings, payments, or outside records are created by its controls.


## Current attorney direction — supersedes the original Phase 1 layout

The user corrected the scope: this is their internal hub for managing all clients and their calendar, supporting the existing client-facing portal. Center the experience on client work, not on features or integrations.

- Navigation: Overview, Clients, Calendar, Tasks, with separate views inside attorney.html.
- Clients is the complete client directory (currently one sample client, Cotivate). Search by client/contact; open Cotivate for its four existing marks, five portal services, tasks and use history. Do not invent additional clients merely to fill the interface.
- Existing client-facing trademark and use-history pages are linked as explicitly labeled previews; no shared database or editing capability exists yet. Future attorney-approved records/services should supply the corresponding client's portal.
- Overview summarizes clients needing follow-up, appointments and tasks. Calendar contains two explicitly illustrative appointments. Tasks contains three illustrative client tasks; no edits or completion are persisted.
- Removed dedicated Review queue, Automations, and Connected tools navigation and integration cards. Findings belong within client context or actionable tasks, not a separate feature-led homepage.
- Outside tools remain architecture considerations, not mandatory navigation destinations. Keep the responsibilities and unresolved iManage/Clio overlap above in mind. Do not duplicate their systems or connect them without approval.
- Client-facing pages are unchanged. Still static/sample only, no auth, backend, invitations, calendar synchronization, live services or actual client data.
- Current revisions are on codex/attorney-workspace; do not commit or push until user approval. Continue ending responses with the next step and seek approval before a new phase or significant changes.


## Latest correction: organize by client, not mark (supersedes prior hub examples)

- Cotivate is a trademark, not the client. Attorney directory, overview, appointments and request ownership use Jordan Smith (existing fictional sample contact) as the sample client. Client record route: #client-jordan-smith. Marks are shown inside that client's record. Model clients separately from their owned marks when real data is authorized; actual legal owner details still require verification.
- Replace Tasks with Client requests. No invented attorney to-do feed or watch-derived tasks. One clearly sample brand-review request illustrates the existing client portal Request a Review control; no request submission, synchronization or live inbox exists yet.
- Navigation: Overview, Clients, Calendar, Client requests. Preserve appointments.
- User explicitly dislikes filler/taglines, explanatory dummy prose and verbose sample text. Use concise functional headings, labels and one brief sample-state notice. Keep detailed limitations in handoff notes or relevant preview dialogs.
- These revisions support the existing client portal; client-facing files remain unchanged. Await review before committing.


Overview and Clients now have Add New Client buttons; the sample client detail has Add New Mark. Buttons open previews only. User requested a proposed client-setup flow with future Clio/QuickBooks linking; actual setup forms, integrations, persistence and invitations are not yet authorized or implemented. Attorney controls which marks belong to each client.

## Client setup / settings prototype

User approved adding a local setup flow plus per-client Client Settings and Archived Clients navigation. Implemented in attorney.html and attorney/assets/workspace.js/css:
- Four-step Add New Client: details (individual/business, client name, contact, email), optional Clio contact/matter and QuickBooks customer references, portal add-on, review/save.
- All state is JavaScript memory for this page session only. Refresh resets to Jordan Smith; explicit top notice warns to use sample information. No localStorage, database, API calls, account connections or invitations.
- New clients get their own internal ID and empty marks/services/requests, never Jordan's sample portfolio. Jordan's four sample marks continue to link to existing client previews.
- Client Settings edits the same details. Archive requires an inline confirmation, retains the record, removes it from active lists, and moves it to Archived Clients. Open an archived client and use Client Settings → Restore client to restore. External access, accounting and matters are not affected. Real access revocation/retention policies still require design before backend work.
- Related-record references are plain text only, not active integrations. Add New Mark and Manage services remain explanatory previews.
- Verified create/review, edit, archive/restore, empty new-client portfolio, mobile form fit and JS syntax. No changes committed yet; ask user to review before saving a commit.


Latest sample identity update: FlowRata LLC replaces Jordan Smith throughout the attorney workspace and linked client portal profile. Its route is #client-flowrata. Existing four sample marks, requests and appointments belong to that sample client. MZP Inc. is the second seeded business client, with an empty portfolio. Emails use example.com; contacts are placeholders. No real ownership assertions or external records are changed.

Mario Cosey is now the third seeded sample client (individual, #client-mario-cosey), with an empty portfolio and placeholder mario@example.com email.

## Add New Mark prototype

Approved client workspace committed as 7f585a4 on codex/attorney-workspace. User can push that commit in GitHub Desktop. Subsequent Add New Mark changes are uncommitted, awaiting design approval.

Add New Mark now opens a three-step details/services/review dialog scoped to the current client. Includes name, Word/Logo type, status, optional application and registration numbers, and the existing five service choices. Save updates that client's in-memory portfolio, count, and service summary. New marks open a details preview; original four marks retain links to the existing client-facing pages. No synchronization into static client pages, real automation activation, uploads, or persistence. All data resets on refresh. No entitlement enforcement is implemented: service choices are prototype configuration only, even if a client lacks a portal add-on; enforce purchased scope before live functionality.

Checked mark creation/review, correct client ownership, details display, empty-name validation, cancellation without adding a record, and mobile fit. Archived clients cannot add marks. Further work on actual mark editing, shared storage, client portal synchronization and service permissions requires approval.


Latest service direction supersedes attorney service selection: every portal-add-on client receives the full service set and controls their own toggles. Remove attorney service selection from Add New Mark and the Manage services control. Mark setup now has Details / Review only. Included portal services is a read-only summary based on the client add-on. No live services or client toggle synchronization implemented. The proposed USPTO lookup/manual-path redesign still awaits implementation approval; do not interpret this service correction as authorization for a live API/backend.

## Two-path mark setup (latest)

User approved the prototype redesign. Add New Mark now offers Already filed with the USPTO / Not yet filed. Unfiled path asks only name and Word/Logo type, sets Not yet filed, then review/save. Filed path accepts an identifier but has NO network lookup: DEMO-001 loads a pending fixture, DEMO-002 a registered fixture; all other identifiers receive a not-connected explanation. Fixtures explicitly include Sample in mark/owner and source. Review requires owner/mark confirmation. Changing the identifier invalidates the fixture and confirmation. Imported sample fields are read-only. No attorney service selection. No credentials, external connections, persistence or client-page synchronization added. Existing marks cannot yet be linked to a later serial number; future shared records and update timestamps remain planned. Checked both paths, unknown lookup feedback, confirmation gate, and saves.

## Link / refresh existing marks

Each active client's mark now offers Link USPTO Record, or Refresh USPTO Details after a sample link. Reuses lookup/review with explicit Existing mark and incoming values, requires owner confirmation, and updates the same in-memory object. Keeps prior snapshots in mark.history and preserves service settings; no duplicate mark is created. Sample updated timestamp reflects confirmation time, not a live USPTO fetch. Failed/canceled lookups do not modify the mark. Archived clients have no link/refresh controls. Linked legacy marks open their updated local detail preview rather than stale static client detail pages. Shared client-side synchronization remains future work. All state still resets on refresh. Tested linking an existing mark, unchanged mark count, and failure preservation. Await user approval before commit.


## Clean baseline before connected prototype
User requested clearing attorney sample data before connecting to the client side. Only Cotivate LLC remains, contact Mario Cosey, one mark named Cotivate (user confirmed corrected spelling). Email and external references are blank; mark type/status are unspecified, with no invented filing numbers. All attorney requests, appointments, archives and use-history examples cleared; stale links into old client demo data removed. Existing lookup demo fixtures remain only on explicit lookup, not seeded client data. Client-facing pages are not connected or reset yet. Complete this cleanup for review before building the connected prototype.


## Current priority: five-day activation readiness

Read [LAUNCH-READINESS.md](LAUNCH-READINESS.md) for the approved planning objective. User wants VB built and tested ahead of leaving big law, then operational within approximately five days. This is a target requiring rehearsal and maintenance, not a guarantee or authorization to provision infrastructure. Supabase is likely; no project or database exists yet. Skip throwaway prototype synchronization. Next is a backend scope/cost proposal and approval before account changes. Repository setup must recreate a lost project; real data/files/secrets require separate secure backups. Only the planning document was authorized in this turn.

## Confirmed platform choices / next proposal

Cloudflare is the chosen host; hosting work is deferred. Supabase Free is chosen for development. Supabase Auth will manage invitation/recovery flows, with a separate email sender chosen before real onboarding. Never invite clients into the Supabase administrative project team to make the default email sender work. See LAUNCH-READINESS.md's first implementation phase for scope and acceptance criteria. This turn authorized plan updates and an outline only: no project, account, installation, database or auth changes were made. Next proposed action is repository schema/access-policy/configuration work with tests, subject to user approval.

## Repository database foundation draft

User authorized writing database structure/access rules in the repository only. See supabase/README.md for the complete scope and verification limits. Added SQL migration, seed, local configuration template, environment-variable template and transactional pgTAP isolation tests. No project creation, install, credentials, auth users or network writes. No frontend connection. Neither Supabase CLI nor psql is installed, so database tests have NOT run. Do not claim policies are validated or production-ready. Obtain approval for a disposable test environment before execution. The draft uses MFA-gated firm staff, protected memberships, client-only preference writes, staff-only mark edits, preserved history, and archive-based client access removal (confirm this live behavior before deployment). Uncommitted; do not commit without approval.

## Supabase development project created

User created Venture Branding in the empty Cotivate Free organization. Confirmed dashboard Healthy, West US (Oregon), project ref omvkwiosonatswocbdgx. Project URL https://omvkwiosonatswocbdgx.supabase.co . Organization aicvfezdbwwfvzowrgom. No migrations, GitHub connection or backups shown at verification. Setup form had automatic table exposure disabled and automatic RLS enabled. No credentials were read or saved by the agent. Repo SQL remains unapplied and tests unexecuted. Next requires approval to apply the prepared foundation and synthetic seed to this project and execute transactional access tests; hosted Auth configuration also remains to be verified/configured with approval.


## Applied foundation — October 4, 2026 (supersedes draft status)

Explicit authorization received to apply schema/policies, seed Cotivate and run isolation tests on omvkwiosonatswocbdgx. Done via SQL Editor, without installing tools or obtaining secrets. Migration and seed applied; 39 pgTAP checks passed after correcting three test CTEs to top-level SQL. Test records rolled back: verified 1 client, 1 mark, 5 preferences, zero Auth users, zero memberships and 7 RLS-protected VB tables. See supabase/VERIFICATION.md for hashes/results and limitations. Manual SQL execution did NOT register CLI migration history; reconcile before future CLI pushes and never rerun initial creation SQL against this existing schema. Hosted Auth setup, real login/invitation/MFA/API testing and frontend wiring remain undone. Repository changes are uncommitted; ask before commit/new phase.
