# Attorney maintenance workflow preview — October 9, 2026

User approved a bounded local editor and draft/publication preview inside the existing attorney workspace. No real maintenance database or access changes are authorized.

- Each active client's trademark has a Maintenance dates action. Editor is instantiated only after the existing staff/MFA-protected loader succeeds; archived clients cannot open it.
- Preview entries use temporary memory keyed by client and mark. Add/edit drafts, fill a fictional example, verify, and publish a client-view preview within the dialog.
- All entries are expressly examples. No database writes, browser storage, messaging, notifications, deadline calculation, account changes, installation, commits, pushes, or deployment.
- Draft changes retain the prior published example until saved and verified again. Verification source is omitted from the client projection. Status changes are manual.
- Reload/sign-out clears preview entries. Existing auth gate closes dialogs when access is locked.
- 24 targeted tests passed across maintenance editor, client maintenance, auth and connection. Actual editor component checked in an isolated browser fixture using fictional data, including date inputs, verification, publication and 390px layout with no horizontal overflow. After the user signed in through attorney-login.html, the actual client page, per-mark Maintenance dates action, draft example save, verification check, and client publication preview were verified in the signed-in attorney workspace. No maintenance records were saved to the database.
- Files: `attorney/assets/maintenance-editor.js`, `maintenance-editor.css`, `maintenance-preview-model.mjs`, `tools/maintenance-editor.test.mjs`; narrow edits to `attorney/assets/workspace.js` and `attorney.html`.

The client Maintenance Reminder page is not updated by publication preview. Real persistence and server-side publication/access rules require a separately approved phase.

Sign-in troubleshooting: user encountered the generic access error on client login.html while trying to enter the attorney workspace. User successfully signed in via attorney-login.html without disabling or resetting MFA.

Approved Publish feedback refinement: publication now focuses and scrolls to the client-view preview, with a visible Publication preview updated confirmation. Six editor checks passed, and focus/visibility were verified in the signed-in workspace. Preview-only storage and access behavior remain unchanged.
