# Legal Launch Kit development — persistent branch note

## Consolidation review branch — October 17, 2026

Owner approved combining tg, attorney-workspace and legal-launch-kit in isolated codex/portal-consolidation. Read CONSOLIDATION-REVIEW.md for inputs, conflict resolutions, 340 JavaScript + 36 Python passing checks and live review limits. Current localhost8893 review serves the combined checkout. Default tg and original feature branches remain unchanged; no database/deployment changes. Returning Client's Watch snapshot is denied by the existing configuration-owning-engagement boundary; separate Test compatibility investigation is needed before default merge. Owner clarified VB is SaaS, not CRM/matter management; use Clio/QuickBooks for that, leave Calendly deferred, and reserve database audit/refactoring for later.

## Approved saved checkpoint — October 17, 2026

Owner approved committing the integrated engagement/invitation/lifecycle checkpoint on `codex/legal-launch-kit`. Includes Test-only engagement enforcement and administrative UI, real invitation delivery/acceptance for existing Members and new users, shared loading states, protected closure controls, removal of the opening-workspace heading flash, and verification notes. Final focused local suite: 50 passed; live browser lifecycle walkthrough passed as documented below. Production remains unchanged. Push/merge are not authorized by this checkpoint approval. This feature branch must eventually be merged into its originating Venture Branding branch with owner approval; do not discard it.

## Latest — live engagement lifecycle walkthrough passed, October 17, 2026

Read `supabase/proposals/portal-engagement-lifecycle/README.md` and verification JSON. Owner approved the walkthrough, privately signed the plus-address user into the in-app browser, then explicitly approved creating one fictional companion engagement/all-feature grant/two marks and closing only the two target engagements. Package applied atomically only to BCM Test; no new email/schema/permission/deployment change. Added Test-only attorney Close engagement review dialog calling the installed MFA-protected CAS RPC, with loader, double-submit and session-loss guards. Removed redundant “Opening your workspace” heading flash from sign-in; loaders remain.

Actual browser evidence: 2 marks with A/B active; close A through attorney UI -> Client access retained and only B visible after refresh; close B -> Member home; direct Portfolio navigation -> Member home; saved Kit task still checked after reload. Before/after company/profile/progress fingerprints match; staff retain both closed engagements and records; original two other Cotivate engagements still active; AI/scheduler ready=false and Watch enabled=true unchanged. Temporary task-0 checkbox restored to original unchecked state and saved; empty progress row retained. No planning text entered or exported. All 50 focused local checks passed. No real-time invalidation or new background job execution claimed.

New-user plus-address Test account is now Member-only because its two engagements are closed. Original Member account's separate accepted engagement remains active. Fictional marks/closed records are intentionally retained, not deleted. No commits/pushes/merge authorized for this phase. Recommended next action: save a reviewed Git checkpoint on `codex/legal-launch-kit` with owner approval, without merging or pushing automatically.

## Latest — invitation flow loading states, October 17, 2026

Owner reported the existing-Member email invitation worked and supplied the Client Brand Map screenshot. Attorney client detail now visibly lists “FICTIONAL TEST — engagement draft review” as Active (previously a draft); the old draft URL correctly no longer resolves. Real new-user email roundtrip remains untested. No additional email sent.

Added shared decorative skeletons for invitation verification/acceptance, signup initialization/submission, client sign-in, engagement editor startup, draft saving, invitation delivery/revocation, and draft refresh. Cleanup runs on success/failure and older cleanup cannot hide a newer request. Entry HTML carries initial placeholders before scripts run. Existing destination loaders remain intact. Validation: 47 focused local tests passed; browser observed engagement skeleton, signup/sign-in completion, unavailable-invitation cleanup, and the active engagement on the client page. No database, permissions, deployment, research, or Production changes in this loading pass. Nothing committed/pushed.

Brand Map rendering/layout was preexisting. Integration changes in `portal/assets/client.js` add the Test Member Legal Launch Kit navigation link; engagement access/routing controls which records are returned. No Brand Map redesign was performed in this phase.

## Current preparation — engagement invitation delivery, October 17, 2026

Owner approved implementing and testing invitation delivery/acceptance in Test. **Applied/deployed only in Test with explicit action-time approval.** Latest clarification: use the legal client's saved designated contact/email, with review; no editable invitation email or Member directory. See `supabase/proposals/portal-engagement-invitations/README.md` and SQL/Edge/browser sources. Existing Members use their account; new Auth invitees choose their password privately, complete normal acknowledgment/company onboarding, and explicitly accept. All Client features included; retained engagement records remain scoped. Calendly separate. 36 local checks, 44 rehearsal + 44 installed invitation checks, 54 prior scope checks and 4 client-save dependency checks passed. Endpoint 401/204/403 checks passed. Test callback/readiness saved; Production unchanged. Owner approved fictional Cotivate contact email mithrilzeppelin117@gmail.com and one email was sent. Its verified pre-acceptance state: sent, no engagement/grant. Actual recipient acceptance and a second new-user email roundtrip remain pending. Browser action-time approval received and first recipient explicitly identified. Do not send another email without specific recipient approval. The missing Test Client Settings security-invoker save wrapper was repaired within existing staff RLS/write permissions; actual contact save then worked. No commit/push/merge authorized.

