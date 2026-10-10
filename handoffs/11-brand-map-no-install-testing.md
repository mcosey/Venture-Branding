# Brand Map no-install testing handoff

**October 10 update:** The subsequent read-only account check is complete. Cotivate Development is already paused and Supabase still blocks creation at the two-active-project limit. See `12-brand-map-hosted-test-availability.md` before acting on the next-step instructions below. No account/database changes were made.

October 9, 2026. Mario approved preparing a no-install proposal only. Planning is complete; no installation, account inspection, project creation, SQL execution, or product changes were authorized or performed in this phase.

User-facing proposal:
`/Users/mcosey/Documents/Codex/2026-10-09/living-brand-map-users-mcosey-documents-2/outputs/brand-map-no-install-test-proposal.md`

## User preference and next approval

Mario declined local installation. Handoff 10's Docker route and its linked technical notes are superseded. Do not install Docker, Supabase CLI, PostgreSQL clients, or an alternative on his computer.

Recommend a separate empty hosted Supabase test project with synthetic data. First ask approval for a read-only account-plan/free-slot check. No private account has been inspected; a $0 project is conditional on an eligible Free organization and available allowance. Do not pause/delete other projects or upgrade billing to obtain a slot. Ask separately before creating the project or running SQL. Preserve the shared branch `codex/attorney-workspace` and pending parallel work.

## Required future implementation safeguards

The existing proposal SQL requires database `venture_brand_map_test` plus setting `vb_brand_map.test_approved=local-disposable`; the Node runners require loopback-only connections and use psql. These are local-only files and cannot run unchanged against hosted Supabase. Leave their restrictions intact. Later approved work must produce separate protected hosted copies with explicit target approval and complete result parsing.

The currently configured project `omvkwiosonatswocbdgx` is a prohibited test target. Verify the new project reference against the selected account/project and an explicit allowlist; hosted database name `postgres` alone cannot identify a disposable project. Use a synthetic-only marker and empty-project preflight. Do not expose credentials in artifacts or create a browser endpoint that executes arbitrary privileged SQL.

Copy only the five required existing definitions: `20261003000100_client_foundation.sql`, `20261004000100_portal_connection.sql`, `20261004000200_uspto_import.sql`, `20261005000100_client_access.sql`, and `20261006000100_client_contact.sql`. Do not load seed.sql, live config, backups, or pending parallel feature migrations. Later integration with the combined schema remains separate.

Supabase supports pgTAP; sequential SQL checks can be adapted for its browser editor. Require full assertion results and preserve rollback fixtures. The 12 independent-session concurrency scenarios remain pending until a separately approved remote runner executes them and verifies cleanup. Codespaces is an optional browser-only remote environment, requiring account, allowance, permissions, code-transfer, and secret-handling review. No cloud runner was created.

## Verified state

The backend remains an unapplied draft. Earlier results: nine homepage checks and four local-runner checks passed, plus two Node syntax checks. SQL compilation, privacy behavior, concurrency, and database cleanup remain unverified. The existing authenticated trademark homepage is working; business-asset editing and staff legal-link controls remain unconnected. No tests were rerun for this documents-only phase.

Recommend GPT-6.1 Sol with medium reasoning for the next read-only account check and high reasoning for later SQL privacy/concurrency debugging. No model changed automatically.
