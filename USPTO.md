# USPTO lookup — implementation checkpoint, October 4, 2026

User approved building an attorney-initiated lookup/review/save flow. User stored USPTO_API_KEY in Supabase and supplied serial 88897764. Migration applied and function deployed October 4, 2026; live authenticated preview succeeded. User approved live import, saved and verified in both portals.

## Design

- Attorney enters eight-digit application serial in Add New Mark or Link USPTO Record. Existing mark ID/history stays intact. Registration-number entry deferred; imported registration number is displayed when present.
- Function validates actual Auth identity and vb_session_role=staff (which requires MFA). Uses caller-scoped Supabase client/RLS, no service-role client. Clients cannot call it successfully. CORS default only http://127.0.0.1:8000; add exact production origin when approved.
- Fixed official TSDR XML URL, secret header, 12-second timeout, 2MB response cap, no redirects/DTD/entities. Does not log credentials or raw records. No scheduled refresh jobs.
- Preview is read-only. Save requires owner checkbox and re-fetches from USPTO; compares a SHA-256 fingerprint of normalized fields to the reviewed result. Never saves browser-supplied record fields. Changed records require another review.
- Save RPC locks active client, rejects stale mark edits, preserves mark ownership and audit triggers. Unique active serial per client prevents duplicate creation. Adds filing/registration/status dates, not calculated legal deadlines.
- Existing attorney access remains trusted to edit records under existing RLS. RPC is staff/MFA-only; it is not a separate provenance boundary against a malicious authorized attorney.

## Parser limits / release gate

Official documented legacy case-file XML supported; a different live schema fails closed. Live TSDR response has NOT been verified: unauthenticated sample request returned HTTP401. Synthetic parser fixtures only.

Only known codes categorized; other codes retain their number/text and map to Other, never inferred Registered. Descriptions supplied in response are retained; otherwise limited documented code labels used. Unknown drawing types remain unspecified. Multiple distinct owner names or missing mark text fail for manual review, rather than choosing historical/current owner incorrectly. Test Cotivate's real response before expanding parser support. No owners/addresses silently invented.

## Secure setup and deployment

1. User obtains TSDR key at https://account.uspto.gov/profile/api-manager using their own USPTO login. Do not paste key into chat or Git. User stores it as USPTO_API_KEY in Supabase Edge Function Secrets.
2. Review/apply migration 20261004000200_uspto_import.sql; run existing client_access.test.sql plus new uspto_import.test.sql (transaction rollback). Resolve any existing duplicate client/serial pairs before unique index; never delete duplicates automatically.
3. Deploy uspto-lookup with included deno.json. verify_jwt=false disables the platform's legacy-key check only: handler MUST retain getUser + server-derived staff/MFA checks before any lookup. No admin DB key needed.
4. Test deployed endpoint: unsigned and client calls denied; valid attorney request preview only; unavailable key/401/429/timeout leaves data unchanged; correct Cotivate preview; owner confirmation; save same mark; refresh client portal; verify exact abandoned status. Do not skip this release gate.
5. Save migrations, function and docs in Git for rebuild. Re-enter key and allowed origins on new project; secrets do not live in Git. Previous migrations applied manually, reconcile CLI history before db push.

## Local checks

`npm ci --prefix supabase/functions/uspto-lookup --ignore-scripts` installs only local parser test dependency; node_modules ignored. Deno production imports pinned npm dependencies via deno.json.
`node --test tools/auth.test.mjs tools/connection.test.mjs tools/uspto.test.mjs`: 25 checks passed (12 USPTO checks). These cover malformed XML, abandoned/unknown status, identifiers, fixed URL/header, auth role denial, preview no-write, re-fetch on approval, tampered/unconfirmed previews and stale mark denial using mocks. Hosted SQL and deployed preview verification are recorded below.

Browser verified authenticated attorney opens Link USPTO Record and empty serial is rejected. Live preview and approved save verified. No synthetic records written to hosted database.

## Sources

- https://www.uspto.gov/trademarks/apply/check-status-view-documents/trademark-bulk-data
- https://tsdr.uspto.gov/faqview (info.xml endpoint)
- https://www.uspto.gov/sites/default/files/products/applications-documentation.pdf (legacy XML fields and status codes; old documentation, validate live result)
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/auth

## Deployment progress — October 4, 2026

Explicit user approval received to apply migration, deploy and preview 88897764, but NOT save the returned Cotivate record. Migration 20261004000200 applied successfully through SQL Editor (CLI history still unreconciled). New SQL test finished 1..9, existing isolation test finished 1..51, no failure summary; both rolled back.

Deployed uspto-lookup through dashboard as a single file assembled from tested record.mjs and handler.mjs, with exact npm version imports. Reproduce via tools/bundle-uspto-dashboard.mjs. Legacy JWT gateway switch off; handler still validates Auth user and protected staff/MFA role before accessing USPTO, and all database operations use caller RLS. Unauthenticated HTTP test returned 401. Key was entered by user; agent never retrieved its value.

Live attorney preview succeeded for 88897764: COTIVATE, Word, Cotivate LLC, code 606, filed 2020-05-01, status date 2023-11-27, no registration. No record saved. Current TSDR response uses ST96 TrademarkTransaction, not legacy case-file XML; parser supports both. XML Schema date timezone is retained as its calendar date. Multiple historical owner names must agree or import stops for manual review. Temporary diagnostics removed and final parser redeployed. Synthetic tests cover ST96, historical owner conflicts, identifier mismatch and dates. User approval required before actual save; then verify same mark in attorney/client portals. No commits or pushes for this phase.

## Approved live import — October 4, 2026
User explicitly approved saving the preview. Fresh lookup matched approved details; confirmation checked and Update mark succeeded. Reloaded both authenticated portals: exactly one COTIVATE mark, same ID 20000000-0000-0000-0000-000000000001, Word / Inactive. Attorney detail confirms application 88897764 and USPTO source. Client detail confirms owner Cotivate LLC, exact status 606 — Abandoned — no statement of use filed, filing date 2020-05-01, status date 2023-11-27, no registration, retrieval timestamp 2026-10-04 22:28 UTC. No duplicate created. Screenshot ../outputs/vb-cotivate-imported.png. This supersedes earlier save-pending notes. Import is manual, not scheduled monitoring. User approved committing this checkpoint; user will push through GitHub Desktop.
