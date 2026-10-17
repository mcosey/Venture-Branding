# Brand Map backend review package

October 9, 2026. **Local draft prepared; database changes have not been applied.**

Mario approved preparing database-change scripts and executable privacy tests as local files only. This package completes that phase. It does not authorize applying the draft, installing tools, creating an external test service, changing accounts, committing, pushing, or deploying.

## What this prepares

The draft would let an authorized client describe brand/IP assets and their business context, place them in the Brand Map, and confirm business relationships. MFA staff would associate those assets with existing trademark records. Business confirmation and legal-link review remain different actions.

The company remains the workspace grouping. Products and websites do not become protected IP merely because they appear in the map. Legal status comes from the linked trademark record; children do not inherit it. Changes to an asset's identity or a linked record's identity require fresh attorney review of the association.

Nothing new is connected to the homepage yet. The existing homepage continues to show permitted legal records. Add/edit business-asset forms and staff legal-link controls require a separately approved UI phase after backend validation.

## Files

| File | Purpose | Current status |
| --- | --- | --- |
| `001-brand-assets.sql` | Three tables, guarded reads/saves, same-client references, revisions, protected history | Unapplied; PostgreSQL validation pending |
| `brand-assets.test.sql` | Synthetic client/staff database assertions, inside a rollback transaction | Written; unrun |
| `privacy.test.mjs` | Runs those assertions and rejects failed or incomplete results | JavaScript syntax checked; database execution unrun |
| `concurrency.test.mjs` | Independent database connections for overlapping edits and permission revocation | JavaScript syntax checked; database execution unrun |
| `local-test-guard.test.mjs` | Checks target restrictions and test-result handling without connecting to a database | Four local tests passed |
| `validation-status.md` | Clear record of completed and pending checks | Review document |

The repository copy lives in `supabase/proposals/brand-map`, outside the automatic migration and database-test folders. Existing migrations and the pending BCM, Watch, and maintenance work were not edited in this phase. Branch at preparation: `codex/attorney-workspace`; the shared checkout has pending work from several features.

## Privacy and editing design

All new browser reads and writes use guarded operations. Browser roles have no direct rights to the new tables. The read response lists permitted fields explicitly, excluding raw actor IDs, review fingerprints, and internal history. Existing active membership, portal access, and staff MFA rules apply. Archived clients are unavailable; MFA staff can prepare an active client with its portal disabled.

The three new record types hold business assets, one current parent slot per asset, and one current legal-link slot per asset. Slot clearing retains protected before/after history. Browser deletion is unavailable. Same-client references also include the client ID, preventing cross-client parent and legal associations. Supporting metadata adds an `(id, client_id)` unique constraint to the existing trademark table; it changes no mark values.

Only the four business fields are accepted by an asset form: name, kind, description, and business use. IDs, source labels, versions, actor identities, and timestamps are set by the database. Updates require the version the editor viewed. Legal review additionally requires the asset identity revision and the exact visible identity of the trademark record staff reviewed.

Every asset receives relationship and legal slots when created. Writes lock the client and existing permission rows, then the relevant records. Parent validation locks each existing ancestor slot. This is intended to reject overlapping cycle-forming edits at both READ COMMITTED and REPEATABLE READ, including a stale snapshot that cannot see a just-committed edge. This behavior has executable tests but is **not yet proven by database execution**.

The existing USPTO save operation already locks the client before saving a mark. Prepared concurrency tests exercise that path and the existing staff table-update path against legal-link review. Their success remains pending. Privileged database administrators remain trusted and must use the guarded operations for ordinary changes; raw owner writes are not a supported client/API path.

No existing authorization or audit helper is replaced. Dedicated triggers reuse protected audit history for the new records. No recommendation, internal legal-analysis, automated feed, evidence, scheduling, upload, or AI workflow is added.

## Validation required before connection

Use a fresh disposable database bootstrapped with Supabase's test auth schema/roles and the existing project migrations, named `venture_brand_map_test`. Do not copy live client data. It needs PostgreSQL 17, pgTAP, an existing `psql`, and Node. None of the required database tools or a known authorized disposable database was found during this phase; nothing was installed.

The JavaScript runners accept only an explicit loopback database URL with that exact database name. They reject remote URLs, URL options, and missing targets. They do not load the application's config, discover credentials, or use the configured database. The SQL draft and assertions also require that database name and the explicit `vb_brand_map.test_approved=local-disposable` setting.

After separate approval of the test environment, a developer should:

1. Initialize the fresh isolated Supabase-compatible database without production data; confirm its address and database name.
2. Apply **only the draft to that disposable database**, with the explicit approval setting. This application is not part of the completed local-files phase. The draft is one transaction; a SQL error should roll it back. Discard the disposable database if interrupted or uncertain.
3. Supply its connection privately through `BRAND_MAP_TEST_DATABASE_URL`, and set `BRAND_MAP_TEST_APPROVED=local-disposable`. Never paste credentials into tracked files or chat.
4. Run `node privacy.test.mjs` and `node concurrency.test.mjs` from this folder. Record results and any fixes. Do not interpret JavaScript syntax checks as database validation.
5. Reconcile the shared IDs/schema with the parallel feature work before proposing a normal migration or connecting the UI. Coordination has not been claimed or performed through messages to other chats.

The privacy SQL's temporary fixtures roll back. Concurrency fixtures must be committed briefly so independent connections can see them; the runner removes its random-ID synthetic records afterward. If cleanup fails, it reports failure and the disposable database must be discarded. These are test identities without real credentials, not real client invitations.

Running the local checks alone requires no database:

```sh
node --check concurrency.test.mjs
node --check privacy.test.mjs
node --test local-test-guard.test.mjs
```

SQL compilation, constraint behavior, database isolation, overlapping saves, cleanup behavior, and API integration remain unverified. Prior signed-in homepage verification with one client does not prove cross-client isolation.

## Recommended next phase

Prepare a concrete isolated-test setup proposal, including any required installation, disk use, or cost, and ask Mario to approve that setup before making those changes. After setup approval, apply the draft only there, run the privacy and concurrency tests, and fix failures within that bounded validation phase. Keep UI connection and configured-database application separately approved.

Model suggestion: GPT-6.1 Sol with medium reasoning for the setup proposal; high reasoning for the privacy/concurrency validation. This is a practical recommendation, not a guarantee of test success or an automatic model change. OpenAI's [model selection guidance](https://developers.openai.com/api/docs/guides/model-selection) describes Sol as suitable for complex work where cost matters, and its [reasoning guidance](https://developers.openai.com/api/docs/guides/reasoning) reserves higher effort for harder debugging and planning.
