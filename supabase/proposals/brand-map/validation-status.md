# Brand Map backend draft: validation status

October 9, 2026. **Prepared locally. No database execution or application.**

## Completed checks

| Check | Result | Practical meaning |
| --- | --- | --- |
| Existing Brand Map homepage tests | 9 passed | The existing model/rendering checks still pass; this does not validate the new backend |
| Test target and result-handling tests | 4 passed | Remote/non-test targets and failed/incomplete database results are rejected by the local runners |
| Both database runner JavaScript syntax checks | Passed | The runner files parse in Node; their SQL has not run |
| Concurrency runner invoked without an approval flag | Refused before connecting | The runner did not start a database session |
| Targeted manual SQL/design review | Completed | Checked field projection, ownership constraints, guarded operations, audit reuse, and intended lock order; not PostgreSQL compilation or behavioral proof |

Total executable local checks: **13 passed**, comprising nine homepage checks and four test-runner checks. The database privacy/concurrency tests are not included in that total.

## Written database coverage — all unrun

The rollback privacy suite prepares two separate client workspaces plus an authorized empty workspace, their test users, and MFA/non-MFA staff, including a staff member with dual client membership. It covers:

- Workspace reads and counts; identical denial messages for foreign or missing workspaces; raw table/helper access denied; protected history absent from client responses.
- Forged provenance, client IDs, legal links, actor/confirmation fields and versions; incomplete, blank, null and overlong business fields; script-like names retained as text.
- Cross-client asset edits, parent IDs, confirmations and legal links; same-client foreign-key enforcement and immutable ownership/source.
- Expected versions, business-use versus identity revisions, proposed/confirmed edges, reset/clear behavior, self-parenting, and a three-node proposed cycle.
- MFA-only legal associations; dual membership unable to bypass MFA; stale asset and trademark identities; multiple assets counting one linked mark; inactive legal facts without fictional registration.
- Substantive asset and legal-owner changes requiring review; status refreshes preserving identity review; archived marks unavailable; clearing links retaining history and legal records.
- Membership revocation, disabled portals, archived clients, deactivated staff, server-controlled source labels, and the second client's records remaining unchanged.

The independent-connection suite prepares **12 overlapping scenarios**, six each at READ COMMITTED and REPEATABLE READ:

| Scenario at each isolation level | Required outcome |
| --- | --- |
| Opposing parent assignments | Second write rejected; one edge remains, no cycle |
| Two edits using one asset version | Stale write rejected; winning name remains |
| Membership revoked while a save waits | Save rejected; version unchanged |
| Existing staff direct mark identity update overlaps link review | Stale review rejected; no association created |
| Existing USPTO mark identity save overlaps link review | Stale review rejected; no association created |
| Legal review overlaps a factual USPTO status refresh | Both compatible saves succeed; current review and current status remain separate |

The runner checks that a competing database session is actually waiting on a lock before releasing the first transaction. It does not replace simultaneous edits with a sequential simulation. Execution and cleanup are still unverified.

## Boundaries preserved

Only new proposal files were created in the project during this phase. The automatic migration directory, existing homepage code, authorization records, client information, database, accounts, and external services were not changed. No software was installed. No commit, push, or deployment was performed.

No new business-asset controls or staff link editor are connected to the portal. No synthetic assets were placed in the authenticated homepage. Existing parallel feature changes remain pending and were preserved.

## Next approval

Approve preparation of an isolated-test setup proposal, with any software installation or service costs explained before approval of setup itself. Database validation must precede a request to apply the backend to the configured database or connect client editing controls.
