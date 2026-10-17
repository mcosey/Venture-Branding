# Brand Map hosted test package — sequential checks passed

October 10, 2026. The user separately approved execution in BCM Test, including three temporary nullable trademark date fields and temporary pgTAP, entirely inside the rollback test. The executed wrapper passed **133 database assertions**, verified preservation, and passed an independent cleanup check. **14 local packaging/guard checks passed.** This document itself grants no execution permission; the CLI still emits a blocked copy.

This is a **browser-first, rollback-only sequential test** for the existing Venture Branding BCM Test project `imvkhicfmidzbzsbhkzs`. It must wait for the parallel BCM release to have a completed verification checkpoint and for explicit execution approval. It installs nothing on the Mac and creates no project. The main Venture Branding project `omvkwiosonatswocbdgx`, Cotivate Development, FlowRata and all other projects are excluded.

## Files

| File | Purpose |
| --- | --- |
| `01-readonly-preflight.sql` | Read-only cluster identity, schema fingerprint, prerequisite and collision report |
| `02-rollback-check.BLOCKED.sql` | Full draft and sequential pgTAP checks inside a rollback wrapper; intentionally refuses execution until later verification/approval |
| `03-readonly-postcheck.sql` | Separate read-only schema and fixture-absence confirmation |
| `package.mjs` | Local generation and result validation only; no database connection, credential loading, browser automation or network calls |
| `package.test.mjs` | Offline target, packaging, result and cleanup-check tests |
| `source-manifest.json` | Exact original-source/generated-file hashes and synthetic fixture namespace |
| `change-inventory.md` | Object changes and preservation limits |

The generator's CLI emits only a blocked review copy and accepts no enabling arguments. It reads the two unchanged sibling `brand-map` proposal files. Its exported builder can prepare a verified execution copy only after an exact observed dashboard SQL-editor URL, valid cluster identity, schema fingerprint and completed BCM checkpoint are supplied. Those values/flags are safeguards, **not human authorization**. No connection string or secret is an input. Preserve the original local-only SQL/runner guards.

## Execution procedure — any new run still needs phase approval

1. Confirm BCM's release checkpoint is complete and no other chat is running Test writes. Check the visible browser URL identifies exactly BCM Test; avoid unsaved queries used by another workflow. No inter-chat messages are authorized by this document.
2. With approval, run the read-only preflight there. Required functions must be present, object collisions absent, and base row security enabled. The normal path requires all columns and existing pgTAP. The separately approved temporary path permits exactly the three missing nullable `vb_marks` date columns (`filing_date`, `registration_date`, `uspto_status_date`) and absent-but-supported pgTAP in the existing `extensions` schema. Unknown missing prerequisites stop execution. These additions are made only inside the inner rollback block. Do not replay foundation/BCM migrations, replace existing functions, or expand permissions as a shortcut.
3. Review the preflight output, including actual column/helper compatibility where needed, and pin its cluster identity/schema digest in a newly generated execution copy. PostgreSQL's system identifier identifies a **cluster**, not a Supabase account/project; clones can share an identifier. The visible exact project URL remains an independent mandatory check. If `pg_control_system()` is inaccessible or identity cannot be established, stop and report the blocker; do not grant privileges or weaken guards. [PostgreSQL control data functions](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-PG-CONTROL)
4. Run the whole guarded rollback check as one batch, not selected fragments. It uses a 3-second lock limit, 60-second statement limit and 60-second idle-transaction limit. These are proposed bounded limits, not measured hosted timings. Do not silently raise them or enable persistent installation.
5. The inner exception block rolls back the draft, fixtures and test changes while retaining result variables. It catches only its own success sentinel; assertion/permission/unknown errors fail the run. The final report requires one complete ordered passing TAP plan plus identical before/after existing-table and schema fingerprints. The outer transaction then rolls back its temporary helper and report setting. The executed wrapper completed successfully on PostgreSQL 17.11 in BCM Test; both application and prerequisite fingerprints were restored. [PostgreSQL exception rollback behavior](https://www.postgresql.org/docs/current/plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING)
6. Save the complete report and validate it with `verifyReport`, then run the separate read-only postcheck. Require the same identity/schema and zero reported leftovers/collisions. If there is an error, a lost connection, missing results or a cleanup mismatch, report unverified/failed rather than passed. Never clean unfamiliar records with broad deletes; never reset shared sequences. Resolve an open transaction with rollback in its own session if necessary, and verify state separately.

## What is and is not established

The completed test used database claims/roles with synthetic users, clients and marks without creating real sign-ins or sending invitations. It is not an actual authenticated browser/API isolation test, portal connection, deployed feature, or completed security review.

The twelve independent-session concurrency scenarios remain in the original local-only runner and are **unrun**. They cannot be replaced by this single-session test. A later remote-runner/account/cost/access phase is separate; this package does not contain an enabled cloud concurrency runner.

The preservation snapshot compares existing public `vb_` tables, all protected `vb_private` tables, `auth.users`, and application schema/functions/grants/policies/triggers/constraints. It exports counts/digests, not row contents or function source. It limits each table to 10,000 rows / 16 MiB serialized data and stops rather than broaden access/limits. It does not fingerprint every provider-owned Auth/Storage table, sequences' current values or externally sent events. Known fixture paths do not invoke email, storage, external jobs or live website requests; inspect any unexpected installed triggers before execution.

Audit identity sequences advance even when inserts roll back, so numbering gaps can remain in this test database. Resetting them would risk other work and is excluded. Temporary schema locks can briefly block Test trademark reads/writes; execution must be coordinated around other Test work. No main-database records or credentials are copied.

## Recorded run

Fixture namespace: `5c4b568e-202e-4f17-b922-2667333aa15d`. Cluster identifier: `7692130048193495360`. Matching before/after application schema fingerprint: `0af1c031dfcef3c5807f250eec838d8632c751049a2ce6219dd86573e82b3ac2`. All 133 assertions passed on the first database run; no backend business/legal changes were needed. The prior preflight fingerprint had changed during parallel development, so a fresh compatibility and installed fixture-trigger review preceded this run. All extension metadata matched afterward, the three fields were absent again, no Brand Map objects remained, and all seven tracked fixture categories had zero rows.

Complete results and cleanup evidence are saved in the current chat outputs. Twelve concurrency scenarios and actual signed-in browser/API tests remain unrun. No persistent backend installation, portal reconnection, deployment, commit, push, new project, Mac installation, or change to a real account was performed.
