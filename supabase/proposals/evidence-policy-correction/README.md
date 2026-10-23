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
A main-Venture-Branding-only, **unexecuted** rehearsal was prepared October 22 as
`02-main-rollback-rehearsal.sql`, from the same-day approved read-only metadata.
It deliberately uses **no hosted fixtures, accounts, grants or Storage writes**.
It does not exercise record-write triggers or Test's engagement engine. It must
not be used on BCM Test or a different database. Its cluster guard, exact policy
baseline, seven helper hashes, private bucket and Storage policy checks stop on
drift. The exact reviewed correction body is reused without its outer transaction
or commit; savepoint and final transaction rollbacks retain the installed rule.

The rehearsal captures session-local catalog metadata and evidence/mark row
fingerprints, asserts that only the policy predicate changes, then verifies
savepoint rollback restores the baseline. It probes row denial with an unassigned
UUID without creating an account or impersonating a real user. Anonymous metadata
and browser-write/completion grants are checked as effective privileges. It reads
real rows internally for fingerprints, but returns only success booleans, never
record details, identities or file contents. A short exclusive evidence lock and
shared mark lock can briefly delay evidence access and mark writes; initial lock
acquisition gives up after one second. The unchanged correction body has its own
reviewed timeouts; the tighter rehearsal timeouts are restored immediately after.
Concurrent Storage metadata changes cause a preservation failure, not permission
to overwrite or retry blindly. No managed Storage table is locked or modified.

Preparation is not execution approval. `tools/evidence-policy-rehearsal.test.mjs`
checks the no-commit/no-persistent-write contract offline; it is not a hosted SQL
parser or an access-engine test. The recorded 62 isolated SQL checks and 23
evidence/source checks still provide the prior synthetic role/boundary coverage.
The previous temporary SQL runtime is no longer present; no replacement was
downloaded or installed. Hosted parsing, actual authenticated sessions, signed
downloads and full platform behavior remain unverified by this preparation.

After owner approval, run the **complete** rehearsal in one SQL Editor request
on main Venture Branding. Never run highlighted fragments, remove a guard,
substitute COMMIT or feed it to a client that commits each statement. Require the
single `evidence_rehearsal` success object and completed final ROLLBACK, followed
by the approved read-only preflight again to confirm the baseline externally.
If execution errors, issue ROLLBACK in that same editor session before any further
work; no success claim follows an error. The SQL Editor may use a different pooled
session for a later request, so a separate ROLLBACK is cleanup assistance rather
than proof; the full original request contains no COMMIT and must fail/roll back
as a unit. Save the response and follow-up baseline before asking to persist the
correction. Persistent application requires separate approval. Do not resume Test
or interrupt Cotivate for this main-only rehearsal.

If a rehearsal fails, roll back the transaction. Do not reinstall the original
weaker predicate as a production rollback or disable row security to resolve a
failure. BCM Test availability must be coordinated; this work does not resume it
or change Cotivate.
