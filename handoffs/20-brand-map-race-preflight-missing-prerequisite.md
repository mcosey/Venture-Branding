# Brand Map race execution: stopped at missing prerequisite

October 10, 2026. User approved the bounded BCM Test rehearsal, conditional temporary setup, 12 races and guarded cleanup after handoff19. Began with branch/pending-change check and a fresh read-only preflight. Preserved parallel work/staging. No setup, rehearsal, races, SQL writes, accounts, installs, commit/push/deploy or inter-chat messages occurred.

Fresh exact Test URL verified in existing browser2/tab7. Cluster `7692130048193495360`, PG17.11; live application schema digest now `0c49d7293ea53700dc2bde88ccfcc2dcb75f8319001f0cef6beb823627cdf028` (differs from handoff18). Required base helpers/RLS intact, three allowed date columns still missing, no draft collisions/control table, Auth fixture metadata available. **USPTO save function absent:** `public.vb_save_uspto_mark(uuid,uuid,timestamptz,jsonb)`. Preparation preflight caught this; stop rule honored before rehearsal or mutation. Do not reuse the older schema pin or bypass this prerequisite.

Cua documentation restored; tab binding `raceMainTab` points to tab7, `raceFs` is Node fs/promises, `raceRoot` current repository race package, `raceWork` chat work path. Tab7 marked handoff; full preflight cell details expanded. Only own existing editor changed. No extra browser tabs created.

Chat files:
- `work/brand-map-races-20261010/00-preflight.sql` and `00-preflight-result.json`: exact UI-copied SQL/full observed JSON.
- `work/brand-map-races-20261010/missing-uspto-function.BLOCKED.sql`: exact three function/create/revoke/grant statements extracted from existing migration, immediately blocked; review only, not runnable standalone setup.
- `outputs/brand-map-race-preflight-results.json`: STOPPED_AT_PREFLIGHT, all execution coverage/write counts zero.
- `outputs/brand-map-race-preflight.jpg`: expanded result evidence.
- `outputs/brand-map-race-prerequisite-review.md`: concrete proposed additional Test prerequisite and approval boundary.

Proposed next approval: temporarily add the one existing USPTO-save function to guarded Test setup; keep security-invoker, staff/MFA check, existing RLS and original function definition; track exact ownership/source in manifest and remove only this run-added function on cleanup. No full upstream migration/new index, extension, account invitation, credentials or external USPTO calls. Date columns already in approved temporary setup suffice. Source `supabase/migrations/20261004000200_uspto_import.sql` SHA256 `6846444ac19732973406ab86095bdb29c7f75b570a654ba27b45d2c787bc6b5e`.

After specific approval, adjust package/source-manifest/validators/tests for this optional owned prerequisite, complete local verification, confirm coordinated Test window and fresh pins, then resume approved rehearsal and conditional 12 tests/cleanup. Any preexisting/new concurrent function stops replacement/removal. No code modification to race generator yet; handoff19 delivered ZIP remains unchanged, accurate preparation snapshot. Do not run the extracted review file independently.

Computer-use policy requires action-time confirmation for material security access expansion. If temporary database function permissions trigger that requirement, present the concrete setup after fixes and obtain action-time confirmation, explaining that this browser policy requires it. User generally wants approval only at new bounded phase/major change; routine test details covered. Named disposable Test data cleanup is pre-approved; no broad/permanent unrelated deletion. No messages to other chats without direct human authorization.

Product/coverage unchanged: trademark homepage working; new IP asset backend unapplied/unconnected; prior133 sequential DB assertions passed/rolled back; read-only connection probe passed; all12 write races and22 real-login tests remain unrun. Recommended GPT-6.1 Sol high for prerequisite ownership and concurrency execution. No Mac installations or unrelated project/account changes.
