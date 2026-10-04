# Venture Branding launch-readiness plan

Updated October 3, 2026. Planning only: this document does not authorize provisioning, installation, spending, publishing, or live client data processing.

## Objective

Make Venture Branding operational quickly after the owner leaves big law, targeting activation within five days. This is a readiness target to prove through rehearsal, not a guaranteed completion time after a year without maintenance. The five days are for activating and checking a finished system—not building the backend from today's prototype.

## What operational means

The initial launch must support:
- The V8 website and approved blog, with working contact/scheduling paths.
- Separately provisioned attorney access with strong multifactor protection.
- Invitation-only client access, secure account recovery, and server-enforced client isolation.
- Attorney-managed client records and marks, displayed consistently in the appropriate client's portal.
- Adding unfiled marks, linking existing USPTO applications/registrations, reviewing retrieved details, and refreshing without losing existing information after a failed lookup.
- Client requests reaching the attorney workspace, with a clear status and accountable handling.
- The full agreed portal service set available to portal-add-on clients, with client-controlled toggles. No service may be presented as running unless it actually works and has been tested.
- Recoverable records, operational error reporting, and a documented recovery procedure.

Exact launch scope of Trademark Watch, Brand Change Monitor, Specimen Capture, Maintenance Reminder, and Trademark Activity Digest must be agreed before implementation. Each needs its own data source, schedule, toggle behavior, failure handling and acceptance test. No enforcement or litigation services. A manual fallback or deferred service must be disclosed and approved; an attractive dashboard does not count as operational functionality.

## Current position

The site is static HTML/CSS/JavaScript. The attorney workspace is an in-memory prototype: refresh resets edits. There is no database, authentication, live USPTO connection, real service execution, or attorney-to-client synchronization. The clean attorney sample is Cotivate LLC, contact Mario Cosey, with one mark named Cotivate. Old client-facing sample content remains separate.

Do not build another temporary connection between the prototypes. Plan the real shared data and access foundation first. Supabase is the owner's likely choice, not yet provisioned or approved for implementation.

## Build before the activation window

1. Agree the data model: client entity, contact, staff/client membership, marks with stable IDs, source identifiers, update history, service preferences, requests, and verified dates. Keep mark ownership separate from account identity.
2. Put all database structure, policies, functions and necessary configuration into version-controlled setup files. Avoid undocumented dashboard-only changes.
3. Implement invitation-only onboarding, separately controlled staff provisioning, strong staff MFA, session/recovery controls, archive/access behavior, and audit records. Enforce access on every server request and file. A client must never be able to select a different client ID and obtain its data.
4. Connect both interfaces to the same authorized records. The attorney controls marks; clients control permitted service preferences. Define how reminders and internal deadline obligations interact with client toggles.
5. Build server-side USPTO retrieval with secrets outside browser code. Review mark and owner before linking; record source and successful retrieval time. Failures must not erase good data or manufacture status. Support linking a serial number to an existing unfiled mark.
6. Build and test the approved request and service workflows. Record real provider limitations, usage costs, and setup requirements before promising capabilities.
7. Prepare hosting, email delivery, domain configuration, backups, restore steps and operational checks. Obtain separate approval before changing accounts or spending money.
8. Rebuild on a clean environment using the saved materials, test it, and measure elapsed time. Fix manual steps and gaps before declaring the site ready.

## Respect the existing outside systems

- Microsoft 365 / Outlook: email, calendar, Office documents.
- Clio: matters, legal billing, payments and internal legal operations.
- QuickBooks: accounting, reconciliation and tax-side records.
- Calendly: scheduling.
- iManage versus Clio for documents: unresolved; obtain the owner's decision before document integrations.

Do not duplicate these systems or add navigation solely for integrations. Decide which connections are required for launch and which can initially be optional references. Record availability, permissions, recurring cost and any approval lead times. Outside accounts and approvals must be prepared ahead of the five-day window when they could delay launch.

## What must survive a lost Supabase project

In GitHub:
- Application/backend source and dependency lockfiles.
- Ordered database migrations, access policies, functions and storage-bucket setup.
- Safe synthetic seed data, configuration templates and required environment-variable names (no secret values).
- Tests for permissions, workflows and recovery.
- Deployment, provider setup and activation instructions, including dashboard settings that cannot be automated.

Outside GitHub, in an approved secure location:
- Secret keys, recovery codes and account ownership information.
- Encrypted backups of real database/auth data when applicable, plus separate uploaded-file backups.
- Backup timestamps, retention policy, and documented restore verification.

Source code and migrations recreate the system, not missing real client records. Database backups alone should not be assumed to include stored file contents or all provider settings. A new project can have new URLs/keys; configuration must support replacement without rewriting the app. Account recovery, email configuration and external connections may require separate reauthorization. No real client records or credentials go into seed files or Git history.

## Five-day activation outline

Prerequisite: core functionality and a clean rebuild have already passed; necessary account ownership, domain control and external approvals are available.

