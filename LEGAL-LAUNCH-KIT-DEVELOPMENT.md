# Legal Launch Kit development — persistent branch note

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
