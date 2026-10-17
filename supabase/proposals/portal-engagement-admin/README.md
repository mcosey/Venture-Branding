# Attorney engagement drafts — Test only

Prepared October 16, 2026 on `codex/legal-launch-kit`. Applied only in Test with explicit action-time approval. No commit/push/merge authorized.

Owner clarified: all Clients have all Client features; no tiers or feature picker. Member signup/activity is private. Calendly consultation is distinct from the attorney entering an email to invite a person after separately agreeing to engage. Existing Members reuse their accounts; new invitees must register/verify. Later engagements reuse the verified relationship, and final closure yields Member functionality.

## This bounded step

- `attorney-engagements.html`: protected attorney draft setup for an existing legal client or new legal-client details, engagement title, initial matter and manually entered recipient email. Review before saving; edit revision-checked drafts. No account lookup, Member directory or Member activity. Existing Test attorney workspace links to Engagements; its obsolete invitation controls are replaced by the engagement entry.
- `01-test-admin.sql`: Test guard, private RLS-protected draft storage, audited changes and MFA-only list/save RPCs. Saving does not create any Auth account, legal client, engagement, grant, invitation, email, policy acceptance or job. New-client information remains a draft until the separately implemented invitation/activation transaction. All-feature rows are automatically present/enabled for all engagements; access helpers check engagement scope and allowlisted feature names rather than enabled-per-feature tiers. Configured service ownership and record-scope checks remain intact. Global readiness, paid research and Production are unchanged.
- `02-test-checks.sql`: actual role/MFA denial, no Member directory, atomic/idempotent draft save, stale revision rejection, no premature client/grant/account creation, new engagement automatic full feature inclusion. All synthetic draft/engagement changes roll back.
- `prepared-rehearsal.sql`: same migration plus checks with final rollback; run before applying. Run installed checks and previous 54 cutover checks after application. The prior fixture insertion is now conflict-tolerant because engagements automatically create all eight service rows.

## Explicitly next, not claimed complete

Email delivery, invitation tokens/expiration/revocation, recipient verified-email acceptance, invited new-user onboarding, creation/activation of represented clients/engagements, and later-engagement authorization are not connected in this screen. The legacy `client-invite` Edge Function is not repurposed: it rejects existing verified accounts and cannot supply the new flow. No real email is sent in this step.

Owner supplied the browser action-time confirmation before rehearsal/application. Database access-policy changes require that confirmation under the browser tool policy, even though ordinary source preparation is authorized. The reviewable migration/checks are complete before requesting it. Do not infer approval for Production, email delivery or committing from this phase.

## Actual validation

All 22 rollback rehearsal checks and all 22 installed-package checks passed. The earlier 54 engagement-isolation/closure checks passed against the all-features correction. Local regression suite: 28 passed. Original client/membership fingerprints, four active original engagements, service bindings and AI/scheduler/Watch settings match the prior checkpoint. All rollback drafts and synthetic engagements were removed by rollback. No email, account, legal client, engagement activation or access grant was created by the browser save.

Real signed-in Test attorney saved one clearly labeled fictional Cotivate draft, reloaded and reopened it for editing. That harmless planning draft remains available for owner review. See `verification-2026-10-16.json`; parent outputs contain screenshots. The SQL rehearsal corrected a PL/pgSQL CASE-expression delimiter before the final successful runs. No source commit/push/merge performed.

## Owner-approved navigation refinement — October 17, 2026

Engagements now sits inside each legal client's page, with Add engagement and Edit draft. No standalone navigation item. `attorney-engagements.html?client=<id>` is a client-specific editor, with the client fixed and a return link; no client chooser or new-client creation here. First add a legal client through the existing Clients workflow. Direct editor entry without valid client context returns to Clients. Only the selected client's drafts are rendered; existing engagements are listed in client detail. The database schema and access checks are unchanged. Real attorney browser verification covered Cotivate and Mithril separately; no draft writes were necessary for this UI refinement.
