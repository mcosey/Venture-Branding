# One-link BCM — public discovery verified in BCM Test

Public discovery, snapshot validation, old-format compatibility and client access boundaries were applied and checked in BCM Test on October 10, 2026. Production remains on the existing manual version. See the chat workspace outputs/bcm-one-link-test-results.md and bcm-scheduling-worker-results.md for actual evidence and limitations.

New setups use one public HTTPS address. Existing setups keep explicit-page mode. Each scan discovers same-origin links and sitemaps again, with per-page sources and coverage reports. Finding a page alone does not establish a product launch or legal conclusion.

The public MVP excludes credential collection, login-protected pages, JavaScript-only content and image-only logo detection. The earlier fictional login prototype is not a working connection service and is not part of this rollout.

`setup.sql` is a proposal outside the migration directory; its public functionality was verified in Test. Use the separate Production package with its Production identity and drift guards, rather than applying the unguarded Test source directly.

Limits: 30 captured pages, 200 queued URLs, 60,000 saved text characters, five sitemaps, four concurrent HTML requests, 90 seconds and 250KB per resource. Client exclusions are enforced; robots is used for sitemap discovery, not a complete robots exclusion parser. Cross-origin/query/action/account paths, redirects and inaccessible or unlinked pages may be missed. Coverage is limited and explicitly reported.

Automatic weekly/monthly monitoring was separately verified in BCM Test. The Test job was removed and readiness switched off after cleanup. Production scheduling and the final client portal workflow remain unpublished.

## Deferred account-connection concept — outside the approved public MVP

This is a proposed contract, not a functioning connection service:

1. An authenticated client authorizes one HTTPS origin and supplies a dedicated monitoring account in a future secure connection form. Membership and step-up requirements are checked server-side on each create/replace/remove request, using the same client lock/version checks as BCM. Never use the client's main administrator account.
2. Keep username/password and browser session state in an encrypted server-only secret store. Existing Supabase Vault is a candidate; availability and hosted worker access must be verified before selecting it. Browser responses contain only client-scoped status metadata. Secrets never belong in vb_bcm_settings, scan evidence, audit details, localStorage, URLs or browser-readable tables. This phase adds no secret storage or new permission grants.
3. Expose `connect`, `reconnect`, `disconnect` and `status` operations. Accept only client_id, expected_version, origin and transient credentials; reject extra fields. A server checks destinations, limits credential size, redacts errors/logs, and associates a secret reference with exactly one client. Replacing/disconnecting invalidates session state and cancels pending captures.
4. A hosted browser collector logs in only to the authorized origin, uses read-only screens, checks scope on every navigation/request and skips settings, payments, publishing and destructive controls. Private user-generated content is excluded from branding evidence. A limited account gives limited coverage; MFA/CAPTCHA or expired sessions require client intervention rather than bypassing them. Account boundaries and role coverage must be tested before real credentials are accepted.
5. Status metadata distinguishes not connected, checking, connected, needs reconnection, failed and disconnected. Expired access stops authenticated scans. No successful-login message is inferred from the prototype.
6. Hosted browser execution, secret-store access and any operating cost need a separate review. No ancillary service, paid account or local browser installation has been selected or approved. Existing interactive Codex browser access is not a production monitoring service.


## Next bounded phase

Review the prepared Production rollout package. Applying it, publishing client portal updates and activating the private scheduler require approval. Preserve parallel History of Use and Digest work. No new ancillary service or local installation is required for the public MVP.
