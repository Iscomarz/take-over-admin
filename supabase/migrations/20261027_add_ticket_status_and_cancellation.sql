-- =====================================================================
-- Migración: Agregar soporte de estados y cancelación a tabla ticket
-- Fecha: 2026-10-27
-- =====================================================================

-- 1. Agregar columnas a la tabla ticket si no existen
ALTER TABLE public."ticket"
ADD COLUMN IF NOT EXISTS "estado" VARCHAR(20) NOT NULL DEFAULT 'activo'
  CHECK ("estado" IN ('activo', 'suspendido', 'cancelado', 'reembolsado')),
ADD COLUMN IF NOT EXISTS "motivo_cancelacion" TEXT NULL,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now();

-- 2. Índices para acelerar búsquedas por estado y validación por QR
CREATE INDEX IF NOT EXISTS idx_ticket_estado ON public."ticket"("estado");
CREATE INDEX IF NOT EXISTS idx_ticket_codigoQR_estado ON public."ticket"("codigoQR", "estado");

-- 3. Comentarios explicativos
COMMENT ON COLUMN public."ticket"."estado" IS 'Estado del ciclo de vida del ticket: activo, suspendido (disputa/revisión), cancelado o reembolsado';
COMMENT ON COLUMN public."ticket"."motivo_cancelacion" IS 'Motivo o referencia por el cual el ticket fue suspendido o cancelado (ej. disputa bancaria)';
COMMENT ON COLUMN public."ticket"."updated_at" IS 'Fecha de la última actualización del registro del ticket';
