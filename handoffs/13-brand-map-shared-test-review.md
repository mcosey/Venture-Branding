# Brand Map shared test environment review

October 10, 2026. Mario approved a read-only review of whether BCM Test remains necessary and a safe testing recommendation. Review complete; no database/project/access changes, product edits, commits, pushes, deployment, installation, or messages to other chats were performed.

Report:
`/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/outputs/brand-map-shared-test-review.md`

## Evidence and decision

Read the relevant stopping-point sections of `handoffs/01-main-vb-bcm.md`, the latest `BCM.md` entries, and the recent messages in **Venture Branding (Current)** (`01a12288-a541-7880-a9ae-b5b061941db1`). Its current user-approved phase is the BCM Production release and verification, with the latest commentary indicating work in progress. No completion was observed. The older main handoff's paused BCM state is superseded by the later BCM notes and the October 10 dashboard check.

Latest BCM notes report successful Test database/HTTP/browser/Findings checks and exact fixture cleanup. The release-preparation checkpoint records a concrete package and private recovery files, with deployment awaiting approval; the subsequent chat contains user approval and deployment-start commentary. Preserve BCM Test as the working reference until this release is verified. Do not pause it based on the permission to pause Cotivate Development, which is a different project and already paused.

Recommendation after BCM release completion: reuse the existing **BCM Test** project (`imvkhicfmidzbzsbhkzs`) for Brand Map testing, subject to explicit approval and compatibility checks. This avoids an extra free-project slot. It does not make the environment disposable or permit resetting it. Main Venture Branding (`omvkwiosonatswocbdgx`) remains a prohibited Brand Map test target.

## Next approval

Ask approval to prepare hosted-test files only, with exact-target restrictions, compatibility preflight, change inventory, separately named synthetic fixtures, complete assertion reporting, and narrow cleanup. Do not execute SQL or connect to the database in that preparation phase. Preserve existing local-only guards and all parallel source/staging. The new guarded copies must account for the existing BCM schema; the empty-project preflight from handoff 11 is unsuitable for this proposed shared-test route and must not be bypassed silently.

Sequential browser checks and 12 independent-session concurrency scenarios remain distinct and unrun for Brand Map. Remote runner account/cost/access decisions remain unapproved. No installation on the Mac. Actual application/testing requires a subsequent explicit approval and a completed BCM release checkpoint. User authorization is needed before any inter-chat message; none sent during this review.

Recommend GPT-6.1 Sol, medium reasoning for bounded package preparation; high for later privacy/concurrency debugging if necessary.
