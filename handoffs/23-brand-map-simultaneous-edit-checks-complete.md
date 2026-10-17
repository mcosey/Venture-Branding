# Brand Map simultaneous-edit checks complete — 2026-10-10

This supersedes coverage/status in handoff22. User approved the nine remaining tests and cleanup, then separately confirmed temporary setup at action time: "Yes, apply the Test setup, run nine checks and clean up." Approved phase fully completed. No sign-in/API or frontend integration phase approved yet.

## Verified outcome

Twelve distinct race scenarios are independently verified ACROSS TWO RUNS: previous run813aabca-15c9-45f8-8f3b-06a582182bc4 cases1–3 and new run15e0b84b-d8a1-4cc4-84dd-80abc767edad cases4–12. The strict combined verifier validates every three-actor report/blocker/isolation/outcome, independent CASE_PASS, committed controller proof and state_assertion from both completed cleanup manifests. No single-run12-pass claim. Earlier133 sequential assertions are separate evidence.

New namespace22940549, synthetic client5392d6a8-64ce-4103-8697-0a63397fd485, user27d3ea5d-caa4-4cc1-9061-897b35b89ea3, staffedea75b2-778f-44a4-9069-3408135da581. ALL REMOVED. Two SQL-only identities had no password/identity/session; no real sign-in or MFA was tested. New setup14 assets/six marks, nine cases executed; unused cases1–3 fixtures were removed without replaying their tests.

Exact BCM Test projectimvkhicfmidzbzsbhkzs; cluster7692130048193495360. Productionomvkwiosonatswocbdgx prohibited. Cotivate Devyjhzhflyuxcxugfgspby remains paused. No installs, commits/push/deploy or homepage/IP-backend connection changes. Preserve unrelated staged/unstaged BCM, Watch, filing and maintenance work on codex/attorney-workspace. No staging changes here.

Work directory:
/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/work/brand-map-remaining-20261010

Actual reports cases/4..12/reports.json and verification-result.json. New actual DB PIDs:case4 99990/99991/99992;5 100598/100599/100600;6 100626/100627/100628;7 100639/100640/100641;8 100652/100653/100655;9 100672/100673/100674;10 100685/100686/100687;11 100711/100712/100713;12 100729/100730/100733. Read-only gate rehearsal99935/99936/99937 passed; independent rehearsal postcheck left no objects/records.

## Parallel changes and exact protection

Fresh baseline schema3e2a037e65d234fb8bd80fc50fb283923ffd6c9a4fd2c7151c557f1a9debbc5c. Setup-owned catalog transaction xmin489067. Installed schema1d51aa19847797d08fae981e59fe9838953e0926c347bde3bb890e5f29791306.

Case12 participants produced expected successful review/status-refresh outcomes, but first independent verification stopped on schema drift. Full unowned metadata comparison against the previously verified baseline found EXACTLY ONE changed catalog field:public.vb_record_filing_review functionOID46902 source hash changed from7321ba61c3eac954482d4f0fe8cfe53d3f4681a17c14ab4d92fc8b3b37e4da9b to b2b132f281d319f3f2a255e92e3b8deb12b837be4b41569c655f354f2c4a6a57. Other function metadata/permissions/config and every other unowned catalog item match; all11 owned function catalog tuples retain setupxmin and exact original reconstructed schema. Existing rows initially matched setup.

Live preservation-bridge SQL substituted ONLY that known older source hash for comparison, recreating the installed schema digest EXACTLY. This proves that the filing function source is the sole installed-catalog difference. Adapted final verification keeps BOTH the exact observed current whole-schema pin0242ac6898d7fd04ee9ef130c507e4d46cf4c9987a9302cac5fe7d1f838d06c7 and the reconstructed original fingerprint. Nothing is ignored generically, no database function is replaced, and the original run manifest is unchanged. cases/12/verify-preserving-filing.sql verified actual saved state and wrote CASE_PASS without replaying participants. The change is routine within the approved test/cleanup phase, using the already approved preservation approach.

