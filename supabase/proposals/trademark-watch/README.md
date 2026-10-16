# Trademark Watch — connected Test MVP

As of October 15, 2026, the Test source/import/matching/review flow works. Production and automatic GitHub schedules are not activated. No client is automatically enrolled.

## Verified behavior

Seven official daily source files dated October 7–13 were retrieved through the authenticated USPTO ODP API and imported into Test. The 13,360 file-level word candidates deduplicated to 10,595 distinct applications. Both a 2.6MB and a 74.9MB archive were downloaded and fully parsed. Actual signed-in attorney and client screens verified approval, private-note exclusion, approved-only list/detail/search, settings save/pause, withdrawal and old-link removal, and denial of another client's workspace. Fictional monitoring is paused and no client publications remain.

The Test database additionally verified staff MFA, role and membership checks, version conflicts, review history, missing-source handling, source-change withdrawal and idempotent ingestion. Eighteen Node and seventeen Python focused checks pass. Fourteen original table fingerprints match after excluding new fictional-client-owned rows. BCM, blog and other parallel source work are separate.

## Runtime design

- `tools/watch/runner.py`: Python standard library only. Lowercase `trtdxfap` catalog lookup with `includeFiles=true`; ignore reference documents; validate the complete manifest; replay 35 days and skip unchanged completed revisions. Download only official API file URLs. JSON/worker redirects are rejected. Public archive redirects are limited to HTTPS USPTO/AWS/CloudFront destinations, with the ODP header removed before redirecting. Archives are streamed, bounded, CRC-checked and parsed before any upload.
- `watch-ingest`: dedicated secret-authenticated server function, fixed Test/Production project allowlist and explicit release switch. It invokes only the two defined ingest/check RPCs. The Supabase administrator key stays inside Supabase; GitHub does not receive it. The ingestion key is trusted to submit public source material, not to retrieve client records or private findings.
- `setup.sql`: additive private storage and guarded RPCs. Global monitoring starts disabled. Raw table privileges are revoked. Source batches complete atomically; client settings and attorney decisions use version checks; only approved evidence snapshots and client summaries reach clients.
- `auth/watch.mjs` and `portal/assets/watch-connected.*`: connected settings, history, results, details and attorney review. An absent/false `VB_WATCH_ENABLED` flag prevents Watch requests. Shared client/workspace edits are Watch-specific. The existing Production configuration is not changed by this package.

Matching compares ASCII word names, including wording from drawing codes 4 and 5. Normalized exact matches are supported; fuzzy matching allows up to two edits for normalized names of 5–80 characters. Longer names get exact comparison only. Classes A/B/200 and numbered classes are preserved, as are full goods/services statements up to 65,536 characters. All goods/services are compared; class relatedness is not inferred. Missing filing dates or mark wording are counted and excluded without inventing values. Nonempty malformed dates, conflicting identifiers and unsupported oversized fields stop the file.

Weekly due checks require seven consecutive completed source dates, with the latest no more than two days old. Each invocation handles one due client and the runner drains at most ten invocations. Incomplete checks retry the next day and remain visible as incomplete. The source-date label does not guarantee all applications filed by that date have appeared. The 30-day filing lookback can miss older late arrivals. No phonetic, image/logo, international-filing, infringement or clearance determination is provided. No email/SMS delivery is included.

## Release gates

The proposed first GitHub workflow is manual and Test-only. It uses the repository variable `WATCH_TEST_RUNNER_ENABLED` and the `watch-test` environment secrets `ODP_API_KEY` and `WATCH_INGEST_KEY`. Do not reuse a Production ingestion key in Test. No credentials belong in source files. Real GitHub execution, its 35-day replay/runtime and a repeat run are still unverified. A green job alone is insufficient: confirm completed source coverage and the expected Test client check in the database.

GitHub requires the manual workflow to exist on the repository's default branch before dispatch. Locally cached default is `tg`; confirm the live setting and any publishing hooks before remote changes. Do not merge the whole existing working branch into the default branch as a Watch-only release: it contains unrelated earlier committed work.

Production schema application, worker deployment, private credentials, source backfill, website feature activation, client enrollment and daily scheduling each remain subject to the user's explicit release approval. Keep the website flag and server switches off until source and operational checks pass. Turning on the global website flag makes Watch available to portal-enabled clients, who can choose up to ten word marks and explicitly start monitoring; it is not a server-enforced one-client pilot. No client is started by schema installation.

Pausing a client stops its checks. Withdrawing a finding removes future client reads; previously viewed or downloaded information cannot be remotely erased. Turning off the website flag hides the connected screens. Stopping the runner stops retrieval/check invocations. None of these actions deletes existing clients, findings, history or BCM records.

## Supporting files

The local preview is a fictional UI prototype; `test_portal_server.py` is a separate loopback-only connected Test view. The manual source checker and Test importer use private interactive entry and save no keys. Local public archives, generated deployment bundles, screenshots, reports and credential files are not release source.

Rollback verification SQL, matcher equivalence/performance scripts and `build_sql.py` are internal development support. They are not Production migrations to execute wholesale. Never run the rollback test package in Production. `setup.sql` must fail on existing Watch object collisions rather than overwriting them.

See `handoffs/38-trademark-watch-prepared-mvp.md` for detailed Test evidence and the review packet's current release checklist.
