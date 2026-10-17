# Messages inbox layout

User approved replacing the prior list-of-links presentation with a familiar inbox, October 10, 2026. Layout-only phase: existing saved messages, protected repository/RLS, schedule and email setup remain unchanged. No database setup, access changes, commit/push or Production activation in this phase.

`portal/assets/digest.js` and `digest.css`: Inbox heading with unread count; rows show Venture Branding sender, subject, date, frequency/sample preview and unread dot; selected row highlighted. Separate reading pane opens the selected digest and retains protected read-state behavior. Empty pane invites selection. Small screens stack list and reader. No nested card containers or added chat/mail-sending functionality. Refresh and Digest preferences retained on the inbox, while Reload/Generate remain absent on settings.

Verification: module syntax and six digest repository/privacy regressions pass. Browser appearance and open/selection checks to be recorded after review. Preview http://127.0.0.1:8012/messages.html uses the existing fictional Cotivate Test account and populated sample. Main config remains disconnected from digest service; no public deployment.

Browser confirmed Inbox count, sender/subject/date rows, sample selection highlight and populated reading pane through the existing protected reader. Example results remain explicitly fictional. Screenshot saved in chat outputs/digest-phase2/inbox-redesign.jpg. No database or scheduling change made for this layout. Unread presentation derives from the existing persisted read_at field; opening the Test sample successfully reported read. Phase complete pending user visual review.

User requested another aesthetic pass while keeping the layout. Removed toolbar, row, column and reading-body dividing lines; used open spacing, a muted selection background and a very subtle reading-pane surface. CSS-only adjustment, shared by main files and Test preview. No behavior/database changes.