## Navigation refinement — October 17, 2026

Owner approved nesting engagements under each legal client. The standalone Engagements navigation item is removed. Existing Test client detail now lists only that client's engagements and saved drafts, with Add engagement and Edit draft entry points. The editor requires a valid client context, fixes that client, links back to it, and filters saved drafts to it. New legal clients use the existing Add New Client workflow first. No database/access rules, invitations or records changed in this refinement. Browser verified Cotivate's active engagement and saved draft, the fixed-client Add engagement flow, return navigation, and that Mithril's view does not show Cotivate's draft. JavaScript syntax and diff checks passed. Not committed.

## Current work — full Client access and attorney draft screen, October 16, 2026

Owner corrected the model: **all Clients receive all Client features**, with engagement/record boundaries rather than feature tiers. Member accounts/activity must not be a searchable directory or monitoring feed. Consultations use Calendly independently. Attorney enters the recipient email after separately agreeing to engage. First relationship invitation supports both existing Member and new-user registration; later engagements reuse the verified relationship. See `supabase/proposals/portal-engagement-admin/README.md` and the amended master plan in parent outputs.

Implemented: protected attorney engagement draft screen, manually entered recipient, new/existing legal-client planning, review/save/edit, Test all-features correction and rollback tests. The new backend is now applied only in Test with action-time approval; 22 rehearsal + 22 installed checks and the prior 54 engagement-isolation checks passed. Local regression suite passed 28 checks. A real signed-in MFA attorney saved, reloaded and reopened one clearly fictional Cotivate planning draft; it remains for review. No invitation/email is sent. Full invitation acceptance/delivery and activation remain next. Prior Test engagement enforcement below remains installed. Production, Kit design and Member private data remain unchanged. No commit/push/merge authorized. Feature branch must eventually be merged with approval.

## Current work — engagement enforcement applied in Test, October 16, 2026

Owner gave action-time approval for the named Test package. **Applied only in Venture Branding BCM Test. All 54 rollback rehearsal checks and all 54 checks against the installed rules passed.** Read `supabase/proposals/portal-engagement-cutover/ENFORCEMENT.md` and its verification JSON. Four fictional clients now use active accepted engagement grants for scoped access; retained closed-engagement records cannot be exposed by a second active engagement for the same client. Final closure returns the user to Member access. Staff retain MFA-protected records. Source includes shared routing fallback and a Test Client Kit navigation link.

Postcheck confirms four original engagements active, 32 service bindings, 19 record-scope triggers, 15 restrictive read policies, original client/membership fingerprints unchanged, zero retained synthetic fixture records/storage metadata, and no client grants for the free Member. AI ready=false/max_runs=8, scheduler ready=false and Watch enabled=true match pre-change values. No dispatcher, external research, worker deployment or Production changes occurred. Signed-in Member direct navigation to the Client workspace returned to Member home, retained MZP117 LLC, and still opens the Kit. Independent-session concurrency and a fresh Client/attorney browser walkthrough were not exercised; do not claim they were. Existing invitation/acceptance and full attorney engagement setup UI remain separate work.

Rehearsal corrected missing SQL terminators, dashboard-normalized fingerprint input, missing maintenance-draft fixtures, and closure's non-null digest due date (uses infinity to disable future delivery). Actual database checks passed after those corrections. Local routing/onboarding/progress regression suite has 21 checks. **No commit, push or merge authorized for this phase.** The feature branch must eventually be merged with approval. The Kit design and account progress implementation remain intact.

## Previous checkpoint — engagement mapping, October 16, 2026

Progress checkpoint `499af80` was committed and the owner reported pushing it. Owner then approved beginning the Test engagement/client integration. Read `supabase/proposals/portal-engagement-cutover/README.md` for the observed hosted inventory, proposed fictional-client mapping and exact implementation boundaries. Read-only Test inspection found four fictional clients, five marks, four active memberships and **zero engagements**. No access rules, accounts, records, workers or Production settings changed during that inspection. Owner approved all four fictional clients. The Test mapping is now applied: 4 labeled engagements, 4 matters, 4 existing-user grants and 111 mapped records. All 66 hosted mapping/new-model lifecycle checks passed; rollback fixtures were removed. Original source data and legacy access definitions are unchanged. The new free Member received no client grant. Legacy tools still require their actual scope-aware cutover; do not claim that closing these new engagements revokes legacy client access yet. See the phase README and mapping verification record. Source is uncommitted. Existing Member progress remains functional and the Kit design is out of scope.

