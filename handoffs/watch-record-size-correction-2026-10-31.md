# Watch archive validation correction, October 31, 2026

## Failure and reproduction

The October 29 and 30 scheduled Production runs stopped during validation of
`apc261028.zip`, before ingestion of that file and before client checks:

- https://github.com/mcosey/Venture-Branding/actions/runs/40942410746
- https://github.com/mcosey/Venture-Branding/actions/runs/41115361917

Downloaded the named public archive through the user's signed-in USPTO session.
The local archive is 41,479,499 bytes; its SHA-256 is
`f3689fcd351e2cf6e4c694d175ca1dc2a4f1e2a14a1a5a9fb41b138b17d16ec2`.
This identifies the copy inspected, not a hash recovered from the failed runs.
Its sole member is `apc261028.xml`, 770,909,068 uncompressed bytes.

The unchanged parser reproduced `XML case/section exceeds supported size`.
One case is 2,328,518 bytes, exceeding the 1 MiB parsing-section limit. Its filing
date is June 12, 2019 and drawing code is 3, so it is outside the 30-day candidate
window. The parser must still traverse it to validate the whole file.

## Focused local change

- Set the bounded XML section ceiling to 4 MiB. Keep the archive, whole-XML,
  nesting, candidate count, field, upload, and XML-entity protections in place.
- Report fixed, allowlisted archive-validation reason codes. Unknown exception
  text stays generic; keys, source values, response bodies and URLs are not logged.
- Add fictional regression cases for a historical record larger than the one
  observed, the new finite ceiling, and unsafe XML inside a large record. Keep
  diagnostics privacy and no-ingestion-on-validation-failure checks.

## Validation

All 42 runner tests passed. `git diff --check` passed.
The corrected parser read the entire downloaded file locally, including ZIP CRC
validation, and returned:

| Outcome | Count |
| --- | ---: |
| Total records | 53,691 |
| Outside lookback | 50,947 |
| Excluded drawing | 462 |
| Missing filing date | 1 |
| Missing word name | 0 |
| Word candidates | 2,281 |

Sample parsing does not contact a database or upload candidates. No live Watch
run, database change, service deployment, workflow edit or software installation
was performed. No credentials or public case-record contents are added to Git.

## Release boundary

This is a local, uncommitted proposal. Production still checks out runner commit
`eaa97cb793e12adb5345df3de93a250dbd131cb6` from the workflow on `tg`.
Committing/pushing this proposal on the current branch alone will not repair the
scheduled job. Promotion of the reviewed source and an update to that exact
checkout reference require a separate approved release step. A live catch-up run
would use the existing USPTO/database credentials and write normal Watch results;
it has not been authorized or performed in this investigation.
