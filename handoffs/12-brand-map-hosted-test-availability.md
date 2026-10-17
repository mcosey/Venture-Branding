# Brand Map hosted-test availability

**Subsequent October 10 review complete:** see `13-brand-map-shared-test-review.md`. BCM release verification is in progress in the parallel chat. Recommend preserving BCM Test during release and later considering it as a shared test environment, with separate approval for preparing files and executing them.

October 10, 2026. Mario authorized pausing Cotivate's account and then asked to continue. Read-only dashboard inspection established that its database project is already paused; no pause or other account change was necessary or performed.

## Observed Supabase dashboard state

- Organization `vncpwzknteetpkahkhwp`, named Cotivate, Free plan: project **Cotivate Development**, reference `yjhzhflyuxcxugfgspby`, explicitly shows "Project Cotivate Development is paused."
- Organization `aicvfezdbwwfvzowrgom`, also named Cotivate, Free plan: **Venture Branding**, reference `omvkwiosonatswocbdgx`, and **Venture Branding BCM Test**, reference `imvkhicfmidzbzsbhkzs`, show running Nano instances.
- The new-project page for the latter organization explicitly blocks creation because the account has reached its two-active-free-project limit. No form was filled or submitted.
- Do not treat "Cotivate's account" as authorization to pause the whole similarly named organization, Venture Branding, or BCM Test. Those projects support this product and parallel work. Cotivate Development is already paused and cannot free another slot.

## Changes and pending approval

No project was paused/resumed/created/deleted/upgraded; no database SQL ran, credentials were copied, software installed, or client access altered. No product files changed, commit, push, deployment, or message to another chat occurred. Only planning/status documents were updated.

Recommended next bounded phase: ask Mario to approve a read-only review of whether the BCM Test project remains necessary for parallel development, then propose the safest test route. Pausing or reusing that project, paid resources, and creation of a new project each need specific subsequent approval. Do not interrupt parallel tests to free capacity on assumption.

Handoff 11's next account-check step is complete. Its hosted test copies, database execution, concurrency tests, and portal integration remain unapproved/unverified. The no-install preference persists. Recommend GPT-6.1 Sol, medium reasoning for the next review; higher reasoning only when approved database privacy/concurrency work starts.
