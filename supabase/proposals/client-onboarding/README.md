# Separate Member and Client onboarding

Scope authorized October 24, 2026: Members accept the existing Member acknowledgments.
Clients handle their agreements separately with the engagement letter. The website
does not draft, display, or record acceptance of Client agreements.

- Ordinary public signup keeps the Member acknowledgments and basic profile.
- A verified existing Client completes only a missing basic profile.
- A new invitee creates/verifies a login, then completes the Client profile without
  Member acknowledgments. Only acceptance of a valid, matching invitation grants
  Client record access.
- An invited existing Member keeps the existing profile and original Member
  acknowledgment. The invitation review/acceptance supplies the Client access step.
- When a Client-only user later enters free Member access, Member acknowledgment is
  required then. Existing planning data is reused rather than duplicated.

Profile fields remain owner-only planning data. They never choose the legal client,
copy legal-client records, change represented entities, or grant engagement access.

## Database package

Applied to main Venture Branding on October 24, 2026 after explicit approval.
All 34 checks passed in the rollback rehearsal and again after installation.
Preservation checks passed in both runs. The 500 offline checks also passed.
See `verification-20261024.json`; private execution receipts are saved outside Git.
No real account profile has been filled in by the agent, and the signed-in Client's
profile submission / resulting Legal Launch Kit map still needs user verification.

`01-prepared-apply.sql` targets the known main Venture Branding database and rejects
changed baseline function bodies. It adds a private Client-profile completion table,
an own-account Member-completion check, and a verified Client/invite-recipient profile
save. It updates only the profile-reuse behavior of Member onboarding and the profile
prerequisite for invitation acceptance. All other invitation checks remain intact.

The private completion table records profile setup, not agreement acceptance. Member
acknowledgments stay in their existing separate record. No legal wording or policy
versions are changed. No existing records are backfilled by the migration.

Assemble review SQL outside Git with the existing Node runtime:

```
node tools/prepare-client-onboarding.mjs /absolute/private/review-directory
```

The output contains a rollback rehearsal, the exact application SQL, and a separate
rollback verification for the installed package. Six fictional Auth rows, three
fictional clients, invitation fixtures, and temporary engagement grants exercise the
paths. No Auth API, email, external lookup, or monitoring job is called. Existing data
fingerprints, Auth IDs, function definitions and table permissions are compared after
rollback. Existing audit sequence counters can advance, as with normal PostgreSQL
rollback tests; the fixture rows and grants do not persist.

Any future execution requires separate approval for database permission changes and the
rollback fixtures. Rehearse first; apply only after every check and preservation
result passes. Do not execute `02-rollback-checks.sql` outside a rollback wrapper.

Offline UI tests use simulated accounts; the separate hosted rehearsal and installed
verification provide the database evidence. Do not rerun the one-time application.
No additional software installation, Test activation, Cotivate-project change,
website publishing, or hosting work is part of this package.
