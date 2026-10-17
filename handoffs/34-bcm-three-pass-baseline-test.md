# Three-pass baseline — Test implementation complete

October 12, 2026. Approved bounded phase: three successful starting passes, saved-result verification only. No paid scans or Production changes.

## Working in Test

The first three completed runs for each client + website domain accumulate known/baseline candidates without new-discovery alerts. Failed/discarded runs do not count. Progress is read for the currently saved website; saving a different website starts a separate baseline. Same-domain frequency/category/settings edits retain the existing history. Existing review decisions/publications are not rewritten.

The existing Test review tool shows successful-check progress. Building the starting list performs only the remaining checks, serially, through the existing verified manual worker. It stops on failure, pause, changed client, changed website or changed settings version. Ordinary later research still uses one check. The AI monitoring wrapper prevents starting before the baseline is complete. No new timer, service, crawler, account or login scanning is included.

Counter RPC vb_bcm_ai_baseline_progress(uuid) returns only completed/remaining counters for an accessible client and saved website. Anonymous execution denied; client/verified staff checks retained. The Test-only migration replaces existing finalize/monitor wrapper functions without changing their grants. No worker redeployment needed.

## Verification

Seven focused orchestration checks passed: three serial checks, resume remaining passes, failure stops without retries, paused state zero requests, one ordinary check after completion, scope/version change stop, pause after a pass stop. Existing worker/package checks also passed: 46 local checks total in this phase.

Hosted Test replay used the saved 10 + 2 + 10 OpenAI candidates on a separate synthetic website inside a transaction: all 22 became baseline/known, failed pass did not advance progress, monitoring before completion denied, repeated finalization idempotent, repeated Dots kept one known observation, and a fourth synthetic unfamiliar name entered needs-review. Other-client progress denied. No provider worker/API was invoked. Initial fixture lacked its required context field and was corrected; the failed transaction was rolled back. Saved names/passages remained; replay context/URL explicitly synthetic.

Updated existing hosted privacy/review regression also completed without error, with two extra empty baseline passes to preserve its later-discovery expectations. All temporary records/config/settings/review writes rolled back. Final live checks: both Test readiness flags false; saved runs8 and observations54 unchanged; synthetic replay rows0; active BCM jobs0; anonymous progress access false. Actual Test client screen shows3/3 and disabled monitoring/research. Original benchmark records/states are retained, not retroactively relabeled. Production remains on its prior disabled installed version e3e30b9.

## Files and saved work

New: supabase/proposals/bcm-ai/baseline-3-pass.sql, verify-baseline-replay.sql; tools/bcm-ai-test-review/baseline.mjs; tools/bcm-baseline.test.mjs.
Updated: Test setup.sql and verify.sql; Test tool test-api.mjs, review.mjs, index.html (some Test tool changes started in the prior benchmark). Older unrelated scanner drafts preserved. No commit/push in this phase. Screenshot in chat outputs/bcm-three-pass-baseline-test.png.

## Remaining MVP route — no extra discovery features

Next proposed bounded phase: carry this verified rule into Production and display only attorney-reviewed discoveries in the existing VB tools and Brand Map, with clear separation from trademark registration status. Keep monitoring disabled until that integration is checked. Then separately approve a single-client live pilot. No further discovery refinement is proposed before rollout.

Production changes/Brand Map integration/activation remain unapproved. Production package generator is pinned to the earlier deployment commit; do not rerun it blindly and overwrite baseline changes or parallel work. Appropriate next model: GPT-6.1 Sol medium for the existing portal/database integration.