## Previous checkpoint — account-backed progress in Test, October 16, 2026

Owner approved connecting Legal Launch Kit checklists/planning notes to the Member account and committing this checkpoint. Implemented and applied only in Test. Read `supabase/proposals/portal-membership/PROGRESS.md` first for this phase. Account data now loads from `vb_member_progress`; checked-revision writes use `vb_save_member_progress`. Existing browser progress is not automatically imported. The design is preserved.

Validation: 34 focused local tests and 15 hosted database checks passed. Real signed-in MZP117 LLC checkmark and temporary note survived a full reload; both were restored to their original empty state and verified after a second reload. Existing client/membership fingerprints match; synthetic fixtures rolled back. User left signed in with roadmap open. Cross-device access is supported through account rows, but a second-device sign-in was not exercised. No Production changes, client-tool activation, commits, pushes, or merges in this phase. Historical browser-only progress notes below are superseded for signed-in Test accounts.

## Current saved milestone — Member registration in Test, October 16, 2026

Owner approved committing this checkpoint on `codex/legal-launch-kit`; no push or merge authorized for this checkpoint. The feature branch must eventually be merged into its originating VB branch with approval. Homepage entry is `v8.html` (not the legacy `index.html` design chooser).

Includes Member portal shell, signup and sign-in integration gated to the named Test project, hosted Member/engagement foundation, tested onboarding, and lorem ipsum policy documents for the authorized dry run. Real Test signup, verified Member landing, account-backed MZP117 LLC profile, reload persistence, and locked client-tool explanation were observed. Final checkpoint validation: **39 local tests passed**; previously applied hosted packages passed **39 foundation checks and 19 onboarding checks**. Existing client access and Production were preserved.

The Test preview uses port 8893; the general visual preview uses 8891. No final legal documents are represented as accepted by the Test backend. Legal Launch Kit checklist/planning progress is still browser-local and separated by verified user; cross-device account storage is the next proposed implementation step, not yet approved. Legacy client tools/workers have not been cut over to engagement permissions. No existing client records were automatically mapped to fictional engagements.

Read `supabase/proposals/portal-membership/REGISTRATION.md` for application evidence, the email-confirmation resume correction, limits and the private signup walkthrough. Some historical entries below describe earlier work; this section is the current checkpoint summary.

## Correct public homepage — avoid the legacy design chooser

The current public VB homepage is `v8.html`, not `index.html`. HANDOFF.md identifies this entry, and the current blog navigation links to it. Local LLK-branch homepage: `http://127.0.0.1:8891/v8.html`; its Login link opens `login.html`. The headline is “You focus on building. I focus on protecting your brand.”

`index.html` is a retained legacy design-version chooser that defaults to V2 Brutalist. Do not open it when the user asks for the current VB homepage. Changing the root entry or retiring the design archive is separate from opening the correct page; no such source change has been made here.

## Current checkpoint — October 15, 2026

The owner approved saving this LLK prototype on `codex/legal-launch-kit` and pushing that feature branch. This approval does not authorize merging, deploying, enabling signup, or changing accounts, access rules, or databases. This branch must eventually be merged into its originating `codex/attorney-workspace` branch with approval.

Current implementation: the SVG roadmap, five working Formation milestones, local checklist/planning progress, draft acknowledgments with a single confirmation, and a company profile whose saved name labels the central node. Remaining categories are previews. The current design uses straight connections, outward task fans, centered neon lighting, ambient motion, and a mobile/list fallback; later notes supersede earlier experiments.

Both `vb-llk-prototype-v1` and `vb-llk-business-prototype-v1` store data only in the user's browser. No real account or finalized policy acceptance exists. Terms and Privacy remain pending. All 18 focused LLK checks passed for this checkpoint.

The approved planning direction moves acknowledgments into signup and company setup into account onboarding; clicking the company node will then edit its profile. Those integration changes are not implemented. The integration plan is saved outside this checkout at `../outputs/venture-branding-portal-integration-plan.md`. The parent working branch contains newer blog and Trademark Watch commits; preserve these and all unrelated pending work when integration is separately approved. Historical statements below describe earlier stages, not the current checkpoint status.

- Feature branch: **codex/legal-launch-kit**.
- Created from **codex/attorney-workspace**, commit **a078619**, October 14, 2026.
- This feature MUST eventually be merged into its originating branch, with user approval. Do not mistake an isolated preview for a merged or deployed feature.
- Separate checkout: `/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/legal-launch-kit`.
- Phase 1 entry: `free/legal-launch-kit.html`; local preview port 8891.

