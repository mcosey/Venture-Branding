# Trademark Watch Production installation — disabled

October 17, 2026. User explicitly approved the reviewed additive storage and worker installation in Production while monitoring remained off. The subsequent source commit approval is local only; no push, merge or activation is included.

## Installed state

Production project `omvkwiosonatswocbdgx`, database cluster `7690937621030482216`. Test remains `imvkhicfmidzbzsbhkzs`; Cotivate Development and Cloudflare were untouched.

The exact installer in `supabase/proposals/trademark-watch/applied-production-disabled.sql` was executed once. SHA-256 `d6cbb167ef630f4251301d943827961b47253a990d2aeb1ae5e2a3acd04e14c8`. It guards Production identity, refuses existing Watch object collisions, checks existing helper-definition hashes and requires disabled/unenrolled state before commit. Do not rerun it: installed Watch objects now trigger its collision guard. It is an operational record, not an incremental migration to reapply.

Eight private Watch tables and eight functions are installed. The application name constraint allows 1–4,096 PostgreSQL characters. Watch global enabled is false. Client settings, source files/batches/applications, runs, findings and review history all have zero rows. There is no Watch database job. Direct raw-table privilege checks for anonymous, authenticated and service roles returned zero violations; the five public endpoints' intended role grants also returned zero violations. Existing permission helpers were not replaced. Staff MFA and client membership protections were verified during readiness inspection.

The new Production `watch-ingest` worker is deployed. Read-back source exactly matches the successful Test worker bundle, SHA-256 `1a2b04d9035c4137c4a0792aada2d5f0322fa22ae9bdf0866841b430781c6e16`. Default gateway JWT verification remains on. A direct unauthenticated GET returned `UNAUTHORIZED_NO_AUTH_HEADER` / missing authorization header. No credentialed POST or public-source import was attempted. `WATCH_RELEASE_ENABLED` and `WATCH_INGEST_KEY` remain absent; missing release setting is treated as disabled before database access. The independent database switch is false as well. No secret value was revealed or changed.

All 27 original Production data fingerprints matched before/after, including existing client, BCM, authentication-user and scheduler tables. No client enrolled, no account access changed, no website flag was enabled, no automatic schedule was created, and no email/SMS was sent.

## Source and Test evidence

This source reconciliation is based on committed Watch MVP `6533b97acc94ebc516d7f64204d608ad7a9c9df3`, incorporating reader `a0ff80fbb08cb6ec21e27342bc16cb82520640da`, the exact deployed worker, database name-bound update and the portable compatibility tests/public fixtures. Shared `portal/assets/client.js`, `attorney/assets/workspace.js` and `auth/config.js` are unchanged by this commit. Pending BCM and other checkouts were not included or switched.

The assembled package passed 36 Python checks, 31 JavaScript checks, 30 reader/worker boundary comparisons and validation of 2,281 saved September 30 public records. The worker bundle was regenerated and hash-compared with the deployed version, the rollback SQL packages were synchronized, and the narrow reconciliation patch was checked against its documented base.

Actual manual GitHub Test runs [39004844829](https://github.com/mcosey/Venture-Branding/actions/runs/39004844829) and [39005141261](https://github.com/mcosey/Venture-Branding/actions/runs/39005141261) succeeded. Both completed fictional-client checks for October 9–15 without missing dates; they generated zero new matches and retained the two preexisting findings unchanged. The 34 completed source files contain 50,795 distinct applications. The repeat preserved file/application/finding counts and entire finding fingerprints. Prior signed-in tests established matching, attorney approval/withdrawal, approved-only client display and other-client denial. No new matching/review claim is inferred from the disabled Production installation.

## Remaining approval boundaries

The client page intentionally remains “Not connected.” Current GitHub processing is manual and Test-only. The local source reconciliation commit is not permission to publish a branch, merge the whole attorney branch, deploy a website, change credentials or activate Watch.

Next: review an explicit publication route for this Watch-only source update. The full portal/database MVP and the minimal default-branch Test runner have different source histories; do not merge an entire branch as a Watch-only update or copy the entire review checkout onto shared BCM/site files. Preserve current working branches and pending changes.

After publication, present the concrete Production activation package: private Production ingestion key and approved GitHub environment using the existing working ODP access, dedicated authentication/gateway settings, manual source import and coverage/matching/deduplication verification, daily processing schedule, and the existing portal's Watch feature flag. Gateway protection changes require explicit approval. Keep the current Test workflow Test-only. Existing TSDR `USPTO_API_KEY` is for the lookup connection; its presence alone does not prove ODP access or current credential validity.

No new client features, ancillary service or installation is needed. Potential matches remain attorney-review leads, never clearance or infringement conclusions. No filing, demand letter, automated email or SMS is included. Public hosting and Cloudflare remain outside scope.
