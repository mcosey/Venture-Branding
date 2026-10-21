# Diagnostic package — local continuation and prior Test deployment

The owner approved and deployed diagnostics for `uspto-lookup`, `engagement-invite`, and `watch-ingest` in BCM Test. Verification finished October 20, 2026. See `deployment-test.json` for exact source hashes, settings and limits. The other four generated artifacts remain local review only. No database objects, permissions, accounts, readiness switches, email delivery, monitoring activation or logging vendor were added. Hosted Production is unchanged. Browser source changes are available in the local checkout on a fresh load.

**Current local preparation: `2026-10-21-diagnostics-3`.** The prior Maintenance, filing, inbox/digest and direct Member hooks are retained. Watch, evidence access, engagement administration, invitation acceptance and research browser failures now use the same error-only contract. The maintained Production research handler also has local failure-stage instrumentation, with its project, mode, access and release guards preserved. No worker was deployed. Previously deployed Test workers remain release 1 with the exact hashes in `deployment-test.json`; release 2/3 bundles are local only. BCM Test stays paused and Cotivate is left alone.

The maintained source is `shared/diagnostics.mjs` plus the individual handlers. These seven generated files are review/deployment artifacts, not seven independently maintained implementations. `node tools/prepare-diagnostics.mjs` rebuilds them and records source/artifact SHA-256 hashes. `node tools/check-diagnostics-artifacts.mjs` verifies that exact local package without rewriting it. Earlier deployed USPTO parity and Production BCM release artifacts remain frozen as historical evidence.

## Prepared coverage

| Path | Added error-only context | Destination |
| --- | --- | --- |
| Sign-in initialization/unexpected refresh failure | Fixed Auth stage and safe reference in the existing error message | Browser developer console only |
| Workspace record reads | Failed clients/marks/preferences/references dependency; no returned rows | Browser console only |
| Maintenance drafts/publications | Fixed load/save/publish/withdraw operation; preserve versions and attorney verification | Browser console only |
| Filing preparation | Fixed list/load/history/revision/save/review operation; preserve saved versions and decisions | Browser console only |
| Inbox and digest preferences | Fixed preferences/load/sample/open operation; exclude message bodies and recipients | Browser console only |
| Member entry/company profile | Unexpected routing RPC, company load/save and shared onboarding failure; no profile/planning fields | Browser console only |
| Contact saving | Save conflict/permission/unavailable category and reference | Browser console only |
| Member onboarding and Kit progress persistence | Failed operation category; pending/conflict behavior retained; no notes or profile fields | Browser console only |
| Watch page | Snapshot/configuration/review failure; preserve scoped selection, versions and ended-session guards | Browser console only |
| Evidence access | List/upload/remove/image failure; exclude files, metadata, notes and private paths | Browser console only |
| Engagement administration and acceptance | Read/save/close/revoke/send/read-invitation/accept failure; retain MFA, recipient and invitation boundaries | Browser console only |
| Research workspace and reviewed map | Load/run/review/monitoring-save/publication-load failure; no observations or private review contents | Browser console only |
| USPTO | Configuration, client/mark read, fetch/fingerprint/save failure stage | Existing worker platform log after a separately approved deployment |
| Engagement and legacy invitations | Reservation/delivery/finalization stage, including returned or thrown failure-recording errors | Existing worker platform log after deployment |
| Evidence upload | Reservation/storage/verification/finalization failure stage | Existing worker platform log after deployment |
| Watch ingestion | One failed database batch/operation category; existing runner diagnostics unchanged | Existing worker platform log after deployment |
| Research Test and maintained Production handlers | Reservation/settings/current/provider/finalization/cleanup stage; separate existing project and mode gates retained | Existing worker platform log after separately approved deployment; research remains disabled where already disabled |

Normal successful calls, invalid credentials, expected role denial, bad-input requests and disabled release gates do not produce custom activity events. This does not modify the platform's own request/Auth logging. A browser-only event is not uploaded or made visible to the attorney; there is no Member directory, activity feed, telemetry endpoint or browser-event collection service.

## Event and privacy contract

Only schema version, fixed release/feature/stage/category, failure outcome, random reference, bounded elapsed milliseconds and optional handler HTTP error status are constructed. HTTP status is the worker response status, not an inferred provider status. SQLSTATE is reduced to a fixed category rather than recorded verbatim. Maximum two events per invocation/load/save batch, allowing a primary failure and failed recovery. This bounds per-operation output, not global traffic; platform-level rate/volume controls remain a release review item.