## Approved Phase 1 scope

Master grid, Formation category with five milestones, complete Founders’ Agreement workspace and supporting Formation workspaces. Existing VB blog links, checklist progress, and a local conversation planner. Other categories are explicitly Phase 2 previews. Desktop sphere grid and mobile list; users may explore in any order. Content is provisional educational prototype copy for owner review.

## Progress and privacy

Only the prototype-specific `vb-llk-prototype-v1` browser storage key is used. Checklists and short planning notes are local to this browser/origin, not sent to VB, not synchronized, and not tied to an account. No client API calls, memberships, database, account settings, installations, paid tools, or Production changes. Browser save failures are surfaced. Reset requires confirmation and overwrites only this prototype's state.

## Product access boundary — preserve

The future free founder area may be available to everyone. Free registration, LLK use, payment, or upgrades MUST NOT grant client portal access. Paid/client workspace access requires an active engagement and an attorney-controlled membership grant. Clients can also use the free tools. Do not grant roles based on email, browser storage, user-editable metadata, or a chosen login screen. Existing client/staff access code is not altered by Phase 1.

## Remaining phases

2. Agree and populate the complete MVP content, planning fields, search, and final interactions. Owner approval required for educational content.
3. Implement free accounts and private per-user progress in Test, verify free users cannot read/write client or staff records, then request Production rollout approval. Public signup is currently disabled; changing it requires separate approval and validation. Confirm that active-engagement grants/revocation match the intended access lifecycle.

Sharing, notification delivery, reminders, automated legal conclusions, and the other sidebar tools in the design references are not implemented. Checking a task does not certify compliance or create an engagement.

## Working with the user

Explain decisions in practical language. Propose and obtain approval for new phases; finish approved routine work without repeated questions. Ask before commits, pushes, deployment, installations, or account/access changes. Preserve parallel Trademark Watch and other uncommitted work. Do not merge automatically. No extra feature phases without agreement.

## Phase 1 verification

Three automated checks passed: save/reload and undo, malformed progress handling, and working resource links/unique routes. Both JavaScript modules passed syntax checks. Local entry returns HTTP 200. Visual appearance and navigation still require owner review; no live account or cross-device tests apply to this prototype. No commit, push, merge, or deployment has been performed.

## Phase 1 visual refinement

Removed the Resource library sidebar link at user request. Master grid now uses asymmetric clusters, Brand Map-inspired navy/coral styling, orbit rings, and milestone satellites. Formation satellites open actual workspaces and reflect checklist status. All other satellites explicitly link to category previews; their content is not implemented. Dense desktop constellation scrolls horizontally where necessary; list mode and mobile layouts remain available. Four automated checks pass after this refinement.

## Reference-aligned visual correction

Replaced the oversized scrolling constellation with a responsive 1280:760 composition that fits the map panel. Category circles have restrained individual glow colors, custom SVG icons, outer orbit rings, and compact satellites with outward-facing labels. This supersedes the earlier horizontal-scroll layout. Mobile/list fallback and prototype access boundaries are unchanged. Four automated checks still pass; owner visual review remains necessary.

## Glow and interaction refinement

Removed background orbit ellipses. Responsive SVG masks cut all connectors out underneath large and small circles, including unrelated lines crossing a translucent circle; ResizeObserver updates these cutouts. Added restrained neon glows, a slow ambient background drift, and 3.5% desktop hover expansion. Reduced-motion preferences suppress animation and expansion. Existing four progress/resource tests pass; visual owner review remains pending.

## Zoomable roadmap refinement

Added zoom in/out, percentage, Fit map, and mouse drag-to-pan on empty map space. Native scrolling and keyboard scrolling remain available; touch/mobile retains the readable list. A 1440×855 internal canvas preserves layout spacing, with initial fit-to-panel scaling. Changed heading typography to Inter, regrouped Fundraising satellites, and introduced gently curved category/branch connections. Existing SVG node cutouts apply to the curved connections too. No account or progress-storage changes. Owner review of these new interactions remains pending.

## Sphere Grid reference clarification

User clarified that the reference concerns interconnected local node patterns, not curved lines. Restored straight segments and rebuilt the master grid as linked eight-point milestone loops around category centers, with short bridges between neighboring clusters. Unnamed smaller stepping stones are decorative junctions, not additional tasks. Working milestones, progress, zoom/pan, neon styling, and node cutouts remain. No game artwork is used. This supersedes the curved-connector layout.

## User-requested visual rollback

Restored the compact reference-aligned layout from before curved connectors and zoom controls. Removed zoom/pan and stepped-loop experiments. Straight hub/category connections, outer milestone satellites, existing fonts, neon glow, ambient drift, edge cutouts, and hover swelling remain. This supersedes both later layout experiments. Phase 1 functionality and saved progress are preserved.

