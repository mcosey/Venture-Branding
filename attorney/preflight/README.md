# Initial application preparation

Attorney Workspace: client -> Filings beside a trademark -> Prepare / Transfer / Attorney manual review / History. Staff membership and MFA are required. Saves create immutable versions; conflicts preserve unsaved edits. Final review requires the current resolved checklist, transfer approval and explicit manual confirmation. PDF comparison is removed; historical entries remain inert history. Copy retains its checkmark and Copied until leaving the screen.

Initial schema includes PT409 and manual review. The follow-up migration updates only the review function for an existing schema, not an older save function. Never rerun table creation on an activated database.

No automatic transfer, signing, payment or USPTO submission; other filing types remain unconnected. Current field coverage and legal sufficiency require attorney review.

Validation: node --test tools/draft-store.test.mjs tools/filing-review.test.mjs tools/preflight.test.cjs tools/auth.test.mjs tools/connection.test.mjs. SQL suites are Test-only and roll back. Native runner avoids installing pgTAP. October 10: 45 local and 31 Test database checks passed; combined browser and Production installed-security/opening checks passed. Hosted frontend release is separate.