No error serialization, stack, request headers, credential, callback URL, email, user/client/company/engagement ID, run ticket, serial number, fingerprint, filename, object path, image, message, prompt, website URL, legal note or profile/planning content enters this custom event contract. Caller-supplied references are not accepted by workers. A support reference never authorizes access to records. Browsers append only a correctly shaped server reference to fixed safe messages, without logging that server failure a second time. An arbitrary backend message is not displayed by the new shared request wrapper.

If logging, reference generation or timing fails, business outcomes and authorization remain intact. The error stays safe even without a reference. Failed writes remain failed and Kit pending work remains available for explicit retry. Existing business audit records retain their meaning and are not replaced by diagnostics.

The USPTO handler now allows only exact known parser/provider messages through to the UI. An arbitrary exception containing the word "USPTO" can no longer pass the old broad message filter and potentially reveal private details.

## Local validation / automated checks

The prepared `.github/workflows/portal-checks.yml` runs on push, pull request and manual dispatch, with read-only repository permission and no application secrets, deploy step, private records or live database check. It installs the existing locked parser dependency with package lifecycle scripts disabled. It checks the diagnostic artifact manifest, runs the portal regression suite and existing Watch runner tests. Application test execution has an outbound-network tripwire; mocked provider/email/storage/database interfaces remain local. The tripwire is regression protection, not a sandbox for hostile code. Node/npm/action installation itself still needs the normal public package/network sources in CI.

The feature-contract unit tests validate fail-closed comparison behavior using synthetic catalogs; CI does not certify current hosted schema/source/settings. Real database identity/permissions and HTTP authorization still require the separately reviewed hosted checks. The local SQL harness is not added to this CI job; reproducible database rebuilds remain a later phase. The workflow passed on GitHub for `42b28fa` (run 39425483339); its Node action-runtime and runner-image notices remain maintenance items. This continuation has local regression evidence only until the owner pushes it. No branch-protection setting has changed.

October 20 continuation: all 408 portal tests and 36 Watch tests pass offline. The artifact checker confirms every recorded source/artifact hash and syntax-checks all seven generated bundles. `git diff --check` passes. These are local results; this continuation is uncommitted, unpushed and undeployed. Its new operations query has not been executed. The local preview uses no-store responses; browser/hosted acceptance and coordinated public-release cache/version handling remain separate checks.

Local commands using the dependencies already available (no additional software installed for this continuation):

```
node tools/check-diagnostics-artifacts.mjs
NODE_OPTIONS='--import ./tools/no-network.mjs' node --test tools/*.test.mjs tools/*.test.cjs
python3 tools/run-watch-tests.py
```

## Approved limited Test deployment and verification

Approved target was BCM Test (`imvkhicfmidzbzsbhkzs`) only: `uspto-lookup`, `engagement-invite`, and `watch-ingest`. Confirm the currently installed source/configuration against the prepared package before replacing each function. Keep JWT/MFA, origin/project guards, recipient review, grants, readiness and paid-feature settings unchanged. Preserve the current deployed source before replacement so code rollback is available.

Only after approval, deploy the exact reviewed artifacts and exercise synthetic failures with no new emails, account creation, provider lookup, trademark save or monitoring activation. An invalid/stale mark preflight can test USPTO diagnostics before fetching from USPTO; an unconfigured preview and a disposable local mocked failure can test browser handling. Exact hosted cases must be staged/reviewed before execution. Preserve the earlier genuine successful USPTO preview evidence separately.

`engagement-invite-test.ts`, `uspto-lookup-test.ts`, and both research Test bundles have their existing exact Test project guards. The `*-review.ts` files for evidence, legacy invitation and Watch retain their original configured-project/origin behavior; the word "review" is not a Test guard. Do not blindly deploy them to another environment or activate disabled services. Production legacy invitation/evidence/research deployment is deferred to the Production-specific rollout.

## Still open

