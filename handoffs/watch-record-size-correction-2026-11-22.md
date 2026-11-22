# Watch archive validation correction, November 22, 2026

## Observed failure

The scheduled Production runs on November 20, 21, and 22 failed. The last
successful scheduled run was November 19. The two reported runs both show:

`Watch failed: archive-validation file=apc261119.zip reason=xml-section-size-limit`

- November 21: https://github.com/mcosey/Venture-Branding/actions/runs/44948824364/job/136982008758
- November 22: https://github.com/mcosey/Venture-Branding/actions/runs/45070106801/job/137354927629

The live workflow on `tg` still checks out the October repair,
`c544db764c7cd062395e41c81856fff7e6b4cb08`. Checkout succeeds. The Node.js warning
is separate from the Python archive-validation failure. The affected file is not
ingested and the client-check stage is not reached in these runs.

## Download and reproduction

The user signed into USPTO and completed its human-verification prompt. Only the
identified public archive was downloaded. No API key or password was copied.

- Archive: `apc261119.zip`, 27,949,599 bytes, matching the displayed catalog size.
- SHA-256 of the inspected download:
  `73cefd1054d1d12d7ec6863328bf87b22b8b829a77b7ec2261ed16554e030cf9`.
- Sole member: `apc261119.xml`, 490,505,902 uncompressed bytes.

The unchanged local runner reproduces the same `xml-section-size-limit` error.
An independent streaming inspection read the whole archive and identified a
4,317,740-byte historical record. Its filing date is May 1, 1995 and drawing code
is 1. Its Madrid international-filing-request section accounts for 4,291,616
bytes. This record is outside the candidate lookback. These measurements describe
the downloaded copy, not a hash recovered from the failed GitHub runs.

## Narrow local correction

Raise the finite XML section allowance from 4 MiB to 8 MiB. All archive,
whole-document, nesting, entity, candidate-count, candidate-field, and upload
limits remain unchanged. No records are skipped to bypass file validation and no
fields are truncated. Files beyond the new section allowance still fail closed.

Fictional regressions cover history larger than the observed record, current
candidate-field rejection after such history, unsafe XML, and incomplete XML.
The existing finite-ceiling and no-ingestion-after-validation-failure checks remain.

## Local validation

- 45 Python Watch runner tests passed with sockets blocked.
- 41 JavaScript Watch checks passed with the network tripwire enabled.
- The corrected sample read the entire rejected archive, including ZIP CRC checks:

| Outcome | Count |
| --- | ---: |
| Total records | 28,482 |
| Outside lookback | 25,799 |
| Excluded drawing | 475 |
| Missing filing date | 0 |
| Missing word name | 9 |
| Word candidates | 2,199 |

Reprocessing the October comparison archive locally retained the previously
recorded counts: 53,691 total records and 2,281 word candidates, with the same
exclusion counts. Sample mode performs no database requests or ingestion.

## Release status

This correction is local only. No workflow, database, service, credential,
permission, client setting, or website has been changed. No manual Watch run was
started. No Test or Cotivate-project changes or software installations occurred.
The downloaded archives and inspection scratch files remain outside Git.

Committing and pushing this repair on the website branch alone will not activate
it. The live release step is a separate update of the `tg` workflow's checkout
reference from `c544db764c7cd062395e41c81856fff7e6b4cb08` to the published repair
commit. Its next scheduled run would then attempt the delayed files with the
existing ingestion credentials and permissions.
