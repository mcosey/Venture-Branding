# Browser race protocol — design only, not executed

The exact 12 cases are copied from the existing local concurrency suite: six scenarios at each of `READ COMMITTED` and `REPEATABLE READ`. Do not widen those local runner guards to allow a remote URL. A separate hosted implementation must preserve their expected codes and state assertions.

## Each case needs three independently verified connections

| Participant | One complete transaction batch | Evidence |
| --- | --- | --- |
| Winner | Pinned Test/run guard; unique transaction-local application label; correct isolation/actor; perform winning mutation; bounded hold; commit | PID, actual isolation, fixture IDs, winning result; no password or token |
| Loser | Pinned guard and unique label; begin correct isolation; authenticate SQL-only claims; read scoped map to establish a snapshot; attempt competing write; record exact SQLSTATE or compatible result; commit compatible case or rollback | Different PID, pre-read success, exact expected error/result; no substitution of sequential requests |
| Observer | Read-only scoped activity/blocking query in its own batch | Both participant PIDs, active loser `wait_event_type='Lock'`, intended winner in `pg_blocking_pids(loser_pid)`, distinct observer PID |

Bounded holds can make overlap possible, but the observer proves the overlap. Accept no case merely because the expected error appeared. A failure before the intended blocking point, an unrelated blocker, a timeout, a missed window or queued Dashboard request is **inconclusive/failure**, never pass. Observe each scenario separately; one successful transport probe is not evidence for all 12 races. PostgreSQL exposes one `pg_stat_activity` row per backend and actual wait-event information. [PostgreSQL activity statistics](https://www.postgresql.org/docs/current/monitoring-stats.htm)

Use whole request batches. Do not issue BEGIN in one browser request and assume a later request uses the same connection. Record both actual transaction isolation levels, not only intended labels. Use at most three deliberate test connections at once, transaction-local labels, a 3-second setup lock limit, and reviewed bounded race timeouts (proposed winner hold 15s, statement deadline 25s and idle deadline 25s). If timing cannot be observed with these limits, stop and revise with approval; do not indefinitely hold shared Test locks.

For repeatable-read cases, the loser's map read must establish its snapshot while the winner's mutation is still uncommitted. The same snapshot must reach the attempted write. Do not wrap each substep in an independent transaction or retry a failed operation and then claim the original race passed.

Expected loser errors can be captured only in a bounded inner exception block for the known case-specific SQLSTATE. Unknown errors propagate. The losing write's effects must roll back. Capture no passing report until the observer evidence and independent postcondition match. A backend permission error on the initial read, a missing function, or wrong project cannot count as a desired stale-write denial.

## Special revocation sequence

The winner holds only the synthetic client's row lock, without a caller membership lock. Once the loser is visibly waiting on that winner, the controller updates only the synthetic membership to inactive, then verifies the update committed before releasing the winner. The post-lock write must be denied or produce the expected serialization failure. Restore only that fixture membership afterward. If the timing cannot be controlled by full browser batches, the case remains unrun; do not silently replace it with revoke-then-write.

## Checks after each case

Verify the exact state assertion in the matrix: one edge for the cycle, winning name retained, revoked asset unchanged, no stale legal review, or compatible factual status refresh with review `current` and status `pending`. Read only the synthetic workspace. Store pass/fail, PIDs, lock evidence, SQLSTATE, isolation, fixture IDs and postcondition; do not export other activity/queries or real records. Repeat only a failed/inconclusive case after fixing its cause; keep evidence from the unsuccessful attempt.

The two mark-owner races cover the existing direct-update and USPTO-save paths. The status-refresh race must use the existing USPTO function and preserve the reviewed legal identity. No external USPTO request or actual website scan is needed; all fields are synthetic. Staff claims at `aal2` in these SQL batches are deliberate role simulation, not a real signed-in staff/MFA test.

## Implementation limit

The transport and controlled winner-release mechanism have not yet been demonstrated in BCM Test. The prepared read-only pause probe establishes only simultaneous backend availability. Before committing any backend/fixture setup, a later implementation must demonstrate how it will reliably observe the loser wait and, for revocation, commit the controller change before the winner releases. If the Dashboard's timing or pooling prevents this, report the limitation and seek approval for an alternative; no remote shell/account/secret transfer is pre-authorized.
