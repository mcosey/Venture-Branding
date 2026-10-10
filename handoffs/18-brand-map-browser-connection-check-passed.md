# Brand Map: browser simultaneous-connection probe passed

October 10, 2026. User approved the short read-only BCM Test connection check after handoff 17. Scope fulfilled; no application/database/account writes or settings/access changes, installation, provisioning, deployment, commit/push or messages to other chats. Branch `codex/attorney-workspace`; parallel changes/staging preserved.

## Verified

- Exact Test project `imvkhicfmidzbzsbhkzs`, cluster `7692130048193495360`, PG17.11.
- Fresh preflight before run; application digest remained `0af1c031dfcef3c5807f250eec838d8632c751049a2ce6219dd86573e82b3ac2`.
- Three entire SQL batches in three separate browser tabs, all BEGIN READ ONLY/ROLLBACK. Exact pasted SQL was checked by UI copy and compared to approved copies; original blocked templates unchanged.
- Two 15-second participant queries at PIDs 74976 and 74977 were simultaneously active in PgSleep, independently observed by PID 74978. Both returned matching PIDs after completion. First attempt passed.
- Independent read-only postcheck: zero labelled probe connections and identical cluster/application/prerequisite state. No test tables/fixtures installed. Query labels were transaction-local.
- Temporary probe browser tabs 9 and 10 closed. Main own Test editor tab 7 retained for handoff at `https://supabase.com/dashboard/project/imvkhicfmidzbzsbhkzs/sql/5d167eb8-9954-49f0-9cfd-c342191c544b`, now displaying postcheck.

## Files

Current chat `/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2`:
- `outputs/brand-map-connection-check-review.md`
- `outputs/brand-map-connection-check-results.json`
- `outputs/brand-map-connection-check.jpg` (full observed cell details)
- `work/brand-map-connection-check-20261010/`: exact approved query copies, fresh preflight and observation/postcheck.

Repository `supabase/proposals/brand-map-browser-tests/` README/matrix/manifest and chat review copy updated to distinguish verified read-only transport from unrun write races/sign-ins. Defaults still blocked.

## Boundaries / next approval

133 sequential checks previously passed. All 12 independent-session write races and 22 real client checks remain unrun; browser timing/revocation coordination for real writes remains unverified. New persisted IP assets/relationships/legal-review functions are still unapplied/unconnected.

Recommend the next bounded files-only phase: build the executable 12-case hosted browser race package, including pinned Test-only temporary committed setup, manifest ownership, actual lock/blocker/snapshot evidence and guarded cleanup for review. No SQL writes, accounts, setup activation, race execution, Mac install, cloud runner, billing, production changes or login harness activation in that preparation phase. GPT-6.1 Sol high reasoning for concurrency/privacy/cleanup implementation. Actual client-login page/accounts remain later after races. Obtain user approval before starting.

Use original local-only runner as source; preserve its guards. Check `vb_save_uspto_mark` compatibility in addition to earlier prerequisites. Do not treat three tabs or pauses as write-race proof: require actual intended lock wait and postconditions for every race. Never reset shared sequences, use broad fixture deletion, DROP CASCADE, discard BCM Test or change parallel feature objects. Main project and paused Cotivate project excluded.
