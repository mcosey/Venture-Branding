# BCM Production rollout — review package

Prepared October 12, 2026. **Local draft only. Nothing installed in Production or activated.**

The tested BCM can research a public website, remember observations, compare normalized names with existing trademark records, and send discoveries to the private attorney queue. Only attorney-approved updates appear to clients. This package adapts that tested work for Production; it does not restart the retired crawler.

## Proposed first release

Start with **one explicitly selected client**, with a proposed ceiling of **20 total research attempts**, including failed attempts. That is a pilot allowance, not a dollar limit or a permanent service limit. Manual and scheduled attempts share it. Increasing it or expanding to other clients needs a later decision. No client is selected in this draft. At the ceiling, new reservations are blocked; the saved schedule may still show enabled until explicitly paused. The ceiling is not a substitute for account billing alerts.

Clients keep control of their website, categories, excluded paths, weekly/monthly frequency, and start/pause choice. Saving settings is separate from starting research. Old enabled preferences cannot silently restart monitoring. Other clients cannot start research or enable AI monitoring under this pilot.

The private attorney queue supports evidence review, approval, dismissal, withdrawal, and linking duplicate names. Exact normalized names are compared with the client's trademark records inside VB; private portfolio records are not sent to OpenAI. It does not automatically create trademarks, restore the Brand Map connection, or send messages. Those actions are outside this rollout.

## Three bounded steps

1. **Prepare and review — this completed step.** Local scripts, worker code, website patch, checks, and pause instructions are ready. No hosted changes and no API spending.
2. **Install while off — separate approval required.** Verify the existing Production prerequisites; add AI observation/review tables and functions; deploy only the two new AI workers with their release switch off; apply the portal patch with paid controls off. No monitoring job is created and no client schedule is enabled. Check sign-in, access isolation, settings, private queue, and disabled controls without paid research. Preserve the old crawler and its data in retirement.
3. **Activate a limited pilot — separate approval required.** Name the client and public website, confirm the allowance and API billing/key, explicitly pause any saved legacy enabled choices, and run approved manual research before enabling the new scheduled job. Client re-saves consent/settings and chooses Start monitoring. Use the same existing infrastructure; no additional service signup or software installation is proposed.

Do not run every SQL file in sequence. Files marked NOT-APPROVED are future activation drafts, not installation instructions.

## Installation materials

| Material | Purpose |
| --- | --- |
| sql/01-preflight-readonly.sql | Checks exact Production identity and existing prerequisites; reports old monitoring choices without exposing secrets. |
| sql/02-setup-disabled.sql | Adds AI tables/functions with readiness false, no selected client, and no job. Refuses the wrong project, missing prerequisites, an existing AI schema, or active old scheduler. |
| sql/03-check-disabled.sql | Verifies disabled state, table access controls, and worker-only completion rights. |
| deployment/bcm-ai-scan.ts | Single-file manual worker suitable for existing Supabase deployment. |
| deployment/bcm-ai-schedule.ts | Single-file scheduled worker; private scheduler authorization. |
| frontend.patch | Exact changes against committed 954f3db, including portal links, queue, styles, and cache versions. |
| frontend/config.review.js | Fields to merge into current config; not a replacement for it. |
| deployment/environment.review.txt | Required settings with no secret values. |
| sql/06-pause-preserve.sql | Stops AI readiness and the new job; retains evidence, settings, reviews, and publications. |
| manifest.json | Source commit and file fingerprints. |

Frontend copies are review material. At installation, check the patch against the current branch and reconcile any parallel homepage/blog work; do not overwrite those changes. Keep Production URL/public key, existing sign-in/session behavior, and unrelated Evidence/Digest configuration.

**Before approved installation:** save the current frontend/config and worker versions. If a check fails, leave all switches off and restore only the affected frontend/config files. Preserve newly added tables instead of deleting records. The pause script is for a schema that has already been installed; do not run it beforehand.

## Activation and privacy controls

- Workers require the exact Production project plus BCM_AI_RELEASE_ENABLED=true before any database/API access. Initial value is false. Database readiness and client consent/scheduling are separate controls.
- Manual research verifies signed-in client access and obtains a server-side reservation. Scheduled research uses the private scheduler key. The proposed change to legacy JWT verification applies only to these two new workers and still requires approval at installation time; built-in authorization remains enforced.
- Allowed browser origins must be explicitly configured. The approved review location is the existing local portal on port 8000. No confirmed public hosting address is available; do not invent one.
- OPENAI_API_KEY must be supplied privately through existing Production secret controls. The seven-day Test key is not assumed suitable for ongoing Production monitoring. Never copy secrets into this package, browser config, source files, or chat.
- Reuse the existing private Production scheduler credential only after confirming it is available and works, without displaying it. Preserve unrelated credentials, accounts, and jobs. Cotivate Development remains untouched and paused.
- Any legacy enabled schedule choices must be separately approved for pausing via pause-legacy-choices-NOT-APPROVED.sql. Website/frequency/history remain. Activation refuses to proceed while any old enabled choices remain.

## What the evidence supports — and its limits

Five earlier successful Test runs produced 32 observations, with estimated combined usage of $0.123894. That is historical trial evidence, not a current pricing quote or a budget guarantee. Model/token/search prices must be checked before paid activation. This preparation made zero paid calls.

The draft retains the tested GPT-6 Luna low-effort research method. OpenAI documents domain-filtered Responses web_search, live access configuration, and consulted source URLs. Those are retrieval controls, not complete website snapshots. [Official web search documentation](https://developers.openai.com/api/docs/guides/tools-web-search).

Coverage varies; newly discovered does not prove newly launched. The initial observations establish known names. Later unseen names may enter review, with duplicate normalization and attorney linking. Missed results do not prove an asset disappeared. Sign-in pages and image-only logos remain excluded. Passages are extracted from AI research with cited URLs; they are not independently verified page captures. Attorney review remains necessary.

A controlled real website before/after change test has not been completed. Repeated observations and the Test publication/withdrawal flow worked, but exhaustive or consistently complete change detection is not established. Brand Map reconnection is not included here.

## Local verification completed

21 focused checks passed against the Production drafts, using fake credentials and mocked API/database calls: disabled release switch, exact project guard, client/private scheduler authorization, explicit browser origins, stale reservations, pause/discard behavior, evidence filtering, bounded research, and privacy-preserving errors. SQL safety checks were textual checks only; they do not prove PostgreSQL execution or hosted access isolation.

The frontend patch passed a clean-apply check against an isolated copy of committed 954f3db. JavaScript/Python syntax checks passed. No database scripts were executed, no hosted functions deployed, and no Production browser flow was tested in this preparation.

**Recommended next step:** review this package, then approve only Step 2: install and verify while research stays off. Paid activation stays a separate decision. GPT-6.1 Sol with medium reasoning is appropriate for the installation checks; keep the existing lower-cost research model for the pilot unless testing gives a reason to change it.
