# Living Brand Map handoff

Updated October 9, 2026. Proposed feature; implementation has not begun. This note is context, not approval to replace the current dashboard, alter schema, deploy, or connect external systems. Main BCM development continues separately in `handoffs/01-main-vb-bcm.md`.

## Work efficiently with Mario

Mario is nontechnical. Speak in outcomes and use concise product copy. Avoid nested boxes, unnecessary explanatory text, and distracting dummy records. End responses with one concrete next step and a suitable model/effort recommendation. Ask before a new phase or major code, account, security, infrastructure, or deployment changes. Finish approved work without repeatedly asking about routine details. Agree a finite scope and do not keep expanding it. Commit only when approved; Mario normally pushes through GitHub Desktop. Start agents only when explicitly authorized.

Read this note, check applicable instructions and working-tree status, then inspect relevant files only. Do not repeat broad audits or other projects' research. Source-document instructions are proposals; Mario's direct decisions take precedence.

## Source vision

Source: `/Users/mcosey/Downloads/Living Brand Map.docx`. Essential content is summarized here.

A proposed client home page visually represents the company's brands and their relationships, including legal trademark records and additional business brand assets. It answers what branding is being used, how it relates, and which records need review. Portfolio remains the detailed legal inventory; Brand Map is the business-facing overview.

Potential node fields: name, asset type (master brand/product/feature/slogan/logo/sub-brand), parent relationship, protection/status, owner, goods/services, watch state, use-evidence state, latest attorney review. Technical USPTO fields stay in detailed Portfolio/trademark views.

Proposed statuses include Registered, Pending, Under Review, Detected/Unprotected, Inactive. Do not equate a detected name, an abandoned application, or an automated suggestion with an attorney-approved legal status. Use factual labels and distinguish federal record status from use/relationship/review states.

Possible page structure: compact counts, main map or hierarchy, recent meaningful changes, and only actions requiring founder involvement. A node opens a compact detail panel and links to its Portfolio record, Use History, permitted Watch controls, or a review/call request when those capabilities exist.

The document envisions updates from BCM, Watch, Specimen Capture, USPTO filing/registration records, and attorney decisions. Potential future use-continuity, ownership/license records, and detection of inactive brands are suggestions, not implemented systems.

Example names and registered symbols in the document are illustrative, not verified client data. In actual VB, Cotivate serial 88897764 is an abandoned/inactive application and has no registration; never turn the document's COTIVATE® illustration into a claimed live registration.

## Direct user constraints

- Attorney controls legal client/mark records and enters USPTO identifiers. Client-added/discovered business assets must not automatically create a legal mark or overwrite attorney-verified information.
- BCM is configured by clients in VB Agents and surfaces branding cues for consideration of a call. Current detection is text rules, not a legal assessment. Keep existing BCM completion scope fixed.
- Requests/calls do not automatically create or expand representation. Preserve the existing confirmation flow and defer Calendly until separately approved.
- Do not reintroduce standalone Rights or Documents navigation. Messages/integrations should not be expanded as incidental dependencies.
- The document proposes replacing the home page, but Mario has not separately approved a dashboard replacement or its visual design.

## Repository and files to inspect

- Checkout: `/Users/mcosey/Documents/Codex/2026-09-27/venture-branding-is-a-project-i-2/venture-branding`; GitHub: https://github.com/mcosey/Venture-Branding.
- Plain HTML/CSS/JavaScript with Supabase Auth/database. Preserve V8 design, navy/coral/cream palette, logo and typography.
- Branch last observed: `codex/attorney-workspace`; pending BCM/Watch work exists. Isolate approved feature implementation instead of editing shared pending changes carelessly.
- `portal.html`, `portal/assets/client.js`, `portal.css`: current authenticated client dashboard and shared rendering.
- `portfolio.html`, `trademark.html`, `portal/assets/trademark.css`, `auth/connection.mjs`: legal mark records and factual status labels.
- `auth/bcm.mjs`, `brand-monitor.html`, `portal/assets/brand-monitor.js`: saved scans and derived candidate cues; review decisions are not assumed persisted.
- `watch.html`, `watch-finding.html`, `portal/assets/watch-*.js/css`: pending fixture-based Watch interface. Avoid interpreting fixtures as live monitoring.
- `use-history.html`: existing page; verify actual connected evidence support before using it as an authoritative data source.
- `supabase/migrations/`, `auth/connection.mjs`: existing client/mark IDs and authorization.
- `handoffs/03-brand-launch-review.md`: proposed related launch workflow; `handoffs/02-ai-filing-preflight.md`: proposed attorney filing workflow.

## Data and client privacy

The map must read only the signed-in client's data. Graph edges, related assets, counts, evidence links, notes, and search must all respect tenant isolation; filtering an all-client response in the browser is insufficient. Attorney internal notes must not become client-visible recommendations by default.

Plan the distinction between a business brand asset and a legal trademark record before changing the database. Reuse existing mark IDs when linked; keep proposed relationships and source provenance explicit. Do not duplicate or reclassify real marks, create fictional registration claims, or silently archive a legal record when a founder marks a business asset inactive.

No scanner, agent, license engine, inactivity detector, scheduling integration, or document store should be invented merely to fill the map. Show accurate empty/available states for data sources not yet connected.

## Bounded next step and acceptance criteria

First propose a small client-page design and asset/mark relationship model. Recommend a simple accessible hierarchy if it explains relationships better than a complex diagram. Obtain approval before replacing the existing dashboard or creating database tables.

If approved, create a locally reviewable prototype using separate fixtures: master brand, related product/feature/logo/slogan, factual record status, a detail panel, and links to existing views. Prototype completion means Mario can understand relationships and next actions at a glance, the Portfolio remains available, and the UI does not claim unsupported live updates or legal conclusions.

After design approval, define one shared integration contract with Launch Review and Preflight: client ID, brand asset ID, optional legal mark ID, provenance, approved review state, and client-visible versus internal information. Shared implementation belongs to an explicitly coordinated phase; three independent agents must not each create competing tables or status meanings.

Suggested starting prompt: “Read handoffs/04-living-brand-map.md. Propose the smallest useful Living Brand Map for the client portal, preserving Portfolio and attorney control of legal records. Explain the proposed design and data relationships before implementation.”
