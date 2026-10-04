# Sign-in foundation — October 4, 2026

## Implemented

- `/login.html`: invited client sign-in; V8 Login now points here.
- `/attorney-login.html`: separate staff entrance, with required TOTP challenge/enrollment in this UI.
- Shared Supabase password sign-in, invitation password setup, password recovery, TOTP verification, and sign-out.
- No signup endpoint or role selection in the website. Hosted public signup disabled and anonymous login disabled, confirmed through Auth settings API. Email confirmation remains on. Hosted TOTP enabled; existing 15-minute AAL1 limit enabled.
- Hosted Site URL: `http://127.0.0.1:8000/login.html`. Only two exact allowed redirect URLs: this URL and `/attorney-login.html`. No wildcard, hosting, SMTP, or DNS changes.
- Only existing **publishable** key is in `config.js`. No secret key was revealed or copied. SDK 2.117.2 UMD vendored from official npm tarball, license from supabase-js tagged source. No package manager installation or runtime CDN dependency.
- Staff and client session storage keys are distinct; browser session storage instead of persistent local storage. Both entrances currently share an origin; this is not isolation from same-origin scripts. Separate origins and production session/recovery policies remain deployment work.

## Deliberate boundary

These screens verify identity only. Successful sign-in stops at “Connecting the portal is the next setup step.” No real account is redirected into the static demo, no protected record is fetched by these screens, and no membership is inferred from email, metadata, pathname, or choosing a login screen. Database RLS remains authoritative. Existing attorney/client HTML pages still contain demo data and are NOT protected live applications.

Server-side client invitation/membership provisioning and initial staff membership are still pending. Provisioning must be performed through trusted administration with explicit authorization, audit trail, intended user UUID, active client validation, retry handling and revocation. Do not expose service credentials or allow browser membership writes. No automated invitation endpoint has been deployed.

## Verification

- Six local flow/configuration tests passed: no-user rejection, staff MFA requirement, existing client MFA before password reset, first invitation password setup, MFA completion, rejection of secret/wrong-project configuration.
- Hosted Auth settings API returned `disable_signup: true`, anonymous false.
- Anonymous HTTP query of vb_clients returned 401 permission denied (expected). Do not follow its suggested grant to anon.
- Browser checked client sign-in, recovery navigation and staff entrance. Real invitation, password, MFA and recovery acceptance still require user interaction. Never describe these as end-to-end validated until exercised.

## Next account setup / handoff

The user chose their own attorney email in chat. Send the approved setup invitation via Supabase Auth, not the organization Team page. Dashboard invitations use Site URL, so password setup opens the client entry; after saving password, sign out and use `/attorney-login.html` to enroll TOTP. This does not grant a client or staff role. The user must enter new password and MFA setup/code themselves. Never copy or capture password, enrollment secret, token-bearing URL, or QR screenshot.

After identity and MFA are verified, obtain approval to grant the exact user UUID the staff membership. Do not grant it by matching a generic email suffix or accepting user metadata. Then build/test actual authorized portal loading and client provisioning. Custom SMTP is needed before general client invitation delivery. No billing upgrade authorized.

Before launch: real two-client and staff HTTP tests; expired/reused invite and reset links; recovery/MFA loss process; session revocation and reauthentication; CSP and isolated staff origin; no sensitive static data; reconstruct/rehearse hosted Auth settings and membership bootstrap. Password inputs currently require 12 characters; align hosted password policy before launch.

Sources: https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/auth/auth-mfa/totp ; https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail

Invitation outcome: the user supplied their attorney email and the Auth dashboard invitation was submitted successfully. A single new Auth user appeared in the Users list. No staff/client membership was assigned. Awaiting the user's own password setup and TOTP enrollment; email inbox receipt has not been independently confirmed. No credentials or QR code were entered/read by the agent.

## Initial attorney access granted — October 4, 2026

User confirmed authenticator completion and explicitly approved verification and firm-wide attorney access. In the hosted project, checked the exact invited Auth UUID and email, email confirmation, and existence of a verified TOTP factor (no factor secrets read). A guarded transaction inserted that one UUID into vb_private.staff_members; it would abort for an unverified account or an existing disabled membership. Verified active staff membership after commit. No client membership was created.

Then ran rolled-back database-role checks using this user's UUID: AAL1 denied staff authorization and all client reads; AAL2 authorized staff and returned Cotivate LLC and its Cotivate mark. All checks passed. These are database claim simulations, not the user's live session or browser API requests. Actual authenticated frontend/API checks remain necessary when wiring the workspace.

This is a one-time account grant, not a reusable migration/seed. Never put a production staff grant into the sample seed. For rebuild: invite the approved owner, have them verify email and TOTP themselves, confirm the new UUID and verified factor in trusted administration, obtain approval, then insert only that UUID into staff_members. Recheck MFA-required access. Do not assume UUIDs persist across recreated projects.
