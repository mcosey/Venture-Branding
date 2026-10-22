# Evidence row permission correction

Prepared locally on October 21, 2026. **Not applied to BCM Test or Production.**
No application pages, Auth settings, workers, downloads or hosted resources change
as part of this preparation. No software installation is required or performed.

## Narrow change

The existing `evidence_read` policy's unqualified inner `client_id` resolves to
`m.client_id`, making its client comparison `m.client_id=m.client_id`. The forward
correction explicitly compares `m.client_id=vb_evidence.client_id` and explicitly
qualifies `mark_id`. This independently checks the evidence/mark relationship even
when one user can access two separate legal clients.

This finding is not evidence of a live data leak. The outer membership check,
mark row security, upload reservation/completion checks and separately correct
private-file download helper already protect existing paths. A deliberately
inconsistent local row demonstrates why the independent row check is worthwhile.

`01-prepared-apply.sql` uses one `ALTER POLICY ... USING` in a transaction. It
preserves the policy's identity, authenticated SELECT role/command/permissive mode,
staff/MFA branch, upload/removal checks and archived-mark check. It does not change
the download helper, grants, Storage rules, tables, records, indexes or other
policies. In Test, the additional restrictive `portal_scoped_read` policies and
engagement-aware download helper remain intact. No feature tiers are introduced.

The guard requires the reviewed original parsed expression and policy metadata,
enabled evidence/mark row security, and obtains the table lock before inspecting.
It refuses repeat application and drift instead of overwriting a newer rule.
Short lock/statement timeouts prevent indefinite waiting. Historical evidence SQL
files remain unchanged. A changed catalog/deparser output must be reviewed rather
than bypassing the guard.

## Local verification

`tools/test-evidence-policy-local.mjs` requires an **already installed** PGlite ESM
module supplied through `PGLITE_MODULE`. It never installs a dependency. With no
module supplied it stops. Run with the existing network tripwire:

```sh
PGLITE_MODULE=/absolute/path/to/already-installed/pglite/dist/index.js \
NODE_OPTIONS='--import ./tools/no-network.mjs' \
node tools/test-evidence-policy-local.mjs

NODE_OPTIONS='--import ./tools/no-network.mjs' \
node --test tools/evidence.test.mjs tools/evidence-policy.test.mjs
```

The SQL runner loads the maintained foundation and evidence migrations into an
empty, disposable local database, then uses `local-fixtures.sql` inside a rolled
back transaction. It checks the old-regression case, corrected role/client/MFA
access, private download parity, removed/incomplete/archived rows, revoked
membership, disabled/archived clients, anonymous denial and browser-write denial.
It rejects baseline drift, tests rollback preservation and executes the exact
full correction transaction separately in that disposable database. It checks
that only the target policy expression changes; other policy identities and
expressions, grants/RLS, helper definitions, constraints, evidence/client/mark data,
bucket settings and object metadata remain unchanged.

Two modes run: original client membership and the maintained Test restrictive
policies/download helper with a deliberately narrow record-scope adapter. The
adapter denies one otherwise eligible record to prove the restrictive policy
continues to apply. **This does not reproduce or certify Test's full engagement
engine.** Auth claims and Storage tables are fixtures, not real authentication or
files. PostgreSQL/WASM local results do not replace hosted Supabase verification.
The normal Node tests include two source-contract checks without adding a CI
dependency on PGlite; those source checks alone do not prove RLS behavior.

## Later hosted work — not authorized by this preparation

Do not run `local-fixtures.sql` or the isolated setup against a hosted database.
No hosted fixture/rehearsal script is included in this package. Before asking to
apply the correction, prepare a target-specific rollback rehearsal and preservation
checks from a fresh catalog snapshot, accounting for that target's installed
engagement mapping/triggers and real Storage implementation. Review its exact
contents and obtain the owner's approval before resuming Test, creating temporary
grants/fixtures or applying database permissions. Rehearse and validate before
separately approved persistent application, then verify catalog and access results.

If a rehearsal fails, roll back the transaction. Do not reinstall the original
weaker predicate as a production rollback or disable row security to resolve a
failure. BCM Test availability must be coordinated; this work does not resume it
or change Cotivate.
