# Proposal: Automated Reminders

## Intent

Create an automated day-of-event email reminder system for ticket buyers using Resend API to reduce user friction and increase attendance.

## Scope

### In Scope

- **Database Schema**: Migrations for tables `mRecordatorioTemplate`, `mRecordatorioEvento`, and `mRecordatorioEnvio`.
- **UI Navigation**: Left sidebar update in `src/routes/LeftSidebar.svelte` to group "Campañas" and "Recordatorios" under a new "Difusion" submenu.
- **SvelteKit Routes**: New `/recordatorios` route structure to manage template settings, assign templates to events, toggle status, and view logs.
- **Edge Function & Cron**: Supabase Edge Function `send-event-reminders` scheduled via `pg_cron` at 08:00 AM (America/Mexico_City) daily.
- **Email Sending**: Dispatch using Resend API, bypassing the general "desuscrito" (unsubscribed) check as these are transactional notifications.
- **Dynamic Variables**: Interpolation of `{{nombre}}`, `{{evento}}`, `{{fecha}}`, `{{hora}}`, `{{ubicacion}}`, `{{link_maps}}`, and `{{link_ticket}}`.

### Out of Scope

- SMS/WhatsApp reminders (deferred to future implementation).
- Email open/click-through rate tracking (deferred to campaigns extension).

## Capabilities (Specs Contract)

### New Capabilities

- `automated-reminders`: Covers UI management, template assignment, automated cron triggering, and email dispatch logic.

### Modified Capabilities

- None

## Affected Areas

- `src/routes/LeftSidebar.svelte` (Modified)
- `src/routes/recordatorios/` (New directory)
- Supabase SQL migrations (New)
- Supabase Edge Functions (New)

## Success Criteria

- Daily cron triggers at 8:00 AM (America/Mexico_City).
- All buyers for today's active events receive personalized reminder emails.
- Duplicate email prevention functions correctly.
- Left sidebar displays the "Difusion" group containing "Campañas" and "Recordatorios".

## Rollback Plan

- **Database**: Revert the migration to drop tables `mRecordatorioTemplate`, `mRecordatorioEvento`, and `mRecordatorioEnvio`, and drop the cron schedule.
- **Sidebar**: Revert changes in `src/routes/LeftSidebar.svelte` to restore "Campañas" and remove the "Difusion" group.
- **Routes**: Delete the `src/routes/recordatorios` directory.
- **Edge Function**: Delete the `send-event-reminders` Supabase Edge Function deployment.
