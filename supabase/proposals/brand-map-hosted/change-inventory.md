# Executed rollback test changes

The approved run on October 10, 2026 completed and rolled back all changes below. The separate cleanup check confirmed no remaining Brand Map objects or synthetic records. Existing application records and rules were preserved. Three missing nullable date columns and pgTAP were separately approved for temporary creation inside the same inner rollback block; they were removed afterward.

| Object | Proposed change during the check |
| --- | --- |
| Temporary prerequisites | Three nullable `vb_marks` date columns and supported pgTAP in existing `extensions`; all created inside the inner rollback block and confirmed absent afterward. |
| `public.vb_marks` | Add `vb_marks_id_client_unique` on `(id, client_id)`, including its backing unique index. This takes a table lock; existing mark rows are not rewritten by this DDL. |
| Three new tables | `vb_brand_assets`, `vb_brand_relationships`, `vb_brand_legal_links`, their keys, constraints, indexes and read policies |
| Five new private functions | Asset touch/slot initialization, scoped read check, write lock/authorization check and mark identity fingerprint |
| Five new public functions | Read map, save business asset, set parent, confirm business relationship and staff-MFA legal-link review |
| Seven new triggers | Touch on the three new tables, asset slot initialization, audit on the three new tables. No new trigger is installed on the existing mark/client/BCM tables. |
| New-object access | Row security on the new tables; direct table/helper access revoked; five projected/guarded public RPCs executable by authenticated callers only. These grants do not commit. |
| Synthetic fixtures | Three separately named clients, four synthetic Auth rows, scoped memberships/staff, four initial assets and three marks, then additional assets/edits made by the suite |
| Existing triggers | Normal client preference/audit and mark audit triggers run only for the new synthetic records. No existing client/staff membership is changed. |
| Temporary helpers | Fixture helpers and preservation/report helpers. Only named fixture helpers receive temporary anon/authenticated execution for role tests. |

The original backend business/legal behavior is copied statement-for-statement from the unapplied draft. The hosted adaptation changes only the test wrapper, the separately approved temporary prerequisites, random fixture namespace/names, scoped slot counts, named temporary helper grants and strict result collection. It does not relax staff MFA, row security or version/cycle protections.

**Preservation:** nested rollback, before/after existing row/rule fingerprints, and a separate read-only postcheck. Existing Brand Map object names cause a stop rather than replacement. No table reset, persistent installation, old function replacement, sequence reset or blanket fixture deletion is included. Unexpected external-action triggers must be reviewed before execution because database rollback cannot retract external effects.

**Known residual effect:** normal audit sequence counters can advance; harmless numbering gaps are possible. No claim is made that rollback returns every internal database counter to its earlier value.