## Focused spacing/readability pass

Owner approved a bounded polish pass. Rebalanced seven clusters, aligned task satellites on outward-facing arcs, strengthened category connections and softened task branches. Removed repeated preview/progress microcopy inside master category circles; one map note explains the implemented/preview distinction. Category-view checklist statuses and local progress are unchanged. Increased master labels and simplified font-size hierarchy. No new navigation or zoom behavior.

## Typography and Offer letters correction

Corrected the inward-facing Offer letters label to face left, consistent with the People cluster. Added a regression check for outward-facing People task labels. LLK now uses a humanist system-font stack (Avenir Next/Avenir/Segoe UI), lighter label weights, larger labels, and matching sans-serif headings. No installed or downloaded font dependency is added.

## Illustrated reference treatment

User approved trying the October 14 8:23 PM image reference. Master map now uses seven luminous circuit-like clusters with concentric engraved rings, small perimeter milestones, gold connecting paths and junctions, and faint drafting geometry. These are native HTML/CSS/SVG, not a flattened screenshot or game artwork. Existing milestones, IDs, stored progress, and prototype boundaries are unchanged. Screenshot chat/project navigation and extra suggested topics were not adopted. The earlier no-background-rings preference was superseded by this new visual reference. Five automated progress/resource/layout-data checks pass; visual review remains with the owner.

## Approved composition correction

Enlarged category cores from 8.7% to 11% of canvas width and central core to 14.4%, retaining ring dimensions. Individually repositioned Formation labels and widened the bottom-cluster spacing. Gold routes now use tested perimeter geometry rather than center-to-center lines; added subtle paired strands and selected neighboring perimeter links. Node interiors have opaque navy backing as an additional safeguard. Reduced green/gold background wash and drafting-ring contrast, softened engraving, simplified the outer frame and legend, and preserved the current font. Six automated checks pass, including actual connector clearance against master node radii. Owner visual review remains necessary.

## Coordinated SVG master-map rebuild

Owner approved replacing only the master-map renderer. `free/assets/llk-atlas.mjs` now owns one 1280×910 SVG drawing plane with explicitly positioned labels, engraved cluster rings, perimeter-trimmed parallel gold paths, central junction network, and faint drafting details. `llk-atlas.css` isolates its styling; accumulated obsolete master-map CSS and code were removed. Shared SVG icons moved to `llk-icons.mjs`. Category/workspace routing and the existing local progress key remain unchanged. A real HTML list accompanies the SVG and becomes the default on small screens. All actionable SVG nodes have links and accessible names. No added topics, login changes, database changes, or paid services.

Verification: seven tests pass, including construction of every working SVG milestone link, explicit label placements, mobile-list existence, progress, and resource links. JavaScript syntax and whitespace checks pass. Rendered the actual generated SVG locally to a PNG using an already bundled image library for visual inspection; this is a drawing preview, not a browser screenshot or proof of live interaction. Local preview remains port 8891. Nothing committed, pushed, merged, or deployed.

## Bottom milestone placement

Moved all Fundraising and Ongoing Obligations SVG milestones onto the southern half of their rings at owner request. Labels face outward with staggered spacing between the two clusters. Other map positions and functionality are unchanged. Added a southern-hemisphere placement check.

## Radial milestone alignment

Aligned the median small node in every cluster with its category-to-business axis, on the outward side. Remaining milestones fan out symmetrically around that axis (36° spacing for Formation, 40° elsewhere), with outward labels. Fundraising and Ongoing Obligations remain south-facing. Added collinearity, outward-direction, and symmetry checks for every cluster.

## Subtle light-flow emphasis — October 15

Slightly increased circle aura and gold path visibility. Added a slow rim highlight and a fine traveling highlight on the parallel business/category connector strands. Layout, labels, and progress are unchanged. Reduced-motion preferences stop the new effects.

## Stronger neon treatment

At owner request, increased colored core/rim halos, milestone glows, icon glow, and gold connector luminosity. Text, geometry, animation speeds, reduced-motion behavior, and saved progress remain unchanged.

## Neon reference correction

Replaced pastel category tones with saturated cyan/blue/violet/gold, added explicit radial SVG halos around core circles, and changed the core fill to illuminate toward its edge. Added a broad gold bloom behind main paths. This creates visible neon light without relying solely on CSS drop shadows. Ring engraving is quieter so the luminous core reads first. Stylesheet URL refreshed to avoid stale local CSS. Positions, labels, routes, and progress are unchanged.

## Darker map background

Darkened the master-map surface and reduced its ambient center wash at owner request. All animations, neon colors/glows, labels, and positions are unchanged.

## Local business onboarding phase — October 15