| Day | Work | Completion evidence |
| --- | --- | --- |
| 1 | Resume or recreate the hosting/database environment; apply migrations/configuration; restore approved data if needed. | Application loads and expected records/configuration are present. |
| 2 | Verify staff MFA, invitations, account recovery, email delivery and client isolation. | Two test clients cannot access each other's records; staff and client privileges behave correctly. |
| 3 | Verify USPTO linking/refresh, requests, service toggles, scheduled jobs and required outside connections. | End-to-end tests pass; failures preserve data and generate actionable notices. |
| 4 | Rehearse complete client onboarding, adding/linking a mark, client viewing and backup recovery; review content and mobile usability. | Signed-off acceptance checklist, verified backup/restore, no unresolved launch blockers. |
| 5 | Final owner approval, production activation and monitoring. | Public site and authorized portals work; support/recovery procedures are available. |

Do not launch with broken client isolation, unverified backups, nonfunctional invitations, or misleading service status just to meet the target. If provider recovery or approval is delayed, report the blocker and revised timing. The target concerns the website/portal, not a guarantee that every aspect of starting the legal practice is ready.

## Keeping it ready while dormant

Recommended, subject to owner approval: review readiness quarterly, and repeat a clean deployment rehearsal after material changes or before relying on the launch window. Check dependencies, provider rules, expiring credentials, domain control and restoration steps. Record the last successful rehearsal date and duration. No recurring automation has been created.

Use sample data during development. A dormant project should be replaceable, rather than the sole copy of valuable data. Once serving clients, use an appropriately supported production configuration that does not pause for inactivity, with independent backups and monitoring. Agree its cost before activation.

## Supabase facts checked during planning

Current documentation says Free projects may pause after seven days of low activity, paused projects do not count toward the two-free-project limit, and dashboard restoration is available for up to one year after pausing. Account eligibility has not been inspected. Do not rely on these rules remaining unchanged or on automatic recovery after long dormancy.

- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/local-development/database-migrations
- https://supabase.com/docs/guides/platform/backups

## Next approval

Review a plain-language backend scope and cost proposal, starting with durable client/mark records, invitation-only access, and staff/client isolation. Before provisioning, confirm Supabase account capacity and choose the project. This plan authorizes no account changes or installations. Commit/push remains subject to the owner's established approval workflow.

## Confirmed platform choices and first implementation phase

The owner confirmed Cloudflare for hosting (hosting work deferred) and Supabase Free for development. An email delivery provider will be selected later. Supabase Auth manages invitations and account recovery; its default sender currently only delivers to project-team addresses with a two-message-per-hour limit. Do not add clients to the Supabase administrative team to bypass that restriction. Custom email delivery must be configured and tested before real client invitations. Reference: https://supabase.com/docs/guides/auth/auth-smtp . Recheck limits before setup.

Phase 1 proposal — durable records and access boundaries:

1. Agree a minimal data model: clients/contact details, staff and client memberships, trademarks linked to a client, mark update history, and client service preferences. Treat external Clio/QuickBooks references as optional text only initially. Requests and automation execution can follow once the access foundation is proven.
2. Create version-controlled database migrations, access policies, configuration templates, synthetic test data, and a repeatable clean setup procedure. Seed only the approved Cotivate LLC / Mario Cosey / Cotivate example; keep unknown email, status, type and filing numbers unset. Do not turn unknown information into claimed legal facts.
3. Provision a dedicated VB development project only after explicit approval, account-capacity verification and project selection. Do not reuse or alter unrelated projects. Obtain separate approval for any local runtime installations or additional account access.
4. Implement separately controlled staff provisioning and invitation-only client access. Public signup must not grant portal access. Tie authorization to protected membership records, not user-editable profile metadata. Require staff MFA before exposing client data. Keep privileged credentials on the server.
5. Implement persistent attorney client/mark reads and writes, plus client reads of only their own records and permitted preference edits. Clients cannot modify mark ownership, legal fields or access roles. No scheduled services should execute merely because a preference is enabled.
6. Verify access using isolated synthetic users: authorized attorney, client A, client B, uninvited user and signed-out user. Attempts to access another client's record or elevate privileges must fail at the database/server layer. Test account deactivation/archive semantics before enabling those actions against real records.
7. Rebuild from the committed setup files in a clean test environment and rerun access checks. Record exact steps and results in the launch checklist.

Deliverable: a tested, recreatable Supabase foundation supporting durable attorney-managed records and isolated client access. Existing frontend screens will be wired to that foundation incrementally; no additional disposable shared-state prototype is needed.

Phase 1 excludes live USPTO retrieval, real client onboarding, public deployment, calendar/Clio/QuickBooks connections and background automations. Auth email delivery tests may initially use approved team-owned test addresses; broader client invitation testing waits for the approved sender configuration. A free development project is not production-readiness certification.

The next approval is for implementing the repository schema/policy/configuration files and relevant tests. Project provisioning, credential handling, installations and account changes remain separate concrete approvals. No implementation is authorized by this planning document alone.