- The October 21 read-only review found existing GitHub failed-workflow email/GitHub notifications and 90-day Actions retention. Supabase Free API/database retention is documented as one day; exact other-service windows and stalled-run alerting remain unverified. No retention, paid plan, export or alert setting was changed. Browser-only diagnostics have no centralized retention or alerting. Details and source links are in the outside-repository logging review.
- Maintenance, filing-review and messages/digest retain their protected histories. Local returned/throwing transport failures are now covered; fresh hosted/browser acceptance and actual scheduler outcomes remain. `operational-log-inventory-test.sql` is read-only preparation, never executed while Test is paused. It examines only existing job state and aggregate statuses, not commands, message bodies or raw failure text. No scheduler/job/function was added or changed.
- Direct Member entry/company-profile calls now have browser-only safe failure context. Signup uses the same onboarding function as email-return completion, and Auth preserves an existing diagnostic reference instead of logging the same failure again. Supabase credential/invalid-code handling remains unchanged; this is not a certification of every Auth/provider failure or every portal call site.
- Review CI after pushing. Local synthetic tests do not certify live failure/alert routing or all features. Any future hosted acceptance/deployment is a separate decision; this work does not require resuming Test or interrupting Cotivate.
- The bounded Test trademark import-save walkthrough passed October 20; see the separate feature-parity receipt for cases/limits. Backups/restore, clean reconstruction/refactoring, actual release hosting/email settings, Production rollout, mobile/accessibility and final policies remain in the larger review.

## Hosted evidence / remaining limits

All three pre-update source baselines matched the reviewed maintained assemblies and were preserved outside the repository. Each editor was compared byte-for-byte with its prepared artifact immediately before deployment. Dashboard confirmations and post-deployment JWT settings were recorded: lookup remains enabled, engagement invitation and Watch retain their existing disabled gateway toggles and in-handler protections. No gateway/authentication change was made.

The existing staff/MFA session invoked a lookup for an explicitly nonexistent client: 404 `client_read`, before the key/provider stage. An invitation payload with a deliberately invalid timestamp produced 409 `reserve` before PostgREST could execute the SQL function body or create an invitation. Both returned references exactly matched one safe custom server log event. A Watch POST from the Test dashboard with no ingestion secret returned 401 `Unauthorized`; no database or monitoring action ran. The browser SDK attempt could not read the server-only endpoint response, so no CORS relaxation was made. Watch's internal database-failure log is covered locally, not live-triggered.

The temporary local check UI was removed and the attorney route restored. Its source is retained only in the outside-repository evidence directory. The current `manifest.json` records the latest local preparation hashes; `deployment-test.json` preserves the exact prior release 1 Test deployment hashes and settings. Rebuilding the preparation artifacts is not a deployment command and must not erase this receipt.


## October 20 local continuation boundaries

The only maintained business-path changes are browser-side failure handling. There are no new database tables, functions, jobs, grants, Member directory, telemetry upload endpoint, external log vendor or changes to service gates. Ordinary validation and initial role denial remain quiet. Invalid-input errors do not gain new custom events. Failures are categorized from fixed codes; returned and thrown upstream exception contents are not copied into events or error messages. Failure references do not provide access to records.

Member onboarding now has one shared implementation used by both the direct setup submit and matching email-return completion. Member profile saving still snapshots the submitted values and preserves the existing newer-edit/Saved behavior. Filing errors retain the known conflict/missing-contract codes used by the existing recovery UI; failed reopen/save does not advance the saved revision. Maintenance/inbox generation guards discard late failures before logging, without retries. A separate import-form fix clears only an earlier save-error note on reset; it has its own browser acceptance receipt.

The release tag and added browser feature/stage allowlist appear in all seven regenerated worker bundles because they inline the common helper. Those are generated artifacts, not seven new feature implementations. No maintained worker handler was changed by this continuation, no bundle was deployed, and the frozen parity/Production artifacts and prior Test deployment receipt are untouched.

## October 21 local continuation boundaries

The shared `diagnosticRequest` handles returned/thrown dependency errors, shaped server references and fixed messages. Individual features still perform their own access, version, confirmation and session checks. It adds no retry. Watch/evidence discard errors after session disposal, including delayed reads of a worker error response. Ordinary SQL validation stays quiet; invitation expiry/wrong-account/stale codes retain the same generic wording and no custom event. Successful calls produce no custom history. No Member activity is uploaded.

Only the maintained Production research handler gains worker-stage hooks in this continuation. Manual/scheduled entrypoints still select their original credentials and exact Production project/release switches. Provider/reservation/finalization logic is unchanged; returned or thrown cleanup failures now share the terminal failure reference. The Production dashboard bundler inlines the common helper on demand; it does not deploy or overwrite historical releases. Frozen deployment source is intentionally no longer byte-identical to today's instrumented source; tests compare preserved authorization/RPC behavior and separately exercise safe failure handling.

Validation uses synthetic databases, storage, delivery and provider interfaces with outbound application network blocked. No hosted SQL, provider lookup, email, permission/configuration change or deployment is part of this work. Existing software is sufficient. Earlier October 20 test counts above are historical; the current outside-repository continuation report records the latest full-suite result and preservation evidence.
