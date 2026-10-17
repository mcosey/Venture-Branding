# BCM Production rollout package — prepared, not applied

October 12, 2026. User approved preparing local review materials only. No deployment, activation, account change, API call, install, commit, or push authorized/performed in this phase.

Review: supabase/proposals/bcm-ai-production/README.md. Includes two Production-specific workers, additive disabled schema, frontend patch/config merge notes, separate NOT-APPROVED pilot activation/job drafts, read-only checks, and pause-preserve instructions. Built from committed 954f3db0f3de3990de7894888a020f53e73f96de, not pending retired-crawler work. Normal Production files/config are untouched. Do not blindly apply copies over parallel work.

Draft proposal: one explicitly named pilot client, 20 total attempts including failures. Client remains unselected. Worker BCM_AI_RELEASE_ENABLED=false, DB readiness false, no new cron, paid frontend controls false. Exact Production project omvkwiosonatswocbdgx, system ID 7690937621030482216. Existing enabled legacy choices require explicit approval for pausing; activation refuses them. No old crawler reactivation. Test/Cotivate/other automations remain unchanged.

21 focused mock checks passed against Production draft; patch clean-apply and syntax checks passed. SQL checks are textual, not hosted execution. No claim that live Production access/SQL works yet. A controlled live before/after change test remains uncompleted. Brand Map restoration is outside this package.

New local files: package directory, tools/build-bcm-production-package.py, tools/bcm-production-package.test.mjs, this handoff. Older modified/untracked crawler files preserved. Generator pins the reviewed source commit and never deploys; manifest fingerprints generated materials.

Next proposal: review then approve installation while off, including additive Production DB/functions, two worker deployments and portal patch, followed by no-spend verification. Separate approval needed for private key entry/gateway changes at action time. Paid pilot activation remains a separate decision with named client/site and allowance. No public hosting address confirmed; existing localhost8000 approved for now. Appropriate next model GPT-6.1 Sol medium.
