# VB database foundation

The migration and approved sample seed were applied to Venture Branding on October 4, 2026. All 39 database-level isolation tests passed and rolled back their temporary data. See [VERIFICATION.md](VERIFICATION.md) for evidence, exact file fingerprints, and limitations. No application screens, real Auth accounts or live integrations are connected. No software was installed locally. This is a tested database foundation, not a production-ready application.

## Files

- `migrations/20261003000100_client_foundation.sql`: database structure, explicit permissions, row-level policies, update history and preference initialization.
- `seed.sql`: approved Cotivate LLC / Mario Cosey / Cotivate example. No invented email, type, status or filing numbers; no users or access grants. Do not apply this sample seed to a real production dataset.
- `tests/database/client_access.test.sql`: transactional pgTAP tests using separate synthetic users and records, rolled back after the test. These tests passed in the dedicated hosted development project. They simulate JWT claims at the database layer; they do not prove Auth invitation delivery, MFA enrollment or HTTP token verification.
- `config.toml`: local-only configuration template with signup/anonymous accounts disabled, public API limited to `public`, and TOTP enrollment/verification enabled. Hosted settings require separate configuration and verification.
- `.env.example`: variable names only; future code must clearly separate browser-safe settings from server secrets.

## Access model

| Record | MFA staff | Invited active client | Uninvited/signed-out |
| --- | --- | --- | --- |
| Client/contact | Read/create/update | Read own enabled, unarchived client | None |
| Trademark | Read/create/update | Read own unarchived marks | None |
| Clio/QuickBooks references | Read/create/update | None | None |
| Service preferences | Read | Read/update only enabled flag for own client | None |
| History/audit | Read | None | None |
| Staff/client membership | No direct browser access | None | None |

This first version has one firm-wide staff class. All active MFA staff can see all firm clients; assigned-matter/team roles need a separate design before inviting additional staff. Database access checks actual protected membership rows on every request, not user-editable metadata or an email match. Even staff with a client membership must use MFA. A disabled staff row denies access rather than falling back to client privileges.

Archiving or disabling a client immediately removes that client's database access; staff retain records and can restore them. This is a proposed live-data policy, stricter than the current visual prototype's archive action. Confirm the desired access/retention behavior before deployment. There are no hard-delete grants for browser users. Existing marks may still be edited by MFA staff after client archive; new marks may not be added to archived clients.

All five services are available with the portal add-on. Preference rows start off and can be changed by the client. A toggle is not a job, a verified deadline, or a billing action. Agree initial defaults and the distinction between client reminders and internal deadline obligations before automation implementation.

Mark type/status are nullable for unknown information. Linking a USPTO record must update the existing mark ID, not insert a duplicate. Changes preserve a prior-value snapshot with actor and time. Lookup transport, source verification, duplicate-link handling and derived status mapping are future work; there is no live USPTO API code here. Never label DEMO fixtures as actual USPTO data.

## Trusted provisioning boundary

A future server-only invitation workflow must verify the acting staff identity and MFA, then validate client ownership/scope before using privileged credentials. Grant membership only to the intended Auth user and handle invitation failure/retry safely. A signed-in account without a membership gets no portal data. Public signup is disabled as an additional control, not the authorization boundary.

Staff and client memberships have no browser write grants. Initial staff provisioning must be explicitly authorized and performed through trusted administration after MFA setup, not through frontend signup. Membership lifecycle/audit, invitation expiration, recovery, staff session revocation and network-level Auth tests remain required. No convenience bootstrap password or privileged RPC is included.

Security-definer helpers live in `vb_private` with fixed empty search paths and restricted execution grants. Do not expose that schema through the Data API. Service-role/secret credentials bypass row policies by design: never place them in browser code or use them for routine browser CRUD. Regular staff and client operations must use the verified user's session.

## Future verification workflow (requires approval and a disposable environment)

1. Approve the test environment and any necessary CLI/container installation. Match the chosen PostgreSQL major version to `config.toml` and pin the tested CLI version.
2. With the local Supabase runtime available, use `supabase start`, then `supabase db reset` **only on the disposable local database**, then `supabase test db`. Reset deletes local data; never add `--linked` or target an existing project for this test.
3. Record actual test results, fix failures and repeat on a clean database. Check seed idempotency and migration execution. Static file checks are not a substitute for these steps.
4. Check hosted project settings separately: only required exposed schemas, disabled public/anonymous signup, exact auth redirect allowlist, MFA enrollment/verification, protected secrets, and approved email delivery. Local config does not apply these settings to a hosted project automatically.
5. Test real server/API requests as two different clients, an uninvited account, signed-out user, MFA staff, non-MFA staff and disabled staff. Include token expiry/revocation, invitation/recovery paths, and malicious direct API requests.
6. Only after checks pass, obtain approval to connect the frontend. Verify clean rebuild and record the steps in the launch-readiness plan.

Test coverage authored: cross-client reads/writes, mark edit/create denial for clients, preference column restrictions, protected membership writes, metadata impersonation, staff MFA and deactivation, archive/portal disable/membership revocation, immutable ownership, prior-value history and staff audit-tampering denial. All 39 assertions passed in the hosted development project; clean-rebuild and real Auth/API workflow tests remain outstanding.

## Scope still outstanding

Auth screens and email delivery; actual invitation endpoints; secure staff bootstrap; membership change auditing; client requests; live USPTO integration; background services; storage/file policies (no buckets created); persistent frontend wiring; production backups and recovery. External account references are text only. Do not add triggers that synchronize to Clio or QuickBooks without approval.

Official references consulted:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/testing
- https://supabase.com/docs/guides/local-development/cli/config
- https://supabase.com/docs/guides/auth/auth-mfa/totp
