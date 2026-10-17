# BCM automatic-trigger check — Production weekly pilot active

October12,2026, America/Chicago. Approved four additional weekly attempts on https://openai.com/, in the existing Cotivate LLC Venture Branding Production workspace. User explicitly approved starting the automatic check now despite the need to renew the short-lived API key.

## Working evidence

The actual Supabase cron timer invoked the new AI dispatcher at2026-10-13T02:22:00Z. Its private-key-authenticated scheduled worker reserved one run with schedule_revision6, completed it at02:22:20Z and saved11 observations. Three original baseline runs retained. All25 distinct observations remain known/baseline: no duplicate candidate added, no new needs-review alerts and no client publications. Newly observed remains distinct from newly launched. This verifies one genuine timer-triggered run, not a manual scan or simulated schedule.

Automatic run b591b377-a9bb-4e71-b917-a8351dd67556 estimated API usage USD0.0225104 (about2.3 cents). Including the three starting checks, saved estimated usage USD0.0799884. Actual provider billing not independently inspected. No automatic retry or second paid smoke check.

The initial idle request returned200/status idle with no paid research, validating the existing scheduler credential. Old bcm_scheduler_secret retained its earlier line break; already saved bcm_scheduler_secret_v2 is valid and its server-side digest matches the worker secret. New dispatcher uses v2; no secrets displayed, changed or saved in source. Legacy crawler remains off. No software or new account installed.

## Current active state

Exact Production omvkwiosonatswocbdgx. AI/scheduler readiness true, pilot_client_id10000000-0000-0000-0000-000000000001, total attempt ceiling7 (three initial baseline plus four additional). Four runs used, three remaining. No other client enabled. Cotivate workspace website temporarily openai.com, weekly, discovery site, settings version4; original Cotivate preferences remain in the saved prior checkpoint. Current client schedule revision6 enabled, last_status completed, next_run_at2026-10-20T02:22:01Z: October19 at9:22p.m. Central.

New cron job3 vb-bcm-ai-pilot-tick active with five-minute due checks; it makes paid requests only when weekly work is due and below cap. Temporary minute ticks used only to get the actual scheduler smoke run promptly, then restored to five-minute ticks. No legacy active jobs. Existing auth/bcm-ai built-in access checks and private scheduler auth retained; no gateway/auth changes. Worker BCM_AI_RELEASE_ENABLED=true verified by saved fingerprint; local auth/config.js allowBcmResearch=true.

The run ceiling counts every reservation, including failed/discarded attempts. At7, further paid requests are denied; readiness/client preference may still visually show on until manually paused. No autonomous extra allowance is authorized. Short-lived OpenAI key must be renewed before expiration, particularly before the next scheduled October19 check. User enters replacement privately if needed; do not read/copy it. No promise of future successful checks with an expired key.

## Saved files and verification

Source SQL09-weekly-pilot-dispatcher.sql contains exact created dispatcher and originally inactive cron setup, with Production guards. Activation also used existing client Save settings/Start monitoring controls and a guarded singleton readiness/ceiling update. Scope saved in this handoff and chat outputs/bcm-weekly-automatic-evidence.json, bcm-weekly-active-state.json, bcm-weekly-monitoring-active.png.

Client screen verified Monitoring is on, baseline3/3, weekly preference, correct next date, Pause monitoring control. Research history and private observations retained. Existing reviewed-only map and queue connection unchanged; no publication was authorized in this phase. No inference that all future site changes will be found.

Scoped local changes: auth/config.js release control, SQL09, package README/manifest and this handoff. Older scanner drafts preserved. Commit/push require separate approval. Public portal hosting still unconfirmed; backend schedule runs independently of local browser/chat.

## Next step

Approve scoped commit/push of these activation records and local controls. Renew API key before its expiration/next scheduled check. No additional discovery feature or testing phase proposed. GPT-6.1 Sol medium is sufficient for saving work and activation administration.
