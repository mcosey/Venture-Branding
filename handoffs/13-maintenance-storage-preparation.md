# Maintenance storage preparation — 2026-10-10

Continue from handoffs/07-maintenance-reminder.md and 09-attorney-maintenance-preview.md. Brand Launch Review remains shelved.

Approved scope completed: local repository adapter, optional connected attorney editor/client renderer, proposed SQL and tests. Real storage remains OFF. No hosted schema change, installation, commit, push, deployment or account/access changes authorized or performed.

## Files

- auth/maintenance.mjs: activation flag false, MFA staff RPC adapter, optimistic server versions, public field whitelist, sign-out generation/cache clearing.
- attorney/assets/maintenance-editor.js: optional repository with async save/publish/withdraw; default memory preview retained; late context results ignored, failed loads leave editing unavailable, close/reopen during pending work waits for the current operation then loads the new context.
- attorney/assets/workspace.js: initializes optional repository only after existing authenticated staff load; sign-out clears editor.
- portal/assets/maintenance.js and client.js: optional reads of verified publications, existing accessible mark matching, loading/error/empty distinction, ignores replaced client screens; preview stays default while off.
- attorney.html and maintenance.html: maintenance cache references updated without activating storage.
- supabase/proposals/maintenance/: proposed SQL, prepared pgTAP tests, README with validation and activation boundaries. Not automatic migrations.
- tools/maintenance-connection.test.mjs, maintenance-editor.test.mjs, maintenance.test.mjs: repository and UI tests; maintenance controller mock updated for existing gate.current ticket API.

## Checks

44/44 pass:
`node --test tools/maintenance-connection.test.mjs tools/maintenance-editor.test.mjs tools/maintenance.test.mjs tools/brand-map.test.mjs tools/connection.test.mjs tools/auth.test.mjs`

Browser: authenticated attorney tab local fictional draft save/publish succeeds and scrolls/focuses confirmation; no private source in client preview. Saved screenshot is thread outputs/maintenance-preparation-check.png. Only fictional in-memory data entered.

Database tests NOT RUN. No available psql/Supabase CLI/Docker; no installation. Proposed permissions, SQL syntax, audits and concurrency remain unverified at database level. Do not describe real persistence as working.

## Next phase to propose

Read-only check/planning for an isolated database test environment, bounded to selecting a concrete way to validate this proposal. Explain impact and request approval before setup, installations or hosted changes. Then test in the separately approved isolated environment; do not apply directly to the connected project.

User requires plain language, approved bounded phases, preservation of concurrent BCM/Watch/Brand Map work, explicit permission before commit/push/deploy/install/access changes, and every final ending with a recommended next step plus approval request. Recommend an appropriate model/effort without assuming maximum reasoning.
