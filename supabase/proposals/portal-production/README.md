# Production Member/Client preparation — steps 2 and 3 only

> Activation update — October 23, 2026: the owner separately approved main installation. The database package and existing client mapping were applied with preservation/access checks; the corrected main invitation bundle is deployed and verifies unsigned/origin denial. Main signup requires email confirmation. The browser configuration opts in only the 8895 loopback preview. The shared allowlist now connects lookup/research from 8895 while preserving 8000. The separately approved upload origin-only change is deployed and verified, preserving every other installed line. All 483 offline checks and the limited live connection/unsigned-denial checks passed; see activation-20261023.json. No real-email/signed-in walkthrough or public launch is claimed. No website was published, no email/account was created and Test/Cotivate stayed untouched. The original preparation record below is historical; CURRENT-ENVIRONMENTS.md tracks current status.

Prepared October 22, 2026. **Not applied or deployed.** No backup, restore,
rehearsal, hosted acceptance walkthrough, policy-drafting or hosting work is
included. The owner narrowed this checkpoint to preparing Production-specific
changes and reviewing existing legal-client mappings.

## Prepared changes

- `auth/member-account.mjs` retains the existing Test gate. Its Production path
  requires the exact main project, an explicit Member flag and exact canonical
  `memberOrigins` list. Current committed `auth/config.js` is unchanged, so this
  does not activate Production signup or Member features.
- Client access fallback uses that same environment gate, preserving the backend
  routing decision after the last engagement closes.
- The maintained invitation handler accepts an explicit factory environment.
  Its default and existing `index.ts` remain Test-only. The separate generated
  `engagement-invite-production.ts` fixes the main environment explicitly and
  requires a server-set `VB_ENGAGEMENT_INVITE_ORIGIN` plus the existing delivery
  readiness flag. Missing/invalid origin, wrong project or disabled flag fails
  closed before identity/reservation/delivery. No setting or callback was saved.
- Saved recipient, verified account, staff/MFA, one-use acceptance and existing/
  new-user delivery paths retain the same checked implementation. The origin and
  environment cannot be supplied by the browser request body. Service/provider
  credentials remain server-side; no new credential is introduced.
- `tools/prepare-production-portal.mjs` assembles a private, single-transaction
  main-database proposal from maintained foundation/onboarding/progress, scope,
  invitation and Watch SQL. It never connects to a database. It replaces the
  original four-client Test seeds/guards with explicit reviewed main inputs.
  It preserves the corrected evidence predicate, all Client features and separate
  legal-client scopes. Internal Test-era RPC/table names remain compatible;
  no duplicate parallel implementation is introduced just to rename them.
- The four research functions whose Production monthly allowance/scheduling
  behavior differs from Test are derived from the maintained Production source.
  That source must match the fresh installed body hash before assembly. Scoped
  checks are added without promoting the Test lifetime run cap or Test endpoint.
  The old Production crawler dispatcher remains untouched.

## Private mapping input and output

Client names, protected user IDs and generated migration SQL do **not** belong
in this public repository. The assembler requires a separate existing directory
outside this checkout containing `current-inventory.json` and
`mapping-review.json`. It rejects an output directory inside the checkout.

The approved-scope read-only mapping review found one active legal client with
one existing verified, non-staff account link and one trademark. Its existing
relationship is the proposed conversion; an archived/disabled invitation-test
client remains unconverted and unchanged. There is no matching by name/email,
merging of legal clients, Auth user creation, invented agreement signing or final
policy acceptance. The actual identities and record counts stay in the private
review files outside Git.

The prepared mapping is explicitly `approved:false`. The generated SQL stops
before creating tables/grants/records unless that separately reviewed mapping
input is approved. A future application also checks main cluster identity,
installed function hashes/ACLs, actual client identity/type/status and exact
protected account links. It refuses drift/reapplication. Record resources are a
fixed allowlist; input JSON is quoted as SQL data. No generic SQL resource names
are accepted from the mapping file.

Preparation command (uses the existing Node runtime; no installation):

```sh
node tools/prepare-production-portal.mjs --private-directory /absolute/private/review/directory
```

Outputs in that directory:

- `prepared-production-apply.sql` — private draft, not executed; mapping approval
  gate remains closed. It contains the actual migration identity rows.
- `prepared-feature-contract.json` — proposed feature contract for a later
  coordinated activation. The live/committed feature contract stays unchanged.
- `package-manifest.json` — source hashes, artifact hash and explicit unexecuted
  status. There is no restore/rehearsal script or automatic application command.

The generated transaction would acquire bounded table locks and create the
reviewed access structures/mapping if later authorized. It does not publish
policy versions, alter Auth/worker secrets or readiness, send emails, call a
provider, activate a scheduler or modify the pinned Watch runner. No Test users,
fake Test client seeds, notes or files are copied to Production.

## Validation and limits

The focused Member/invitation/admin tests exercise exact-origin and project
denial, preserved Test behavior, existing/new recipient paths, recipient and
redirect restrictions, staff/MFA denial and saved-account routing. Generated
worker syntax and source/artifact checks use existing tools only. Updated local
diagnostic bundles reflect the same maintained handler; earlier deployed/frozen
artifacts and deployment receipts remain historical evidence and unchanged.

The SQL assembler has run locally against the fresh main metadata and private
mapping proposal, with its approval gate closed. **Generated Production SQL has
not been parsed/executed by PostgreSQL or applied to Supabase.** Prior Test SQL
evidence is reused with its original limits. This checkpoint does not claim
Production migration or end-to-end acceptance is complete. It introduces no new
mandatory task list, software requirement or live action.
