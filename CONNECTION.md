# Portal connection — October 4, 2026

## Connected functionality

- Attorney workspace reads clients, marks and internal external-system references from Supabase after validated identity, MFA and server-derived staff role.
- Add/edit client saves client fields and references atomically. Concurrent stale client edits are rejected. Archive/restore persists and changes client access through the existing RLS rules. Portal enabled is distinct from invitation or membership.
- Attorney can add unfiled marks. Fake USPTO demo lookup records are removed from the connected editor; live lookup remains unavailable and cannot write demonstration results into the database.
- Client dashboard/portfolio/mark details read the same records under that client's RLS policies. No static named client/marks/messages/deadlines/findings remain in the six client pages or their scripts. Existing shell styles/navigation retained; populated example sections replaced by saved-record views or empty states.
- All five preferences can be saved by the client. These are preferences ONLY; no jobs, scans, deadlines or captures run. UI explicitly says services are not connected.
- Messages, client requests, calendar, watch results and evidence still have no backend feature. Empty states explicitly identify unconnected features; no fabricated activity or legal assurance.
- Sign-in only offers the appropriate workspace after `vb_session_role()` verifies protected membership. An attorney cannot enter client views using their staff login; separate client account required. Route checks supplement RLS; they are not its replacement.
- Authenticated pages fail closed, hide data on sign-out/backgrounding, recheck on return and report failed saves. Sessions remain per-tab sessionStorage; links should be followed in the same tab. No passwords, privileged keys, OTPs or Auth sessions are read by agents.

## Database

Applied `supabase/migrations/20261004000100_portal_connection.sql` via SQL Editor. Two functions only: session role lookup with no caller-supplied identity, and RLS-invoker atomic staff client save. Public/anon function execution revoked; authenticated granted. No policies weakened.

As with the first migration, manually applied SQL is NOT registered in CLI migration history. Reconcile both migration versions before any future db push; do not rerun CREATE on this project.

## Verification

- 51 pgTAP checks passed on the hosted development database, transaction rolled back. Expanded original 39 assertions to cover anonymous RPC denial, metadata role spoofing, MFA, client save denial, atomic references, stale edits, membership revocation and disabled staff role.
- 13 Node tests passed for auth flow and connection access control. These use mocked SDK responses and do not prove HTTP identity isolation.
- Signed-out browser visit to portal.html showed only sign-in/retry gate, no client records.
- Actual account login + connected page rendering, client save/reload, own preference persistence, denied cross-client HTTP requests and mobile layout still require end-to-end verification. Do not call this production-ready or claim those checks passed without evidence.

## Cotivate account

User supplied a separate Cotivate client email in chat. Invitation submitted through Auth Users; separate account appeared. The intended client record is the existing seeded Cotivate LLC, not a new duplicate. Explicit approval was requested at the point of granting Cotivate-only membership. Do not assume a membership exists; check the latest handoff entry. Client password setup must be completed by the user. No new email sender, hosting, paid plan or organization-team membership was configured.

## USPTO direction confirmed by user

Cotivate has an abandoned USPTO application, which the user wants to use for real lookup testing. Do not guess its number/status/owner or assign registration status from the name. Attorney enters identifier in the attorney workspace, initiates lookup, reviews/approves the fetched record, and updates the SAME saved mark. The client sees the approved result read-only. Fields for application/registration numbers, exact USPTO status text, type, source, retrieval timestamp and owner already exist; client details now display the exact status text when present. Import transport, owner review, exact status mapping and fetch error handling are not connected yet. Need actual identifier from user before that step.

## Next

Finish real-account verification and approved client membership. Review connected views before commit. Then agree USPTO lookup scope. Invitation automation, profile/credential settings, requests, background services, external integrations, production session hardening and rebuild rehearsal remain separate work.

## Cotivate membership completed — October 4, 2026

User explicitly approved Cotivate-only access. A guarded transaction matched the exact invited account UUID and supplied email, required active/unarchived Cotivate LLC, rejected staff identities or other active client memberships, and inserted only the Cotivate membership. Existing disabled memberships would fail instead of being silently restored. Insert recorded in private audit_events as approved manual administration (actor_id null because this was trusted administration, not an authenticated frontend action).

Confirmed active client membership and no staff membership. Rolled-back checks using this exact client's claims passed: role client, only Cotivate client visible, no other client's marks, no internal references, mark edits blocked, own service preference update permitted. The preference change was rolled back. These are database checks, not a real browser client login. User still needs to accept invitation, set their own password, and review the connected portal. Current changes remain uncommitted.

## User review / current verification pass

User successfully signed into the client portal in Safari and the app browser: Cotivate LLC, contact Mario Cosey and exactly one Cotivate mark rendered. Added 20px separation between dashboard summary cards and Your portfolio at their request.

Real client UI verification: Trademark Watch was temporarily enabled; save and reload succeeded, and the preference remained enabled after sign-out and user sign-in. Restored the preference to false through the client UI and confirmed Saved. No service/job runs from this flag.

Responsive view inspected at actual 775px width: summary cards wrap, menu collapses, portfolio separation visible, no horizontal document overflow. Requested 390px viewport did not produce that actual width, so phone-width verification remains pending. Temporary viewport override reset.

Attorney edit propagation remains pending: both accessible attorney tabs show signed-out gates, although user reported signing in. No attorney record edits made. Ask user to complete sign-in in the app's Attorney sign in tab, or clarify if they used Safari; do not claim this check passed. Current changes remain uncommitted.

## Direct sign-in navigation — October 4, 2026

At user request removed the extra “Sign-in complete / Open portal” click. After requireAccess succeeds, sign-in replaces the page with the fixed audience-specific destination. Password setup, MFA and membership checks remain intact. Verified an authenticated client visiting login.html automatically reaches portal.html with Cotivate data. All 13 auth/connection unit checks pass. Actual attorney edit propagation is still pending attorney sign-in in the accessible browser.

## Attorney connection verified — October 4, 2026

User completed attorney MFA sign-in in the accessible browser. Changed Cotivate LLC primary contact temporarily to Mario Cosey (verification) through Client Settings; saved successfully, remained after attorney reload, and appeared in the client's greeting after client reload. Restored Mario Cosey using the same attorney UI, confirmed save and restored client greeting. No mark, permission, or integration fields changed. Confirmed signed-in attorney visiting attorney-login.html automatically reaches attorney.html without the extra completion click. Both accounts' automatic entry now verified. Phone-width testing and real cross-client HTTP denial testing remain outstanding; database isolation checks passed separately. User approved committing this checkpoint after verification.
