-- Migration: Automated Event Reminders
-- Date: 2026-07-14
-- Author: sdd-apply sub-agent

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Create mRecordatorioTemplate Table
CREATE TABLE IF NOT EXISTS "mRecordatorioTemplate" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    cuerpo_html TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments for mRecordatorioTemplate
COMMENT ON TABLE "mRecordatorioTemplate" IS 'Plantillas de correo para recordatorios automáticos de eventos';
COMMENT ON COLUMN "mRecordatorioTemplate".id IS 'ID único de la plantilla';
COMMENT ON COLUMN "mRecordatorioTemplate".nombre IS 'Nombre identificador interno de la plantilla';
COMMENT ON COLUMN "mRecordatorioTemplate".asunto IS 'Asunto del correo electrónico';
COMMENT ON COLUMN "mRecordatorioTemplate".cuerpo_html IS 'Cuerpo del mensaje en formato HTML con soporte para variables';

-- 2. Create mRecordatorioEvento Table
CREATE TABLE IF NOT EXISTS "mRecordatorioEvento" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id INTEGER NOT NULL REFERENCES "mEvento"(idevento) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES "mRecordatorioTemplate"(id) ON DELETE RESTRICT,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments for mRecordatorioEvento
COMMENT ON TABLE "mRecordatorioEvento" IS 'Configuración de asociación entre eventos y plantillas de recordatorio';
COMMENT ON COLUMN "mRecordatorioEvento".id IS 'ID único de la configuración';
COMMENT ON COLUMN "mRecordatorioEvento".evento_id IS 'Referencia al evento de la tabla mEvento';
COMMENT ON COLUMN "mRecordatorioEvento".template_id IS 'Referencia a la plantilla en mRecordatorioTemplate';
COMMENT ON COLUMN "mRecordatorioEvento".activo IS 'Indica si el recordatorio automático está activo para este evento';

-- 3. Create mRecordatorioEnvio Table
CREATE TABLE IF NOT EXISTS "mRecordatorioEnvio" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recordatorio_evento_id UUID NOT NULL REFERENCES "mRecordatorioEvento"(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES "mCliente"(cliente_id) ON DELETE CASCADE,
    enviado BOOLEAN NOT NULL DEFAULT false,
    fecha_envio TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_recordatorio_cliente UNIQUE (recordatorio_evento_id, cliente_id)
);

-- Comments for mRecordatorioEnvio
COMMENT ON TABLE "mRecordatorioEnvio" IS 'Bitácora de envíos de recordatorios a los clientes para evitar duplicados';
COMMENT ON COLUMN "mRecordatorioEnvio".id IS 'ID único del registro de envío';
COMMENT ON COLUMN "mRecordatorioEnvio".recordatorio_evento_id IS 'Referencia a la configuración del recordatorio del evento';
COMMENT ON COLUMN "mRecordatorioEnvio".cliente_id IS 'Referencia al cliente en mCliente';
COMMENT ON COLUMN "mRecordatorioEnvio".enviado IS 'Indica si el recordatorio fue enviado exitosamente';
COMMENT ON COLUMN "mRecordatorioEnvio".fecha_envio IS 'Fecha y hora en que se realizó el envío';
COMMENT ON COLUMN "mRecordatorioEnvio".error IS 'Detalle del error si el envío falló';

-- Create Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_recordatorio_envio_event_client ON "mRecordatorioEnvio"(recordatorio_evento_id, cliente_id);

-- Triggers for auto-updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mrecordatoriotemplate_updated_at ON "mRecordatorioTemplate";
CREATE TRIGGER update_mrecordatoriotemplate_updated_at BEFORE UPDATE ON "mRecordatorioTemplate"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mrecordatorioevento_updated_at ON "mRecordatorioEvento";
CREATE TRIGGER update_mrecordatorioevento_updated_at BEFORE UPDATE ON "mRecordatorioEvento"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 4. pg_cron Scheduling Script
-- Unschedule first if it exists to allow re-runs of migration
SELECT cron.unschedule('send-event-reminders-daily')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-event-reminders-daily'
);

-- Schedule cron job to run daily at 08:00 AM America/Mexico_City (14:00 UTC under standard CST time)
SELECT cron.schedule(
    'send-event-reminders-daily',
    '0 14 * * *',
    $$
    SELECT net.http_post(
        url := 'https://koubjdnhazjtykkmalfw.supabase.co/functions/v1/send-event-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(
                (SELECT dec_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
                'PLACEHOLDER_SERVICE_ROLE_KEY'
            )
        ),
        body := '{}'::jsonb,
        timeout_ms := 60000
    );
    $$
);
