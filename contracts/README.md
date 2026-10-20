# Current portal feature contracts

This manifest describes the current environment gates, not public-launch clearance. Production Member accounts, engagement invitations and scoped Watch are intentionally not enabled yet. Test uses their newer flow and deliberately disables paid BCM, evidence and digest controls. USPTO and contact saving are required by visible attorney/account controls. Their Test repairs and authenticated preview/contact-save evidence are recorded in CURRENT-ENVIRONMENTS.md; the fresh enabled-feature catalog comparison passed within its limited scope.

`node tools/feature-contracts.mjs --sql` prints one read-only catalog query. Run it only in the selected project's SQL editor, save the `contract_snapshot` JSON value, and compare it locally:

```
node tools/feature-contracts.mjs --check bcm-test /absolute/path/catalog.json /absolute/path/workers.json
```

The worker JSON format is `{"project_ref":"imvkhicfmidzbzsbhkzs","names":["uspto-lookup", "..."]}`. Obtain names from the selected project's deployed-function list; this tool does not access an API, read credentials or deploy workers. A missing worker inventory cannot produce a passing result. The SQL includes the database identity so accidentally selecting the other project fails.

A pass checks required public function signatures, caller/anonymous execution, security-definer mode/explicit search path, public-table RLS and supplied deployed-worker names. It does **not** validate every policy body, private helper, column, index, trigger, server secret, deployed source version, feature flag or end-to-end behavior. Use the reviewed package's specific preflight and access tests for changes. Do not use this checker as a database migration or enable missing features to make it green.

Do not add administrative credentials to this repository or frontend. The prepared offline portal CI workflow exercises this comparator with synthetic catalogs. It adds no live database credential, hosted catalog collection or deployment. Automating fresh hosted inspection still needs a separately reviewed read-only access mechanism.
