# Database verification — October 4, 2026

Project: Venture Branding (`omvkwiosonatswocbdgx`), Cotivate Free organization. User explicitly authorized applying the prepared schema, adding the approved example and running client-isolation tests.

## Executed

- Preflight confirmed VB client and staff tables did not exist.
- Applied the repository migration through Supabase SQL Editor; transaction completed successfully.
- Applied seed in a transaction; confirmed Cotivate LLC / Mario Cosey / Cotivate.
- Ran the repository pgTAP suite through SQL Editor: **39 tests passed**. `finish()` returned only `1..39`, with no failure summary.
- Test transaction rolled back. Final checks: 1 client, 1 mark, 5 preference rows, 0 Auth users, 0 client memberships, 0 staff memberships; RLS enabled on all 7 VB tables.

An initial test run exposed an invalid nested data-modifying CTE in three test assertions. Moved those CTEs to the statement's top level, saved the correction in the repository and reran the complete suite successfully. No policy weakening was needed. The SQL editor initially appended replacement text rather than replacing the full query; corrected using full-editor select/paste. Follow-up inventory confirmed only the intended records exist.

## Boundaries

No credentials were read or saved, no software installed, no invitations sent, no real accounts provisioned, and no website deployment or frontend connection occurred. Database tests impersonated claims within a rolled-back transaction; they do not prove real invitation/MFA/login/recovery workflows or HTTP token validation. Hosted Auth settings are not yet verified/configured to match the local configuration template. A clean environment rebuild still needs rehearsal.

This migration was applied manually in SQL Editor, **not through the Supabase CLI migration runner**. Before any future `db push`, reconcile migration history using the approved CLI migration-repair workflow after verifying the schema. Do not run the initial migration against this project again: its tables already exist. New fixes must use a new migration. Source remains authoritative for rebuilding another empty project.

## File fingerprints applied/tested

- `migrations/20261003000100_client_foundation.sql`: `6f6fbfc84d5da30ddff3fdaec26d1b6f123a9611f65da616586331a2a52fbf12`
- `seed.sql`: `e7912a21494347f762231ec423afd1d237886ea14047a92986ce320e5640770d`
- `tests/database/client_access.test.sql`: `614aaeb274400f2ea45ba6393a3b324040ba6f32207160f2edc2806192077595`
