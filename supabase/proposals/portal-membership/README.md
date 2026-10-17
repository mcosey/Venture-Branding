# Member and engagement foundation — Test only

Prepared October 16, 2026 on `codex/legal-launch-kit`. **Applied and database-tested in the designated Test project on October 16, 2026.**

## Target and baseline

Only `imvkhicfmidzbzsbhkzs` (Venture Branding BCM Test), database system identifier `7692130048193495360`. Every executable mutation package rejects other databases. Production `omvkwiosonatswocbdgx` is excluded. Browser SQL editor read-only inspection confirmed the target and existing functions.

Before application: `vb_clients` 4 rows, fingerprint `910249c562ca27860858146771e2fa6d`; `vb_private.client_memberships` 4 rows, fingerprint `fa3747007aff32f9e9f7558cff515963`. Existing `vb_session_role()` and `is_client_member(uuid)` are unchanged.

## Concrete application

1. Apply `01-test-foundation.sql` as trusted database administrator in the named Test project. Transactional, no backfill, no accounts, policies, grants, matters, services or engagement records seeded. The new tables default to no browser access except the explicit narrow policies. Existing tables, functions, scheduled jobs, secrets, and signup configuration are not modified.
2. Run `02-test-access.sql` in Test. It inserts synthetic fixtures in a transaction, exercises actual PostgreSQL roles and RLS, and rolls back all fixtures. No passwords or emails are sent; this does not test Auth signup or invitation delivery. The final result must show all checks passing. A failure aborts the transaction; use ROLLBACK before another editor run if needed.
3. Run `03-test-preservation.sql`; compare fingerprints and ensure zero retained new accounts/engagements/policy versions. Confirm original membership helper and role RPC definitions unchanged.
4. Record actual query results and package fingerprints here. Do not label prepared checks as passed.

## Included boundaries

- Protected administrative account state, independent of engagement status. No browser provisioning/self-promotion.
- Owner-only Member profile, companies, and per-company progress. No automatic upload of existing browser-local data. Member companies do not link to legal clients by name/email. Staff have no automatic access to Member planning notes.
- One legal client can have several engagements; each engagement can have several matters and separate user grants/services. Only an active account, accepted active grant, active engagement and enabled/unarchived legal client passes the new engagement check.
- Explicit service entitlement check is separate from engagement existence. Engagement closure denies its new matters/services while preserving records and other active engagements.
- Account classification derives from current grants: member/client/alumni, with separate verified-MFA staff handling. Disabled staff cannot fall back to Member access. Suspension/archive does not close engagements.
- Policy versions and immutable-to-browser acceptance storage are reserved for later finalized signup. No fictional acceptance or draft policy publication.
- Administrative lifecycle writes are audited. These structures are controlled by trusted administration; no new browser management RPC is included.
- `04-disable-test-foundation.sql` revokes new browser entry points without deleting any data. It does not alter old portal access.

## Deliberate coexistence, not a completed cutover

The existing portal still uses legacy client membership and existing worker checks. The new Member/engagement model is additive. **Closing a new engagement does not yet revoke access to legacy client-scoped marks/messages/BCM/Watch**, and the UI does not yet use the new classification. Do not represent this as complete engagement-based authorization for the existing application.

Before cutover: review actual legal client/engagement/matter mappings with the owner, associate legacy records/services with the appropriate scope, update invitation acceptance and all relevant API/RLS/worker checks, and verify legacy clients retain intended access. Do not auto-create fictional active engagements or backfill all records into a blanket scope. Existing account invitation restrictions need replacement for existing Members and multi-business invitations. This package does not implement invitation tokens, expiry/reuse protection, signup/email verification, final policy acceptance, account-backed UI persistence, background cancellation, billing, or Production migration.

Public signup remains disabled; registration and Member/Legal Launch Kit screens remain local presentation work. The UI's Member badge is not authorization. No branch merge, commit, push, installation or deployment is part of this application.

## Verified application — October 16, 2026

The user explicitly confirmed applying the package to Test and running the checks. `01-test-foundation.sql` completed successfully in the Supabase Test SQL editor. `02-test-access.sql` returned **39 passed checks, all_passed=true**. Its transaction rolled back synthetic users, legal clients, engagement grants, matters, profiles, planning data and lifecycle audit fixtures. Browser-submitted source strings were compared byte-for-byte with these saved files: both matched.

Read-only post-application verification:

- Same Test system identifier `7692130048193495360`.
- All **11 new tables** have row-level security enabled.
- Existing clients remain 4 rows / fingerprint `910249c562ca27860858146771e2fa6d`.
- Existing memberships remain 4 rows / fingerprint `fa3747007aff32f9e9f7558cff515963`.
- Existing `vb_session_role()` and `vb_private.is_client_member(uuid)` definitions match the pre-application definitions.
- Zero retained portal accounts, engagements, policy versions, or synthetic Auth users.
- No Production query or mutation, public signup/configuration change, invitation email, real account change, worker deployment, or job activation.
- SQL editor warns its static detector cannot see dynamic RLS statements; the package explicitly enables RLS on all 11 tables inside its transaction, independently verified after application. No existing protection was disabled.

Evidence: `../outputs/member-foundation-test-verification.jpg` relative to the parent chat directory. Machine-readable local record: `verification-2026-10-16.json`. The disable fallback remains unapplied. Do not rerun the create-table package against the already initialized Test schema. These are real hosted PostgreSQL role/RLS tests, not signup/session/HTTP tests. Subsequent registration/sign-in connection is separately approved work; the existing application still uses legacy access as described above.