Cleanup rehearsal first refused a row drift:public.vb_filing_reviews increased from4 to9 via parallel work, while every other existing row fingerprint and global structure stayed unchanged. Diagnostic copied only counts/digests/catalog metadata, no client row contents. User was informed. Current nine filing-review records were pinned in a local cleanup manifest override; original stored manifest remains unchanged. Same DELETE/DROP/ALTER scope, ownership/dependency guards, short table locks and unused-date checks. Future drift still refuses cleanup.

Successful actual scripts:09-current-records-cleanup-rehearsal.sql, 07-rollback-checkpoint.sql exact before/after comparison (schema + owned fixture digest + nine completed cases + inactive connections), then09-current-records-cleanup.sql COMMIT, then10-independent-postcheck.sql. Preserve current filing function and records. No original checkpoint restoration of parallel work.

Post-cleanup schema91352b10ef03f346948db20e1d1d793f6c9f49d53839582e5a22f388ca3d59e9 matches exact projected current unowned structure. All new Brand Map/control tables/functions, temporary USPTO helper and date fields absent; all remaining_* counts0; current_records_preserved=true; filing function hashb2b132... intact; extensions unchanged. Cleanup rehearsal rolled back exactly, final cleanup committed and separately verified. Harmless audit sequence gaps possible, no counter resets.

## Reusable package fix

supabase/proposals/brand-map-races/package.mjs buildCleanup now accepts ONLY audit entries linked to matching owned generated relationship/legal-link slot IDs, including current/previous stable id/client/child or asset keys. Added SHARE ROW EXCLUSIVE preservation-table locks (3s lock timeout), and refusal if other clients use a run-added date field. Original manifest-only audit guard issue in handoff22 is FIXED in source.16 local package tests passed before DB execution, and the corrected cleanup passed the live rehearsal/cleanup here. Original old prepared ZIP/snapshot remains historical and unchanged; do not execute its old cleanup. New packet uses corrected source. No original Brand Map draft/privacy/local-concurrency/USPTO source changes.

Original source hashes:draft21147e0c3c5687daf51d4f82e69872b33984cecf0dc34a2754ae235e152fedf3;privacyfa5b63c982f1ba1b784fe2d0ee9e8c0a5ca480a03bb57c25610677eb54e7f041; local concurrency675cef5067e7ca854730094fa5306579fb68c807db8cf055eca2cb961d5a4014;temporaryUSPTOc4b3160d01eb56aaacceab3b6dabcc5af32d3f150b7b31bcd4cd70f5deed641d.

## Artifacts / continuation

outputs/brand-map-simultaneous-edit-complete.md and brand-map-simultaneous-edit-results.json are latest user-facing outcome. Strict verifier work/.../verify-combined-results.mjs passed and saved combined-result.json. Screenshotoutputs/brand-map-twelve-checks-cleanup-confirmed.jpg.

Cua In-App Browser main Test SQL tab1 marked deliverable, result cell-detail modal open. Agent-created winner2/loser3 closed. No active run connections. For future UI: bind current tab, Close modal. Full SQL paste + clipboard exact verification REQUIRED before Run. Occasional selection/copy lag caused mismatches that stopped execution; no mismatched SQL was run. Using Playwright editor.press('Meta+a'/'Meta+c'), a fresh observation and separate copy verification settled it. Do not read app-internal Monaco models. Do not import generator in Cua (process missing); use Node only for local file generation/verification, Cua only for dashboard execution. Never replay specific namespace cleanup/pins after removal.

Next bounded phase pending approval:22 actual sign-in/API access checks with disposable login accounts and temporary backend setup in BCM Test, cleanup afterward. They are NOT implied proven by SQL claims (real login/MFA/browser/API isolation untested). IP asset backend remains unconnected to the client homepage; authenticated trademark-based homepage unchanged. Prefer existing prepared checklist over new broad audits. Ask phase approval and any action-time account/access confirmation required. No real client account/info needed. Recommend GPT-6.1 Sol/medium reasoning for the established checklist; increase only for access-control troubleshooting.

No subagents or messaging other chats authorized. User explicitly requires bounded phases, approval before new phases/major changes, and permission before installing/committing/pushing/deploying/changing actual account access.
