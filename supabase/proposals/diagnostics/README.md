# Diagnostic package — approved limited Test deployment

The owner approved and deployed diagnostics for `uspto-lookup`, `engagement-invite`, and `watch-ingest` in BCM Test. Verification finished October 20, 2026. See `deployment-test.json` for exact source hashes, settings and limits. The other four generated artifacts remain local review only. No database objects, permissions, accounts, readiness switches, email delivery, monitoring activation or logging vendor were added. Production is unchanged. Browser source changes are available in the local checkout on a fresh load.

The maintained source is `shared/diagnostics.mjs` plus the individual handlers. These seven generated files are review/deployment artifacts, not seven independently maintained implementations. `node tools/prepare-diagnostics.mjs` rebuilds them and records source/artifact SHA-256 hashes. `node tools/check-diagnostics-artifacts.mjs` verifies that exact local package without rewriting it. Earlier deployed USPTO parity and Production BCM release artifacts remain frozen as historical evidence.

## Prepared coverage

| Path | Added error-only context | Destination |
| --- | --- | --- |
| Sign-in initialization/unexpected refresh failure | Fixed Auth stage and safe reference in the existing error message | Browser developer console only |
| Workspace record reads | Failed clients/marks/preferences/references dependency; no returned rows | Browser console only |
| Contact saving | Save conflict/permission/unavailable category and reference | Browser console only |
| Member onboarding and Kit progress persistence | Failed operation category; pending/conflict behavior retained; no notes or profile fields | Browser console only |
| USPTO | Configuration, client/mark read, fetch/fingerprint/save failure stage | Existing worker platform log after a separately approved deployment |
| Engagement and legacy invitations | Reservation/delivery/finalization stage, including returned or thrown failure-recording errors | Existing worker platform log after deployment |
| Evidence upload | Reservation/storage/verification/finalization failure stage | Existing worker platform log after deployment |
| Watch ingestion | One failed database batch/operation category; existing runner diagnostics unchanged | Existing worker platform log after deployment |
| Research | Reservation/settings/current/provider/finalization/cleanup stage | Existing worker platform log after deployment; research remains disabled where already disabled |

Normal successful calls, invalid credentials, expected role denial, bad-input requests and disabled release gates do not produce custom activity events. This does not modify the platform's own request/Auth logging. A browser-only event is not uploaded or made visible to the attorney; there is no Member directory, activity feed, telemetry endpoint or browser-event collection service.

## Event and privacy contract

Only schema version, fixed release/feature/stage/category, failure outcome, random reference, bounded elapsed milliseconds and optional handler HTTP error status are constructed. HTTP status is the worker response status, not an inferred provider status. SQLSTATE is reduced to a fixed category rather than recorded verbatim. Maximum two events per invocation/load/save batch, allowing a primary failure and failed recovery. This bounds per-operation output, not global traffic; platform-level rate/volume controls remain a release review item.

No error serialization, stack, request headers, credential, callback URL, email, user/client/company/engagement ID, run ticket, serial number, fingerprint, filename, object path, image, message, prompt, website URL, legal note or profile/planning content enters this custom event contract. Caller-supplied references are not accepted by workers. A support reference never authorizes access to records. Browsers append only a correctly shaped server reference to existing worker error messages.

If logging, reference generation or timing fails, business outcomes and authorization remain intact. The error stays safe even without a reference. Failed writes remain failed and Kit pending work remains available for explicit retry. Existing business audit records retain their meaning and are not replaced by diagnostics.

The USPTO handler now allows only exact known parser/provider messages through to the UI. An arbitrary exception containing the word "USPTO" can no longer pass the old broad message filter and potentially reveal private details.

## Local validation / automated checks

The prepared `.github/workflows/portal-checks.yml` runs on push, pull request and manual dispatch, with read-only repository permission and no application secrets, deploy step, private records or live database check. It installs the existing locked parser dependency with package lifecycle scripts disabled. It checks the diagnostic artifact manifest, runs the portal regression suite and existing Watch runner tests. Application test execution has an outbound-network tripwire; mocked provider/email/storage/database interfaces remain local. The tripwire is regression protection, not a sandbox for hostile code. Node/npm/action installation itself still needs the normal public package/network sources in CI.

The feature-contract unit tests validate fail-closed comparison behavior using synthetic catalogs; CI does not certify current hosted schema/source/settings. Real database identity/permissions and HTTP authorization still require the separately reviewed hosted checks. The local SQL harness is not added to this CI job; reproducible database rebuilds remain a later phase. The new workflow has not run on GitHub and no branch-protection setting has changed.

Local commands, after installing the existing locked dependency if absent:

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

- Verify actual platform log retention, authorized readers, alert routing, volume limits and one failed/stalled-run support procedure. No retention, paid plan, external export or alert recipient was configured here. Browser-only diagnostics have no centralized retention or alerting.
- Maintenance, filing-review and messages/digest keep their existing protected histories. Their remaining generic transport-failure gaps and actual scheduler outcomes still need focused reconciliation; no new job or duplicate success history was added.
- Other direct Member profile/entry RPCs retain their existing behavior; this batch covers onboarding and Kit progress, not an audit of every Member call site.
- Verify browser failure rendering, current deployed source equivalence and the prepared CI run after publication. Local synthetic tests do not certify a live failure/alert or all features.
- Trademark import-save acceptance, backups/restore, clean reconstruction/refactoring, actual release hosting/email settings, Production rollout, mobile/accessibility and final policies remain in the larger review.

## Hosted evidence / remaining limits

All three pre-update source baselines matched the reviewed maintained assemblies and were preserved outside the repository. Each editor was compared byte-for-byte with its prepared artifact immediately before deployment. Dashboard confirmations and post-deployment JWT settings were recorded: lookup remains enabled, engagement invitation and Watch retain their existing disabled gateway toggles and in-handler protections. No gateway/authentication change was made.

The existing staff/MFA session invoked a lookup for an explicitly nonexistent client: 404 `client_read`, before the key/provider stage. An invitation payload with a deliberately invalid timestamp produced 409 `reserve` before PostgREST could execute the SQL function body or create an invitation. Both returned references exactly matched one safe custom server log event. A Watch POST from the Test dashboard with no ingestion secret returned 401 `Unauthorized`; no database or monitoring action ran. The browser SDK attempt could not read the server-only endpoint response, so no CORS relaxation was made. Watch's internal database-failure log is covered locally, not live-triggered.

The temporary local check UI was removed and the attorney route restored. Its source is retained only in the outside-repository evidence directory. The original preparation `manifest.json` records the immutable pre-deployment review status and hashes; `deployment-test.json` records current Test deployment state. Rebuilding the preparation artifacts is not a deployment command and must not erase this receipt.
