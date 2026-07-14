# Design: Automated Event Reminders

## 1. Architecture Decisions

### Decision 1: Scheduler Engine

- **Choices**: Supabase `pg_cron` (via `pg_net`) vs. Vercel Cron / SvelteKit endpoint.
- **Decision**: Supabase `pg_cron` calling a Supabase Edge Function (`send-event-reminders`) daily at 08:00 AM (America/Mexico_City).
- **Alternatives**: Endpoint exposed on SvelteKit called by external cron provider.
- **Rationale**: Bypasses serverless function timeouts on SvelteKit routes, runs closer to database resources, and handles large email batches securely with environment keys stored inside Supabase.

### Decision 2: Transactional Bypass of Marketing Unsubscription

- **Choices**: Respect `desuscrito` checkbox (skip sending) vs. Bypass `desuscrito` (send email).
- **Decision**: Bypass `desuscrito` check.
- **Alternatives**: Skip sending reminders to unsubscribed clients.
- **Rationale**: Day-of-event reminders are transactional messages containing ticket access details and event details. Under email regulations (CAN-SPAM/GDPR), transactional messages do not require an opt-out mechanism and must bypass marketing opt-out preferences.

### Decision 3: Sidebar UI Navigation

- **Choices**: Keep "Campañas" as a top-level link and add "Recordatorios" beside it vs. Group under a "Difusion" dropdown group.
- **Decision**: Group under "Difusion" dropdown in [LeftSidebar.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/LeftSidebar.svelte).
- **Alternatives**: Place "Recordatorios" under a generic settings section.
- **Rationale**: Groups all outbound communication management views together, maintaining a clean and scalable sidebar layout.

---

## 2. Technical Flow

```
[pg_cron @ 08:00 AM] ──> [Edge Function] ──> [Query today's active events & buyers]
                                                   │
                                                   ├──> [Filter out already sent]
                                                   ├──> [Call Resend API (bypassing desuscrito)]
                                                   └──> [Insert mRecordatorioEnvio logs]
```

---

## 3. Data Schema

We will define three new tables and corresponding indexes to support template management, configuration, and deduplication.

```sql
-- Templates for reminder emails
CREATE TABLE "mRecordatorioTemplate" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR NOT NULL,
    asunto VARCHAR NOT NULL,
    cuerpo_html TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Active reminder configuration per event
CREATE TABLE "mRecordatorioEvento" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id INTEGER NOT NULL REFERENCES "mEvento"(idevento) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES "mRecordatorioTemplate"(id) ON DELETE RESTRICT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dispatch logs for deduplication
CREATE TABLE "mRecordatorioEnvio" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recordatorio_evento_id UUID NOT NULL REFERENCES "mRecordatorioEvento"(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES "mCliente"(cliente_id) ON DELETE CASCADE,
    enviado BOOLEAN NOT NULL DEFAULT false,
    fecha_envio TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (recordatorio_evento_id, cliente_id)
);

CREATE INDEX idx_recordatorio_envio_event_client ON "mRecordatorioEnvio"(recordatorio_evento_id, cliente_id);
```

---

## 4. File Changes

| Path                                                                                                                                                                            | Action | Description                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| [20260714_create_recordatorios.sql](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/migrations/20260714_create_recordatorios.sql) | Create | Table setup, indexes, and pg_cron job script activation.                |
| [index.ts](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/supabase/functions/send-event-reminders/index.ts)                               | Create | Deno Edge Function fetching buyers and invoking Resend.                 |
| [LeftSidebar.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/LeftSidebar.svelte)                                        | Modify | Introduces "Difusion" dropdown grouping "Campañas" and "Recordatorios". |
| [+page.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/recordatorios/+page.svelte)                                      | Create | Main dashboard listing active configurations and template status.       |
| [+page.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/recordatorios/templates/+page.svelte)                            | Create | Creation and editing interface for email HTML templates.                |
| [+page.svelte](file:///C:/Users/FranciscoEmmanuelMar/Desktop/Francisco/Dev/TakeOver/take-over-admin/src/routes/recordatorios/events/+page.svelte)                               | Create | Linkage view mapping active events to templates.                        |

---

## 5. Testing Strategy

| Layer              | Target                          | Approach                                                                                                                                                                      |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit / Integration | Interpolation & Deduplication   | Test dynamic replacements (`{{nombre}}`, `{{evento}}`) and verify that unique constraint `(recordatorio_evento_id, cliente_id)` prevents double-sends in local database runs. |
| E2E                | Cron Execution & Email Delivery | Configure a template in the admin portal, link it to a mock event scheduled for today, manually execute the Edge Function, and verify delivery logs in Resend console.        |