Approved by owner: central Your business SVG node now opens `#business`; the mobile/list view has the same entry. Before showing the profile, the flow requires five unchecked prototype acknowledgments. Terms/Privacy documents do not exist, so the screen identifies them as pending and explicitly does NOT record acceptance of them. Wording remains draft, not a blanket waiver or privilege determination. Existing engagements are expressly unaffected.

Profile fields: company/working name, optional launch date/unknown option, stage, industry, entity type, country, and state/region. No confidential free-text intake, identity numbers, file uploads, notification, client grants, legal deadline calculation, or account creation. Values are displayed with safe DOM text. Data stays in separate browser key `vb-llk-business-prototype-v1`. Prototype acknowledgment includes draft notice version/date and null terms/privacy versions. Missing, malformed, or stale acknowledgments reopen the gate, including direct profile routes. Local data is editable and is not a security or enforceability guarantee.

Reset removes the local business profile and its draft acknowledgment only; milestone notes/progress use a separate untouched key. Storage failures show session-only behavior. Final policy drafting/approval, actual authenticated acceptance records, private cross-device saving, and public release remain outstanding and require their own approval. No policy links are fabricated.

Research context for owner review: ABA Model Rule 1.18 comments (prospective-client duties depend on circumstances), and Model Rule 1.8(h) (limits on prospective malpractice restrictions). These are not a conclusion about controlling state law: https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_18_duties_of_prospective_client/comment_on_rule_1_18_duties_of_prospective_client/ ; https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_8_current_clients_specific_rules/

Onboarding verification: fifteen distinct automated checks pass. The UI construction test exercises unchecked acknowledgments, blocked continuation, profile save, and profile reset while preserving a separate milestone-storage sentinel. Additional checks cover stale notices, malformed data, validation, all SVG links, and existing progress. These use a lightweight local DOM stand-in, not a live browser; owner screen review remains necessary.

## Business click correction

Owner reported the central node did not respond. Added an explicit full-circle SVG hit target and direct click/Enter handling for the business hash route, while retaining the native anchor. Versioned the entry, atlas, and business imports to prevent stale preview modules. The precise browser-side cause was not confirmed; no live browser inspection was available. Added a click/keyboard route regression check.

## Neon balance adjustment

Slightly reduced broad core/milestone halos and connector bloom from the current neon treatment at owner request. Kept saturated edges, layout, and all animation behavior. Versioned the modified entry/module/stylesheet references so the preview loads the current adjustment. This is not a visual rollback.

## Crescent-lighting correction

Owner identified the lower crescent as the issue. Centered each core radial gradient at 50%/50%, aligned its radius to the circle, and softened the edge fill. Outer halos, neon colors, moving highlights, and background animation remain unchanged. Added an eight-core centered-gradient regression check and refreshed module versions.

## Single acknowledgment refinement

Replaced the separate required checkboxes and policy cards with one readable acknowledgment block and one unchecked confirmation. Included the requested read/understood/accepted Privacy Policy/Terms sentence as clearly labeled draft wording, pending documents and hyperlinks. The actual local record remains prototype-only with null final policy versions and a single `checked.all` flag. Notice version updated; existing profile data is retained while the revised notice is shown once. No real policy acceptance is claimed.

## Profile save button feedback

A successful local profile save changes the button to “✓ Saved.” Editing any field or reopening/refreshing the view restores “Save company profile.” The visual state is not persisted. Failed browser storage never shows Saved; the failure message stays visible. Successful save confirmation remains available to screen readers, with the button providing the visible feedback. UI tests cover save, edit, re-save, and refresh.

## Saved company name on map

After a successful local profile save, the saved company name replaces “Your business” in the SVG center and list-view profile entry. It remains linked to the profile. Long names wrap to a compact label with the full name available through its accessible name/tooltip. No name means the original “Your business” label. Unsaved edits do not change the map; reset restores the fallback.

## Signup preview — October 15, 2026

Owner requested starting integration visually from the public homepage and sign-in. `v8.html` now has plain Login navigation and no header consultation CTA. `login.html` uses Venture Branding Law Portal / Sign in and links to `signup.html`. Signup renders the existing LLK numbered acknowledgment array with one required unchecked confirmation, then a basic account/company form. Create account is explicitly disabled; no authentication, policy records, uploads, browser persistence, password collection, or database changes occur. Existing LLK company/acknowledgment flow is preserved until account integration replaces it. Public signup stays disabled. This is local uncommitted UI work, not completion of the Test account foundation.

## Member portal shell — October 16, 2026

