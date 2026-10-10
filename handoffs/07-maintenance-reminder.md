# Maintenance Reminder — October 9, 2026

User approved the proposed screenshot and a bounded local portal implementation. Brand Launch Review was shelved earlier in this chat; do not resume it without approval.

- `maintenance.html` uses the existing authenticated portal shell and selected client.
- VB Agents has a View Maintenance Reminder link. The page returns to VB Agents with the selected client preserved.
- Default view: no verified dates connected. No legal dates are inferred from saved mark dates. Portfolio and Discuss with Attorney links preserve the client ID; the latter uses existing Add New Mark intake, which does not submit or schedule.
- View design example shows two fictional records and example dates; example discussion actions are disabled and no fake Portfolio links are created. Switching client or reloading resets this view.
- No database schema, access changes, email notifications, deadline calculations, attorney editing, commits, pushes, deployment, or installation were performed.
- Source: `portal/assets/maintenance.js`, `maintenance.css`; narrow changes in `client.js`, `watch-setup.js`, `automations.html`.
- 27 targeted tests passed: maintenance, Brand Map, connection, and auth suites. Desktop and 390px phone view inspected in the signed-in portal; no horizontal overflow in phone example view. Shared files had pending Brand Map/Watch/BCM changes and were preserved.

Future real dates, attorney updates, request sending, and reminders require separate approval. Do not treat this note as authorization.
