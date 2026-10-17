# BCM retirement archive

BCM was retired on October 11, 2026. These four `*-before.ts` files preserve the actual deployed scanner implementations before retirement, including work that had not yet been committed. They are historical source, not current deployment bundles.

Both hosted endpoints now use retired-worker.ts (HTTP 410). Production and Test scheduler readiness is false; the Production BCM cron job is retained but inactive. Client settings and scan records remain in their databases. Digest cron jobs were not changed.

The two guarded SQL files record the applied retirement operation. They alter only global BCM readiness and the BCM cron job's active flag, and preserve client settings, schedules, scans and all other cron jobs.

Restoration is a separate approval: inspect current access/settings, choose the correct environment's original source, restore relevant portal UI connections without overwriting parallel changes, test, then deliberately enable global readiness and the preserved job using cron.alter_job. Do not automatically enable client schedules or use the historical bundles without review.

Portal retirement is saved in this repository and verified through the existing local portal. No public portal hosting address has been confirmed.
