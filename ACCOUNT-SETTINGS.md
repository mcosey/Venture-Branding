# Client Account Settings

Built locally October 6, 2026; database migration applied with approval. Website changes not committed or deployed.

- `account.html` uses the existing client session/access checks and portal sidebar.
- Contact name/email save through narrow `vb_update_my_contact` RPC. Legal name, client type, portal access, trademarks and memberships cannot be edited through this RPC. Existing table write policies stay staff-only. Audit trigger records changes; stale versions rejected.
- Sign-in email changes use Supabase Auth `updateUser` with login.html callback. Contact email remains separate. Keep secure email change (both-address confirmation) enabled; hosted setting and actual confirmations still need verification.
- Password button sends a reset link to the authenticated account email. Existing login recovery flow sets password and signs out all sessions. User must perform real credential changes; agent has sent no emails and changed no credentials.
- No account signup, role changes or membership changes.

## Activation and verification
Applied `supabase/migrations/20261006000100_client_contact.sql` to omvkwiosonatswocbdgx with explicit action-time approval. `supabase/tests/database/client_contact.test.sql` passed all 10 checks (finish 1..10); fixtures rolled back. Existing schema migrations were manually applied; reconcile history before CLI pushes.

Local checks: `node --test tools/account.test.mjs tools/auth.test.mjs tools/connection.test.mjs tools/invitation.test.mjs tools/uspto.test.mjs`: 37 passed. Auth writes are mocked. Follow with changed-contact attorney visibility/reload tests; user tests actual credential emails separately. Production domain redirects and email sender remain launch tasks.

Sources: https://supabase.com/docs/reference/javascript/auth-updateuser and https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail .

Live client check: Cotivate Account Settings successfully saved the existing Mario Cosey/blank contact email values; no identity or credential changes. Messages and Account Settings now have matching sidebar icons. Screenshot: ../outputs/vb-account-settings-active.png.
