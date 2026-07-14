# Exploration: Automated Day-of-Event Email Reminders

## Current State

- **Sidebar Navigation:** Located in `src/routes/LeftSidebar.svelte`. It displays "Campañas" as a separate main menu item (`href="/campanias"`), with no "Recordatorios" page or unified group.
- **Email Sending:** Handled by the endpoint `src/routes/api/enviarCampania/+server.js` and the service `src/services/campania-service.js`. Emails are sent via the Resend API (`resend.emails.send`) by iterating through recipients, sending, and updating `mcampaniadestinatario` and `mcampania` tables.
- **Database Schema:**
  - `mEvento` stores event details (Primary key: `idevento` as integer). Important fields: `nombreEvento`, `fechaInicio` (timestamp), `fechaFin`, and `activo`.
  - `mCliente` stores unique client data (Primary key: `cliente_id` as integer). Fields: `nombre`, `correo` (unique), `telefono`, and `desuscrito` (boolean).
  - `mVenta` stores ticket transactions (Primary key: `idventa` as UUID/integer). Relates to `mCliente` via `cliente_id` and to `mEvento` via `idEvento`.

## Affected Areas

- `src/routes/LeftSidebar.svelte` — Needs to be modified to group "Campañas" and "Recordatorios" under a unified "Marketing" submenu dropdown.
- `src/routes/recordatorios` — New SvelteKit route to view, configure, and monitor automated reminders and templates.
- `Database Schema (Supabase SQL Editor)` — Need to execute migration to add table structures for `mRecordatorioTemplate`, `mRecordatorioEvento`, and `mRecordatorioEnvio` as well as configuring `pg_cron`.
- `Supabase Edge Functions` — New Edge Function `send-event-reminders` to process the cron job and send emails via Resend.

## Approaches

1. **Supabase pg_cron + Edge Functions + pg_net** — PostgreSQL `pg_cron` calls a Supabase Edge Function via `pg_net` every 30 minutes, which performs the batch querying of upcoming events, reads templates, matches buyers, sends emails via Resend, and logs delivery in the DB.

   - **Pros:** High security (keys stored inside Vault), high scalability (does not block SvelteKit server resources), robust delivery logging via `mRecordatorioEnvio` to prevent double sending.
   - **Cons:** Requires database-level extension configuration; function logs are located in the Supabase Dashboard console.
   - **Effort:** Medium

2. **SvelteKit Cron Job (Vercel Cron / external trigger)** — SvelteKit API endpoint `/api/cron/sendReminders` is called by an external scheduling service, executing the query and email iteration using the serverless backend.
   - **Pros:** Kept entirely inside the SvelteKit codebase; easier to debug locally.
   - **Cons:** Prone to serverless execution timeout limits (usually 10s-60s) when processing large cohorts of ticket buyers.
   - **Effort:** Low/Medium

## Recommendation

We recommend **Approach 1 (Supabase pg_cron + Edge Functions + pg_net)**. Since the codebase is deeply integrated with Supabase and SvelteKit, offloading long-running, bulk email delivery jobs to Supabase Edge Functions is the most robust, secure, and production-ready solution that avoids SvelteKit serverless execution timeouts.

## Risks

- **Compliance & Unsubscriptions:** The Edge Function must strictly exclude buyers who have unsubscribed (`desuscrito = true` in `mCliente`).
- **Timezone Shifts:** Event dates are stored as timestamps; the cron job and Edge Function must normalize timestamps to the Mexico City timezone (`America/Mexico_City`) to avoid sending reminders in the middle of the night.
- **Delivery Integrity:** Ensure a unique constraint on `(recordatorio_evento_id, cliente_id)` to guarantee no double-sending in case of job retries.

## Ready for Proposal

Yes