Owner approved a local visual Member shell. `member.html` reuses existing portal CSS/sidebar conventions, links to the Legal Launch Kit and existing company profile, and displays client tools as locked buttons opening an engagement explanation. It never imports the client controller, Supabase configuration, or client records. A saved browser-local company name may appear as a display label only; this is not identity or authorization. No auth/session changes, account creation, schema, permissions, deployment, or inferred client access. The existing client portal remains unchanged. Legal Launch Kit now has a Member home return link. Signup remains unconnected and Create account disabled; do not claim a completed signup-to-account journey. Current company profile still uses the original local acknowledgment flow until later approved onboarding integration. Pending UI source changes are not yet committed.

## Member visual integration — October 16, 2026

Owner requested matching the Legal Launch Kit to the portal aesthetic. Its entry now reuses the full Member sidebar, locked-feature dialog, Member header, portal base styles, and scoped shell overrides. Master atlas renderer, neon effects, motion and storage are unchanged. Home/profile/kit navigation is connected with active-state updates and a mobile menu. Removed top-level prototype/free-working-name banners for the production-style walkthrough. Current Member access wording says authorized by Venture Branding Law. All 18 existing Legal Launch Kit checks passed; account/database integration remains pending.

## Account/engagement foundation prepared — October 16, 2026

Owner approved preparing and implementing the bounded Test foundation. Read `supabase/proposals/portal-membership/README.md` for exact target, package, baseline and limits. Read-only Test inspection completed; additive schema and rollback-based role/RLS checks prepared. Application is awaiting the browser-required action-time confirmation for database permissions. No Test mutations have been executed; no new checks claimed passed. Legacy client access and Production remain untouched. This package intentionally does not cut over existing client records or workers.

## Account/engagement foundation applied and verified — October 16, 2026

User gave explicit action-time approval. Applied the saved package only to Venture Branding BCM Test (imvkhicfmidzbzsbhkzs). All 39 hosted PostgreSQL role/RLS checks passed and fixtures rolled back. All 11 new tables have RLS; four existing client rows and four memberships have identical before/after fingerprints; both legacy access helper definitions unchanged. Zero retained new accounts/engagements/policy versions or synthetic Auth users. See `supabase/proposals/portal-membership/README.md` and verification JSON for exact evidence and source hashes. The new structures coexist with existing access; they are not yet used by signup, sign-in, client records or background workers. No Production changes, invitations, public signup enabling, source commit, push, merge or deployments. Next bounded phase is Test-only registration/sign-in integration, with final policy publication still pending.

## Test registration/sign-in connection prepared — October 16, 2026

Read `supabase/proposals/portal-membership/REGISTRATION.md` for current source, exact Test callback, 30 passed local checks, 19 prepared hosted checks, and actual observed Auth settings. SQL package 05 and callback allowlist entry await browser action-time approval; do not claim applied or end-to-end signup verified. The owner must privately enter any real credential. LLK design unchanged; Test progress is isolated per user but remains browser-local. Recovered this branch and pending files from Desktop stash after an external branch switch; stash retained. Nothing committed or merged.

## Test registration setup applied — October 16, 2026

User explicitly approved package 05 and exact Test callback. Applied successfully; all 19 hosted onboarding checks passed, fixtures rolled back, original client/membership fingerprints unchanged. The sole saved Test callback is http://127.0.0.1:8893/login.html. Local Test signup returned HTTP 200. Real signup/email/password completion awaits user-operated private entry; do not claim that roundtrip verified. Read REGISTRATION.md and registration-verification JSON. Production unchanged; no commit or push.

## Dummy policy documents for the dry run — October 16, 2026

Owner explicitly requested Terms and Privacy pages filled with lorem ipsum, so dry-run flow can proceed without repeated policy caveats. Added `terms.html` and `privacy.html` and linked both from the single signup acknowledgment. Removed the special unfinished-policy wording from Test signup; links open separately so registration details are retained. These are plainly placeholder lorem ipsum documents, not substantive legal drafting. Existing Test-only consent storage remains as implemented; no production publication or backend policy-version change. Do not treat unfinished policies as a blocker to this authorized dry run.

## Email confirmation resume correction — October 16, 2026

Owner reported verification returning to acknowledgments. Signup initialization previously reset the checkbox and never resumed onboarding after the verified session returned. It now validates the pending draft against the verified email/current notice, resumes the existing Test onboarding RPC, clears that draft on success, and routes directly to Member home. New submissions retain the non-password pending draft across tabs as well as in the current tab; no existing browser profile/planning notes are imported. Mismatched drafts cannot resume another email. Eight focused account tests passed, including the actual controller returning from verification in another tab. No backend or Auth settings changed. Real user signup completion still awaits confirmation.

## Real Member account check passed — October 16, 2026

User reached Member home after private registration/verification. MZP117 LLC is read from the database and survives reload; account profile opens without repeated acknowledgments; client-tool lock explanation works. SQL confirms active verified Member, one profile/company/onboarding record, zero legacy client memberships or engagement grants. Left user signed in on Member home. See REGISTRATION.md for scope and evidence. No commit/push yet.

