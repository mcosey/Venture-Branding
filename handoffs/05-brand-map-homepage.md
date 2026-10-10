# Brand Map client homepage — October 9, 2026

Mario approved the ecosystem prototype and a bounded read-only portal integration. `portal.html` is now the Brand Map homepage in the local checkout. Login already routes clients there. Nothing was committed, pushed, deployed, installed, or changed in Supabase.

## Implemented

- Company workspace at the center; surrounding cards are existing legal records, not business assets or master-brand designations.
- Record counts, factual statuses, selected-record panel, Portfolio and trademark deep links retaining client ID.
- Six records per map page with pagination for larger portfolios; zoom/reset, keyboard selection/focus, phone cards, reduced-motion support, and empty portfolios.
- Existing signed-in loader and database access rules reused. Model excludes other clients and archived records and projects only explicit client-visible fields. Internal notes do not enter the map.
- BCM, Watch, evidence, activity, review actions, and saved brand relationships remain unconnected to the map. Their separate work is preserved.

## Files and coordination

New: `portal/assets/brand-map-model.mjs`, `portal/assets/brand-map.js`, `portal/assets/brand-map.css`, `tools/brand-map.test.mjs`.

Shared edits: `portal.html` adds the stylesheet, updated page title/home label, and client-script cache version. `portal/assets/client.js` adds an import, updates the home label on client pages, routes only `page === 'portal'` to the map after client selection, and removes the old homepage rendering block. Existing pending BCM/Watch imports and page branches were retained. Do not overwrite this shared controller while finishing parallel work.

Branch: `codex/attorney-workspace`, with prior staged and unstaged BCM/Watch work. Only this phase’s source changes should be considered for later approval; do not stage the whole checkout indiscriminately.

## Verification and limitations

22 targeted Node tests passed using `node --test tools/brand-map.test.mjs tools/connection.test.mjs tools/auth.test.mjs`. Coverage includes model isolation and field projection, inactive Cotivate status, safe text rendering, client switching, empty and large portfolios, zoom/reset, links, actual portal-controller routing through a simulated authenticated loader, unsigned/tampered client requests, and existing role/MFA checks. JavaScript syntax and whitespace checks passed.

Tests use simulated page elements and database responses. Existing SQL RLS policies were inspected; live deployed policy behavior and browser desktop/mobile rendering were not verified in this environment. No real client data or credentials were used. The earlier local-file browser opening and local preview-server attempt were blocked by tool/environment restrictions.

A review copy built from the same model/renderer/CSS with isolated fictional records is in this chat’s `outputs/client-homepage-preview.html`. It is not an authenticated portal or a deployed site.

## Next bounded step

Review the implementation in the signed-in local portal and verify the deployed database policies in a separately authorized test environment before any release. Saving business assets/relationships requires a separate approved shared contract and coordinated database phase with Launch Review and Preflight. Commit/push/deployment still require Mario’s approval.


## Signed-in browser verification follow-up — October 9

Mario signed in to the real local portal. Cotivate’s actual record rendered correctly as inactive/abandoned with no registration. Selected-record details, authenticated trademark link, Portfolio navigation, and return to Brand Map passed. Phone checks at 390 × 844 passed without horizontal page overflow. Deliberately unavailable client and mark IDs were denied without exposing records. These are page-level checks; full live cross-client database isolation remains unverified without a second authorized test client/account. No code or database/account changes were made during verification.

Desktop sample verification found a 792-pixel map inside a 656-pixel panel at the normal 1280-pixel viewport, requiring horizontal scrolling. Ask Mario to approve the small local layout correction before editing. Preserve the current authenticated tab and signed-in account; no credentials were extracted. Evidence and report are saved in this chat’s outputs folder.


## Approved laptop layout correction — October 9

Mario approved this bounded display fix. The map now uses full width below 1440px, with details below; wider desktops retain the side panel. The spatial canvas is capped at 920px, its prior height clipping is removed, and screens at or below 1050px use readable cards. Selection scrolls to details when the layout is stacked. CSS/module cache versions were updated and the isolated review copy regenerated. Database, access, data model, and BCM/Watch behavior were not changed.

Nine targeted map/controller tests passed. Browser measurements with six records plus the company card passed at 1280, 1440, 1051, 1050, and 390px: no horizontal overflow, out-of-canvas cards, or overlapping cards. The signed-in Cotivate homepage also passed at the normal 1254px browser width. Browser sizing was restored and the authenticated homepage was left open. The temporary fixture page was removed. Cross-client database testing still needs a second authorized test account. Nothing committed, pushed, or deployed.
