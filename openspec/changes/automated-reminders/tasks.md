# Tasks: Automated Event Reminders

## Review Workload Forecast

- Estimated changed lines: 500-600
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Chain strategy: stacked-to-main
- Decision needed before apply: Yes
- Delivery strategy: ask-on-risk

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

---

## Tasks

### Phase 1: Foundation (SQL Migrations & Configs)

- [x] Create database tables and indexes in [20260714_create_recordatorios.sql](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/migrations/20260714_create_recordatorios.sql).
- [x] Configure `pg_cron` scheduler calling `send-event-reminders` at 08:00 AM daily in [20260714_create_recordatorios.sql](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/migrations/20260714_create_recordatorios.sql).

### Phase 2: Core (Edge Function Logic)

- [x] Initialize Edge Function with Resend configuration in [index.ts](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/functions/send-event-reminders/index.ts).
- [x] Fetch today's active event buyers bypassing marketing unsubscribe (`desuscrito`) in [index.ts](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/functions/send-event-reminders/index.ts).
- [x] Interpolate template parameters and dispatch emails via Resend in [index.ts](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/functions/send-event-reminders/index.ts).
- [x] Deduplicate sends and insert logs to `mRecordatorioEnvio` in [index.ts](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/functions/send-event-reminders/index.ts).

### Phase 3: Integration (SvelteKit UI Components)

- [x] Add the "Difusión" dropdown grouping "Campañas" and "Recordatorios" inside [LeftSidebar.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/LeftSidebar.svelte).
- [x] Create main dashboard view listing active reminders configuration at [+page.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/recordatorios/+page.svelte).
- [x] Create email template editor view with HTML structure checks at [+page.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/recordatorios/templates/+page.svelte).
- [x] Create linkage view connecting events to templates at [+page.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/recordatorios/events/+page.svelte).

### Phase 4: Verification (Local Testing & Documentation)

- [x] Document Edge Function local invoke and migration deployment commands.
- [x] Manually verify e2e flow (mock event today, daily task invoke, Resend logs check).

### Phase 5: Cleanup (Test Data Purging)

- [x] Remove database test records and mock templates created during verification.
