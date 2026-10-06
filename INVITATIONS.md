# Attorney invitation and access controls

October 5, 2026. Activated with explicit user approval. No invitations sent or existing accounts changed. User approved implementation and deferred Clio/QuickBooks fields. Cotivate remains active with its original membership. Last pushed checkpoint before this work: 2768a58.

## Workflow
- Add/edit client: details → review, no external-tool fields. Existing reference values are preserved on save; no integration added. New client defaults portal-disabled; saving never sends mail.
- Portal access card reads protected status: Not invited, Invitation pending, Active, Disabled, Archived, Sending invitation, or Invitation needs attention. Existing Cotivate account is recognized from protected membership and Auth confirmation, not metadata or contact email.
- Explicit enable/disable confirmation. Invitation modal separately confirms exact client/email before send. Existing sign-in email is read-only; updating contact email does not alter credentials.
- Send/resend supported for unconfirmed invites. Confirmed users do not receive a new invite or get silently attached to another client. This first phase supports one sign-in account per client; new multi-user clients require a later approved design. Existing multiple memberships are not migrated/deleted.
- Archive and restore always leave portal disabled. Re-enable is separate. No account deletion or record deletion.
- Until migration is installed, card says awaiting setup and disables new controls. Client editing and mark lookup still work.

## Security and failure behavior
- `vb_portal_access_status`, `vb_prepare_client_invite`, `vb_set_portal_access` require protected staff MFA. Browser cannot edit private invitation or membership tables.
- Reservation locks client and recipient, enforces cooldown and fixed recipient, checks current client version and existing account conflicts. A new destination cannot silently adopt an unrelated existing identity.
- `client-invite` Edge Function validates getUser and staff/MFA role before creating its server-only admin client. Admin key is built-in Supabase service key, never browser config or Git.
- Email via admin.inviteUserByEmail; fixed server-configured redirect. Function ignores client-supplied redirect/user ID. No raw upstream messages or credentials returned/logged.
- Service-only completion matches ticket + Auth user/email/invited_at and rechecks client/staff/membership after delivery. Races with archive/disable fail closed. Email delivery alone grants no records. Failure after delivery explicitly tells attorney email was sent but access not completed. An accepted email in this race can require administrator recovery; never auto-attach an unrelated confirmed user.
- Disabling blocks subsequent database requests even for existing sessions. Already displayed information cannot be remotely erased; existing frontend rechecks on visibility/navigation.
- Invitation status means Auth acceptance (email confirmation), not proof of a completed portal visit. SMTP acceptance is not proof of delivery to inbox.

## Activation (requires approval before browser action that creates access capability)
1. Apply `supabase/migrations/20261005000100_client_access.sql` once in named project omvkwiosonatswocbdgx. No current access changes and no email sends in migration. Existing manually applied migration history must later be reconciled before CLI db push.
2. Run `supabase/tests/database/client_invitations.test.sql` and existing isolation tests. Fixtures roll back and send no emails. Applied to hosted development project and rollback checks passed; see verification below.
3. Deploy `supabase/functions/client-invite/index.ts`; dashboard single-file output via `node tools/bundle-invite-dashboard.mjs > /tmp/vb-invite-dashboard.ts`. Legacy JWT verifier off, handler Auth/staff MFA checks retained.
4. Set VB_CLIENT_INVITE_REDIRECT to http://127.0.0.1:8000/login.html for development; must be in Supabase redirect allowlist. VB_ALLOWED_ORIGINS defaults localhost. Public signup remains disabled. This local link is for tests on this computer; use approved HTTPS domain at launch. Never expose the service-role key; Supabase supplies it server-side.
5. Verify Cotivate displays Active and its actual login email, without resending/changing access. Verify anonymous and client endpoint denial. Test sending only after explicit user approval of test recipient and client; complete invite/password setup is user-controlled. Test disabled access on a disposable fixture, not Cotivate without approval.
6. User review, then commit approval; user pushes via GitHub Desktop.

## Checks so far
31 Node tests pass: existing 25 plus 6 invitation tests cover no-user/client/no-MFA denial, origin/confirmation/redirect validation, reservation conflict before admin use, success recipient/identity binding, delivery failure, and post-send completion failure. These mock Supabase and do not prove live delivery or SQL behavior. JS syntax and git diff checks pass. Browser verified simplified two-step Client Settings and disabled awaiting-setup controls; no saves made. No client-account settings page added (next phase).

References: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail and https://github.com/supabase/auth/blob/master/internal/api/invite.go (confirmed users rejected; unconfirmed users can be re-invited). Recheck service behavior during authorized delivery test.

## Activation verified — October 5, 2026
User explicitly approved activation and checks without email sends. Migration applied successfully in omvkwiosonatswocbdgx. New rollback SQL test finished 1..21, existing isolation test finished 1..51, neither with failure summary. All fixture changes rolled back. client-invite deployed through dashboard using generated bundle; legacy-only gateway verifier off, custom getUser + staff/MFA authorization remains required. VB_CLIENT_INVITE_REDIRECT set to http://127.0.0.1:8000/login.html; no key values read. Unauthenticated deployed POST returned 401. Actual signed-in Cotivate client invoked non-sending body and received 403 (ignored work/invitation-access-check.html, temporary verification page). Attorney card shows Active and cotivateapp@gmail.com; no invitation or membership/access change for Cotivate. Opening Disable confirmation was rejected by auto-review as potential revocation; no retry/bypass, use rollback SQL results instead. Email delivery and complete onboarding NOT tested yet: need separately approved recipient. User approved committing this checkpoint; user will push through GitHub Desktop. Screenshot ../outputs/vb-access-active.png.