## New-user invitation sent — October 17, 2026

Owner approved proceeding with Gmail plus-address test. Saved `mithrilzeppelin117+newclient@gmail.com` as fictional Cotivate contact through Client Settings, created the separate draft “FICTIONAL TEST — new-user invitation” / initial matter “FICTIONAL TEST — new-user onboarding,” reviewed and sent exactly one invitation. UI confirms Invitation sent; two actual Test emails total across both workflows. Existing accepted engagements/account left intact. New user must privately open email, set credentials, complete acknowledgments/profile, and accept invitation. No credentials/tokens read and no acceptance performed by agent. No new deployment/DB schema change/Production or research changes. Screenshot: parent outputs/new-user-invitation-sent.jpg.

## New-user walkthrough confirmed — October 17, 2026

Owner reports the plus-address invitation flow worked and supplied the 10:58:59 AM Client Brand Map screenshot, showing fictional Cotivate workspace and Client navigation. Both real existing-Member and new-user walkthroughs are now confirmed by owner-operated flows/UI evidence. No further email or account changes performed. Next proposed validation is multiple-engagement lifecycle: close one while another remains active, then close the last and verify Member access/Legal Launch Kit progress retained. That live walkthrough has not yet been performed; prior rollback-based database checks remain separate evidence.

## Returning-client invitation sent — October 17, 2026

Owner approved the returning-client walkthrough after push of 8e16f13 was verified (0 ahead/behind). Existing plus-address account has only the two closed target engagements, with original task-0 unchecked and saved. Captured read-only company/profile/progress fingerprints without planning text. Created “FICTIONAL TEST — returning-client engagement” / “FICTIONAL TEST — returning-client matter” through attorney UI, using unchanged saved contact mithrilzeppelin117+newclient@gmail.com, and sent exactly one new invitation. UI confirms Invitation sent. Owner must open newest email and accept privately; restoration is not yet verified. No code, deployment, permission/schema, research or Production change in this phase; no commit of these new verification notes yet. See lifecycle/returning-client-verification JSON and parent outputs/returning-client-invitation-sent.jpg.

## Returning-client walkthrough passed — October 17, 2026

Owner privately accepted latest invitation and confirmed Client Portal landing. In-app signed-in user then loaded Brand Map successfully with zero marks: both old fictional mark records stayed hidden. Attorney client page shows the new returning-client engagement 63dfa7ef-095e-4004-b62b-65cf8f3a79d7 Active and the previous two target engagements Closed; both retained marks remain available to staff. Read-only database check confirms one new active grant-backed engagement for the plus-address user; company/profile/progress fingerprints exactly match the pre-invitation baseline, and prior unrelated engagements/config flags are preserved. All 8 state comparisons passed. No code/permissions/deployment changes or extra email in this verification turn. Documentation only is uncommitted after pushed checkpoint 8e16f13.

Core existing-Member, new-user, multiple-engagement closure and returning-client flows now have actual walkthrough evidence. Next suggested functional integration: shared Member/Client navigation and badges so Client users opening Legal Launch Kit can return to their Client tools rather than seeing the always-Member shell; keep the sphere-grid design unchanged. Requires owner approval before implementation.

## Client-aware Kit navigation — October 17, 2026

Owner approved the navigation adjustment. `free/assets/member.mjs` now uses only the server-verified memberContext.entry=client to show Client badge, route Home to Client portal, replace six locked tool buttons with root-correct Client links and add Account Settings. Existing icons are reused, lock icons removed only in Client branch; Member/presentation defaults retain their existing locked buttons/explanation. Destination access checks stay authoritative; no grants, policies, database, research or deployment changes. Cache versions updated in Member and Kit HTML; atlas/map assets unchanged.

Validation: 13 focused routing/account checks passed, syntax and whitespace checks clean. Actual signed-in returning Client browser shows Client badge and all expected links; Kit -> Portfolio -> Kit roundtrip loaded correctly and returned to Client navigation. Screenshot in parent outputs/legal-launch-kit-client-navigation.jpg. A separate real Member browser sign-in was not repeated for this presentation change; the Member branch is unchanged. Navigation follows verified context on load, not a live engagement-change subscription. Nothing committed yet after pushed 8e16f13; returning-client verification notes are also pending checkpoint.

## Approved navigation checkpoint — October 17, 2026

Owner approved committing Client-aware Kit navigation and returning-client verification notes on codex/legal-launch-kit. Includes only the navigation presentation change, Member/Kit script cache versions, and verification documentation. Thirteen focused checks and actual Client Kit/Portfolio roundtrip passed. No push/merge authorized by this approval. Feature branch remains separate and must eventually be merged into its originating Venture Branding branch with owner approval.
