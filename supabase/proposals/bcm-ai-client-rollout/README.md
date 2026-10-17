# General-client BCM rollout

Applied October13,2026 in Production omvkwiosonatswocbdgx. Eight attempts/client/UTC calendar month and200 total attempts/month. Existing schedules and data preserved; no automatic enrollment.

setup.sql is the one-time migration. verify.sql is a standalone rollback-only budget/access matrix after migration. apply-verified.sql is the applied atomic migration plus budget and saved-candidate/publication regression: fixtures rolled back to savepoints before commit. Do not rerun after installation. The older package remains historical deployment material.

New allowance RPC exposes only accessible client counters/reset/status; anonymous denied. Global row lock protects reservation caps. No new login identities, provider calls or installations. Previous actual cron-triggered Production evidence reused. Read handoff37 for full validation and live state.
