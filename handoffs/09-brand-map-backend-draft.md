# Brand Map backend draft handoff

October 9, 2026. Mario approved preparing local database-change scripts and executable privacy tests only. That phase is complete. Database application, test-environment setup, UI connection, installation, account changes, commit, push, and deployment remain separately subject to approval.

## Prepared files

The complete package is in `supabase/proposals/brand-map/README.md`, with details in `validation-status.md`. It is deliberately outside automatic migrations and database tests. The user review copy is in this chat's `outputs/brand-map-backend-draft`.

The draft proposes three records: business assets, current parent slots, and legal-link slots. It contains guarded read/write operations, explicit client-safe projections, same-client composite references, server-controlled versions and provenance, separate legal identity review, and protected audit history. Existing authorization/audit functions and mark data are not changed.

The SQL draft is guarded for an explicitly approved disposable database named `venture_brand_map_test`. It is NOT a production-ready migration to copy blindly into the migration folder. PostgreSQL compilation and behavior have not been tested.

## Completed verification

Nine existing Brand Map homepage tests and four test-runner guard/result tests passed (13 total). Both runners parse in Node. A runner invoked without an approval flag refused before connecting. These checks do not validate the new SQL.

The synthetic pgTAP privacy suite and 12 actual overlapping-connection scenarios are written but unrun. No psql, Supabase CLI, Docker CLI, or known authorized isolated test database was available in PATH/context. No installation was attempted.

## Current product state

The existing legal-record homepage remains functional. New business-asset forms, relationship editing, and staff legal-link controls are unconnected. Prior single-client signed-in verification is not full cross-client access testing. No sample assets were added to the authenticated view.

Branch: `codex/attorney-workspace`, shared with pending BCM, Watch, maintenance, and homepage changes. This phase created only the proposal package and this handoff in the project. Preserve the parallel changes and seek coordination approval where needed; no messages to other chats or claims of their agreement were made.

## Recommended next approval

Ask Mario to approve preparation of a concrete isolated-test setup proposal, including exact installation, disk use, or cost. Setup itself needs approval before changes. Then separately authorize database validation in that disposable environment. Database application to the configured service and UI connection remain future phases.
