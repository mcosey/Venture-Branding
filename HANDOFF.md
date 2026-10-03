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
Active development branch: `codex/client-portal`.
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

Current next planning step: map the attorney onboarding/review workflow, screens, and exact client-versus-attorney automation controls. Obtain approval before implementation. Do not begin backend work merely because this document describes it.
