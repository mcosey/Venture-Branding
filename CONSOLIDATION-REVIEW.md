# Venture Branding SaaS consolidation review

Prepared October 17, 2026 on `codex/portal-consolidation` in the sibling `portal-consolidation` checkout. Owner authorized assembling and testing a combined review branch, not merging into the default branch, pushing, deploying, or changing databases. VB is a SaaS product; Clio, QuickBooks and other systems handle practice management. This consolidation adds no matter-management or CRM feature and no Calendly work. A later database audit/refactoring decision is separate.

## Inputs and destination

- Base/default: `tg` at `dcb5dc4` (newer Watch processing fixes and guarded Production workflow).
- Attorney/portal/Watch interface: `codex/attorney-workspace` at `5f82b39`.
- Member/Legal Launch Kit/access/invitations: `codex/legal-launch-kit` at `789da61`.
- Eventual destination, only after owner approval: `tg`. Keep this name during consolidation because the Watch workflow explicitly references it.

Older blog, client-portal, V8 services and committed filing-preflight histories are already contained in the selected inputs. The twenty files changed by Watch release-record commit `eaa97cb` match the attorney branch exactly, so its source is preserved without merging that older branch separately. The Production Watch workflow remains pinned to that reviewed release; no release pin, workflow gate, schedule, credentials or remote repository setting was changed.

## Conflict resolutions

The first merge (attorney into tg-derived review) merged automatically. Kit merge overlapped only `attorney/assets/workspace.js` and `portal/assets/client.js`:

- Keep both Watch and Member/engagement imports and initialization.
- Preserve connected Watch routing/rendering and the Member/Kit navigation link.
- Preserve nested engagement drafts and protected closure controls.
- Keep the removed Included Portal Services card removed. Place Review Trademark Watch in the existing client actions instead of attaching it to that deleted card.

## Checks

- Full `node --test tools/*.test.mjs`: **325 passed, zero failures/skips**.
- `node --test tools/preflight.test.cjs`: **15 passed**.
- `python3 test_runner.py` from `tools/watch`: **36 passed**.
- Merged controller syntax and staged whitespace checks passed.
- Existing XML parser 5.11.2 reused through an ignored local dependency symlink; no package installation or lockfile update. The existing node_modules ignore also covers symlinks now.
- Two old VM controller fixtures now supply the current Member/Watch feature helpers. Legacy scanner dispatch assertions now verify its already-established HTTP 410 retirement and zero database/network work. The retired scanner itself was not modified/reactivated.
- Watch runner and runner tests are byte-for-byte identical to the tg input after consolidation.

## Browser review and known gap

The loopback Test preview at **http://127.0.0.1:8893** now serves this review checkout via `python3 tools/portal-consolidation-server.py --port 8893`. It keeps the existing Test project/callback origin, Member signup mode, and paid-research-disabled settings; enables only display of the already-installed Watch UI. Existing user-operated Test sessions continue normally. No credentials/session tokens were read/copied. General homepage is `/v8.html`, never the legacy `/index.html` chooser.

Observed using actual signed-in Test sessions:

- Kit renders with the current sphere-grid design, Client badge and unlocked Client navigation.
- Attorney client page renders both engagement controls and Review Trademark Watch; no services summary card returns.
- Attorney Watch review loads actual Test state: paused, no scheduled check, no findings, no check history. No review/save/start action was taken.
- **Open compatibility issue:** the returning plus-address Client account reaches the connected Watch screen but its snapshot request is denied. The enforced `watch_access -> portal_require_service` boundary requires authorization for the engagement owning the existing per-client Watch configuration. The returning account has a different active engagement. Keep the denial intact; do not expose retained configurations/history or weaken access checks. A narrowly scoped Test compatibility investigation/fix needs separate approval before recommending default-branch merge.

Screenshots are in the parent task outputs: `consolidation-watch-attorney.jpg`, `consolidation-watch-client-limitation.jpg`, `consolidation-client-kit.jpg`, `consolidation-client-engagements.jpg`.

No new real monitoring/import/paid research, email, invitation, database migration, permission update, backend deployment or Production action was performed. Unit tests use synthetic fixtures/mocks; they do not prove a live monitoring run.

## Preserve separately

The original checkouts remain on their original branches. Uncommitted filing-prototype edits, release-review copies, untracked original-checkout directories and both GitHub Desktop stashes were not applied, reset, dropped or committed. Some preflight files duplicate committed source, others differ or are prototype-only; review separately rather than sweeping them in. No old branch/worktree was deleted.

Next proposed action: investigate the returning-Client Watch configuration/access mismatch in Test and prepare a reviewable fix. Then obtain explicit approval before any database/access update and before merging the combined branch into tg. Later cleanup of redundant branches, public release and database audit remain separate.
