# Production monitoring source

`handler.mjs` is the maintained implementation for both `bcm-ai-scan` and
`bcm-ai-schedule`. Their entrypoints select manual or scheduled authorization.
The Test-only implementation remains separately guarded in `../bcm-ai/`.

For a single-file dashboard review, use the existing Node runtime:

    node tools/bundle-bcm-ai-production.mjs scan
    node tools/bundle-bcm-ai-production.mjs schedule

These commands print source only. They do not deploy or enable research.
The historical `supabase/proposals/bcm-ai-production` package stays frozen;
do not regenerate current workers from that package's pinned historical commit.
