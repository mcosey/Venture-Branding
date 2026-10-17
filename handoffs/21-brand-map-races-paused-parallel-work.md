> Superseded for current cleanup status by handoff22: the revised cleanup is approved, executed and independently verified. No temporary setup remains. Retain this note as the historical review/checkpoint.

# Brand Map races paused for parallel work — 2026-10-10

Scope: Approved temporary BCM Test setup, 12 actual three-connection races, guarded cleanup. No installs, production changes, commit/push/deploy or real-client account changes. User asks approval before new phases/major changes. Revised cleanup guard approval is now REQUIRED; do not execute original cleanup or any BLOCKED file.

Repo branch remains codex/attorney-workspace. Preserve all staged and pending BCM, Watch, filing and maintenance work. No staging changes made here.

Allowed Test project imvkhicfmidzbzsbhkzs. Main omvkwiosonatswocbdgx prohibited. Cotivate Dev yjhzhflyuxcxugfgspby remains paused.

## Installed run and verified results

Run 813aabca-15c9-45f8-8f3b-06a582182bc4, label bm-race-813aabca, cluster 7692130048193495360. Manifest namespace 135506621.
Client 2ba5b51e-62d8-48db-915f-b273e84736bb; synthetic user 7da00277-4ee2-4719-bfa4-43e77f4fb6ed; synthetic staff eb1493cf-c9fe-4956-a57e-0ce120c55c02. SQL-only Auth records, no passwords/login identities created.

Temporary setup actually committed, including reviewed optional vb_save_uspto_mark. 14 synthetic assets and six marks.

Cases 1 cycle, 2 stale-edit, 3 membership-revocation, READ COMMITTED: independent CASE_PASS saved. Case 4 direct-mark-update participant reports strictly passed expected overlap/write/rejection evidence, but independent verification failed with P0001 "Run ownership or installed schema changed". Case 4 is NOT fully verified; do not rerun participants on this fixture. Cases 5–12 unrun. No full pass claimed. No active run connections in last live check.

## Diagnosis

Original preflight schema 0c49d7293ea53700dc2bde88ccfcc2dcb75f8319001f0cef6beb823627cdf028.
Installed schema d90f17e5235585187c43f4cd420cfa953bece7d06d3f5d44b00c62ba71d18070.
Observed current schema b6e3fabba80fab9afad71ba2c1d3270f68a1f0fa5480b690ded8f43878edabe6.
Manifest exact and original draft source hash intact.

Catalog diagnostic: setup-owned rows xmin444446. Existing public vb_save_filing_draft(uuid,uuid,uuid,integer,jsonb) OID46876 and vb_record_filing_review(uuid,integer,text,jsonb) OID46902 now xmin489026, later than setup. Do not replace/drop them. Original row snapshot differs in auth.users (3→3), vb_filing_drafts (1→1), vb_filing_revisions (2→3). Do not reset these rows or misreport original preservation. Extensions unchanged. No unowned mark has a value in the three run-added date fields. No foreign public/vb_private function source mentions owned Brand Map names or added dates (static token check, not general dynamic-SQL proof).

## Prepared revised cleanup, pending approval

Working files are in chat directory:
/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/work/brand-map-races-20261010

Read outputs/brand-map-parallel-work-cleanup-review.md and revised-cleanup-review.json. Generator prepare-revised-cleanup.mjs is local-only. It generated BLOCKED cleanup and rollback rehearsal. These contain an initial approval exception outside the cleanup transaction; do not remove until explicit approval.

Only revised safeguards: original global installed-schema match replaced by exact current schema pin; original baseline rows/schema replaced in a LOCAL JSON variable (not database manifest) by reviewed current row fingerprints and projected expected structure after removing owned metadata. Existing ownership, foreign fixture reference, actual Auth identity/session, inactive run, extensions, restrictive dependency/drop and final leftover checks remain. Added SHARE ROW EXCLUSIVE locks on all captured application tables/Auth users, lock_timeout3s and statement_timeout30s, plus refusal if unowned marks use run-added dates. Schema/procedure drift at final check rolls the whole operation back.

Projected post-cleanup schema 3e2a037e65d234fb8bd80fc50fb283923ffd6c9a4fd2c7151c557f1a9debbc5c. Projection filters exact OIDs of only setup-owned relation/index (14), functions (11), constraints (30), triggers (35), new table policies and three added vb_marks columns. All current unowned metadata preserved. Expected new hash intentionally differs from original baseline due to parallel work.

Current row fingerprints are pinned. If they change before approval/execution, STOP and refresh diagnostic/review rather than silently adopt changed values. Avoid destructive cleanup if new foreign dependencies or use of date fields appears.

After approval: run revised rehearsal only (final ROLLBACK); verify full batch/no error, save report, then rerun read-only current checkpoint to confirm full setup/schema/rows retained. If correct, run exact equivalent real cleanup with COMMIT; Supabase destructive-operation confirmation is covered only for named disposable Test setup. Independently run original 04-postcheck.sql, validate cluster, projected new schema, unchanged extensions, optional USPTO absent, every owned object/fixture/active connection absent. Do NOT use original verifyCompletedRun: 12 tests were not completed and original schema checkpoint legitimately changed. Report partial coverage plus current parallel-work preservation truthfully. Cleanup result field is current_parallel_rows_and_rules_preserved rather than original baseline claim.

## Browser recovery

Current reopened In-App Browser tab id1, exact Test SQL URL:
https://supabase.com/dashboard/project/imvkhicfmidzbzsbhkzs/sql/5d167eb8-9954-49f0-9cfd-c342191c544b
Marked handoff. It displays cell-detail modal; Close it before editor use. Old tabs7/11/12 disappeared between turns; no active connections remain. Do not assume old bindings.
Use Cua only for browser, full SQL paste + clipboard exact compare, then deselect before Run. Require full batch completion/no SQL error plus expected single JSON cell. Save screenshot for review/results. Actual SQL runs only through authorized dashboard UI, not CLI/network/credentials.

## Artifacts and unchanged source

Current execution evidence: diagnostic-result.json; catalog-diagnostic-result.json; preservation-diagnostic-result.json; cleanup-review-result.json (counts/digests only); cleanup-dependency-result.json; revised-cleanup-review.json; cases/1..4/reports.json and cases/1..3/verification-result.json. Screenshot outputs/brand-map-cleanup-boundary.jpg.

Original prepared ZIP and snapshot unchanged, but OLD CLEANUP NOT SUITABLE for current installation. Do not regenerate manifest or fixture namespace. Original source pins: brand-map draft21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3; privacyfa5b63c982f1ba1b784fe2d0ee9e8c0a5ca480a03bb57c25610677eb54e7f041; temporary USPTO sourcec4b3160d01eb56aaacceab3b6dabcc5af32d3f150b7b31bcd4cd70f5deed641d.

22 real-client login/API checks remain unrun. Portal IP asset backend remains unconnected. Existing authenticated trademark homepage remains separate and working as previously verified.

Recommended next bounded phase: revised guarded cleanup only, rollback rehearsal then actual removal and independent postcheck. Ask approval. GPT-6.1 Sol/high reasoning appropriate; no new race execution in that cleanup phase.
