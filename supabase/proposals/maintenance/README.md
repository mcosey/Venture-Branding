> October 10 activation update: schema applied to approved Test and main targets; 36 native database checks, two independent-session checks, and 12 main preservation/access checks passed. MAINTENANCE_ENABLED is now true. Actual client-browser check and withdrawal remain pending user login. See handoffs/16-maintenance-activation-checkpoint.md. The preparation-only text below is historical; original pgTAP file itself was not run (equivalent native assertions ran without installing an extension).

# Maintenance records — preparation only

Status: local preparation complete, database activation OFF (2026-10-10).

`001-maintenance-records.sql` is a proposed schema and RPC change, deliberately outside automatic migrations. It has not been applied or executed. `maintenance-records.test.sql` is a prepared pgTAP suite for an approved isolated Supabase-compatible test database with the existing VB migrations. Use fictional fixtures only. Do not run either file against the connected project as a substitute for isolated validation.

## Prepared behavior

- MFA-verified staff can list/save private drafts, explicitly publish a verified snapshot, or withdraw a publication while retaining the draft.
- Saving later draft changes retains the prior publication until verified again.
- Every save, publish and withdrawal checks the last server version. Stale operations fail instead of overwriting another window's changes.
- Client reads request only public fields and are scoped by the proposed database policy to active client membership and active matching marks.
- Verification sources and staff attribution stay in the private table. Existing private audit triggers record changes.
- Browser roles cannot directly write either table or directly read drafts. Staff RPCs recheck access and client/mark ownership.
- No calculated filing deadlines, reminder delivery, booking integration or new intake requests.

## Verified versus unverified

44 JavaScript tests passed across maintenance, authentication, connection and existing Brand Map suites. These exercise the application and simulated repository responses, not PostgreSQL execution or actual hosted privacy enforcement. The local authenticated attorney browser was checked: fictional draft save, verified preview publish, visible publication confirmation, and source excluded from the client preview.

No PostgreSQL/Supabase CLI/Docker runtime was available in the preparation environment. Nothing was installed. SQL syntax, actual RLS grants/policies, audit behavior and transactions remain unverified until the prepared database tests run. A real two-session save/archive race test should accompany database validation; the prepared suite covers sequential stale-version conflicts.

## Activation prerequisites (separate approval)

1. Identify an isolated test environment and approve any needed setup or installation.
2. Apply existing foundation migrations and this proposal only there; run pgTAP and concurrent-session checks with fictional data. Repair and repeat relevant checks.
3. Review the exact target and database change before applying to the connected project. Other pending migrations must not be swept into this phase.
4. Only after successful database validation and application, separately enable `MAINTENANCE_ENABLED` in `auth/maintenance.mjs` and check attorney/client flows with approved test accounts.

Normal application code makes no maintenance table queries or writes while the flag is false. Existing portal authentication still connects to its configured service: serving the page on localhost does not make authentication/database services local.

No commit, push, deployment, account changes, hosted schema change or external reminder setup occurred in this phase.
