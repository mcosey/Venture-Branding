# BCM AI Phase 2 — local Test prototype (2026-10-11)

User approved Phase 2 Test-only prototype after a successful six-run OpenAI hosted retrieval trial. Local work is prepared; NO hosted migration, worker deployment, readiness activation, new API secret, paid Phase 2 call or cron activation was performed. No installation, commit or push. Production remains retired.

Primary repo: /Users/mcosey/Documents/Codex/2026-09-27/venture-branding-is-a-project-i-2/venture-branding
Branch: codex/attorney-workspace. Last checked HEAD 88585ef.

New files for this phase only:
- auth/bcm-ai.mjs
- supabase/functions/bcm-ai/{research,handler}.mjs
- supabase/functions/bcm-ai-scan/index.ts and bcm-ai-schedule/index.ts
- supabase/proposals/bcm-ai/{setup,verify,connect,activate-cron,pause}.sql + README.md
- tools/bcm-ai.test.mjs and tools/bundle-bcm-ai-dashboard.mjs
- tools/bcm-ai-test-review/ (preview and generated deployment bundles)

Existing pending BCM one-link/scheduling files remain preserved. Parallel v8.html, blog.html, content/posts, tools/build-blog.mjs, blog/posts and images/about belong to other work. Do not stage them with this phase.

Test-only scripts guard system identifier 7692130048193495360. Workers reject any SUPABASE_URL other than https://imvkhicfmidzbzsbhkzs.supabase.co. Old bcm-scan and bcm-schedule remain retired; new worker names are bcm-ai-scan and bcm-ai-schedule. Preserve old tables/history. Cotivate Development remains paused; no project access changed.

Local verification: 18 new tests + 2 retirement checks pass. Browser fictional approval → client publication, alias linking, independent start/pause, monthly preference save → monitoring pauses, and record reload flow checked. Browser errors empty. SQL/PLpgSQL/RLS and hosted provider/scheduler integration MUST still execute in Test; local mocks do not establish database correctness. No local SQL parser/database installed.

Preview server: Python built-in HTTP on 127.0.0.1:8885, repo root, process session 4023. UI /tools/bcm-ai-test-review/. No paid research in fictional preview. Test connection explicit with existing public key; no OpenAI key accepted by the browser. API key entered by user privately in Test worker secrets after deployment approval.

Phase 1 files/report: chat workspace outputs/bcm-openai-phase1. Live six runs were ~17 cents estimated, 13–17 seconds each. Source coverage and name counts varied markedly. No proof of exhaustive or longitudinal detection. No key retained.

Prepared next bounded step: obtain approval for the Test deployment described in supabase/proposals/bcm-ai/README.md, rollback SQL checks with existing accounts, at most six paid calls (proposed $3 trial spending limit), one automatic-schedule check, then pause AI Test readiness/job while preserving results. Manual worker gateway JWT OFF is protected by verified Supabase user token/role/RPC; scheduled worker JWT OFF protected by existing private header key. User must privately save OPENAI_API_KEY. No Production/Brand Map navigation changes or client emails. Ask before commits/pushes and any new phase.

Model recommendation: GPT-6.1 Sol Medium for deployment/testing; runtime GPT-6 Luna Low as tested. Avoid broad audits, redoing Phase 1 or new accounts.

## Deployment progress (same approved phase)

User approved the bounded Test trial. Applied revised setup.sql with explicit RLS on private config and no interim policy DROP. Rollback matrix executed without errors; post-check runs/observations/reviews/publications all zero, readiness flags false, active schedules zero. Two existing client accounts and one existing staff identity present; no identities created. Both new Test workers deployed via Supabase editor; legacy JWT verification remains ON. Awaiting private OPENAI_API_KEY entry and explicit action-time approval for only these two workers' authorization switches, per browser security rules. No Phase 2 API call or cron activation yet. Supabase tabs: 21 SQL, 48 bcm-ai-schedule settings, 49 Secrets with OPENAI_API_KEY name prefilled and value empty. Never inspect secret values. Progress JSON and database screenshot saved in chat outputs. Continue authorized trial after reply, then pause Test at end.

### Authorization check completed — October 11
User privately saved OPENAI_API_KEY in BCM Test and explicitly approved both worker authorization switches. Legacy JWT verification is now OFF on bcm-ai-scan and bcm-ai-schedule; built-in checks reject unauthenticated manual requests (401) and scheduler requests lacking the private key (403). No paid Phase 2 research has run. Database readiness remains off; no scheduling job activated. Next: existing Test client private sign-in, then the approved live trial. Production unchanged.

### Live Test trial — October 11
Five paid attempts all completed: OpenAI manual baseline 11, manual repeat 6, dispatched scheduled repeat 5; Harvey manual baseline 12, cron-triggered scheduled repeat 12. Estimated total $0.123894; 32 unique observations, 23 baseline/known and 9 needs-review. No client publications yet. Newly found names in rapid repeats demonstrate variable coverage, not proven new launches. Corrected scheduled claim table-alias collision and verified weekly/monthly timing, duplicate claim prevention, pause invalidation with rollback-only reservations. Corrected pause script to use supported cron.alter_job; direct cron.job update failed and transaction rolled back. Final verification: both readiness flags false, active schedules0, active AI jobs0, saved runs5/observations32. Production unchanged, Cotivate Development untouched.
Local review wording now specifically authorizes Test public research rather than asserting site ownership; own client session resumes after reload; ?view=attorney gives an unambiguous staff sign-in link. User needs private existing Test attorney sign-in/MFA to finish actual UI publication/withdrawal checks. No more paid research required.

### Test trial finished — October 11
Existing vb-filing-attorney@example.test MFA session loaded protected staff evidence and approved the temporary Harvey II snapshot via the actual UI with an explicit TEST ONLY note. Other Test client staff workspace was empty. After privately switching to cotivate-filing@example.test, actual client UI showed only its approved snapshot, no raw queue/private review fields, and only its own client in the selector. Guarded withdraw-ui-test.sql exercised the review RPC under transaction-local staff test claims to soft-withdraw that exact temporary approval, preserving observation/reviews/audit. Actual client refresh hid it; browser error log empty. This database-harness withdrawal is not a fresh staff browser button/MFA test.
All paid research remains paused; five successful attempts, estimated $0.123894, 32 observations preserved. Production/Cotivate Development unchanged. Phase 2 trial complete; next proposal is bounded existing portal integration in Test only, requiring user approval. No commit/push performed. Results report is in the chat workspace outputs/bcm-ai-phase2-results.md. Local preview server restarted on loopback8885, session53204.
