# Brand Map isolated-test setup proposal handoff

**Superseded October 9, 2026:** Mario declined installation. Do not follow the Docker setup recommendation below. Continue from `11-brand-map-no-install-testing.md`; its next account check still requires approval.

October 9, 2026. Mario approved preparing a setup proposal only. That planning phase is complete. Installation, database setup, and validation remain unapproved.

User-facing proposal:
`/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/outputs/brand-map-test-setup-proposal.md`

Implementation notes:
`/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/outputs/brand-map-test-setup-technical-notes.md`

## Findings and recommendation

The checked Mac is Intel Core i5, macOS 15.4.1, with 8 GB RAM and about 37 GiB free. Node 24.18.0 is present. The checked tool/application locations did not contain Docker, Supabase CLI, psql, Homebrew, or alternate container runtimes.

Propose Docker Desktop Intel plus a pinned Supabase CLI v2.120.0 binary in a separate work folder. Use only the database/auth bootstrap; exclude unrelated services and stop auth after its definitions are initialized if unnecessary. Keep a 3 GB memory cap, 12 GB engine disk cap, a 10–15 GB overall storage planning allowance, and at least 20 GB host free. These are proposed limits, not measured evidence that the setup fits. Stop rather than enlarge limits or install alternatives without approval.

Docker's zero-cost business eligibility is fewer than 250 employees AND less than $10 million annual revenue. Eligibility is not established by a read of this handoff. Do not subscribe or accept paid terms. User may need to open the app and accept its own installation/license prompts.

The proposed next approval combines installation, a fresh local-only test environment, applying the Brand Map draft only there, running the sequential privacy suite and 12 actual overlapping scenarios, bounded fixes, reporting, and cleanup of the approved test resources. It does not include hosted linking, live data, account changes, client UI connection, commit, push, or deployment.

Use a uniquely named project and the exact database `venture_brand_map_test`. Copy only fresh local Supabase object definitions and the five necessary foundation/access scripts specified in the technical note. No production dump, seed.sql, Cotivate fixtures, edge functions, live config, or pending parallel feature migrations. Preserve the existing runners' local-target restrictions. A narrowly verified container SQL-client wrapper avoids a separate Mac SQL-client installation.

## Current state

The backend package in `supabase/proposals/brand-map` is still unapplied. SQL and database tests remain unrun. The prior nine homepage and four runner checks passed in the earlier phase; no product code changed in this planning phase. The homepage still lacks new business-asset editing and staff legal-link controls.

The shared branch remains `codex/attorney-workspace` with BCM, Watch, maintenance, and homepage work pending. Only this handoff was added to the project in the planning phase. Preserve other work. No messages to other chats were sent.

## Next step

Ask Mario to approve installation and isolated Brand Map database validation under the proposal's stated limits and free-license condition. Recommend GPT-6.1 Sol with high reasoning for privacy/concurrency debugging; medium is sufficient for installation mechanics. No model has been changed automatically.
