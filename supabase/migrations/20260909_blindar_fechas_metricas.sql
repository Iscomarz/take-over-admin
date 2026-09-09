-- Migración: Blindar fechas y horas para analíticas y métricas
-- 1. mVenta: Asegurar default now() para fechaVenta y agregar columna created_at
ALTER TABLE "mVenta" 
  ALTER COLUMN "fechaVenta" SET DEFAULT now();

ALTER TABLE "mVenta" 
  ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();

UPDATE "mVenta" 
SET "created_at" = "fechaVenta" 
WHERE "fechaVenta" IS NOT NULL;

-- 2. mPago: Asegurar default now() para fechaPago y fechaAcreditacion, y agregar created_at
ALTER TABLE "mPago" 
  ALTER COLUMN "fechaPago" SET DEFAULT now(),
  ALTER COLUMN "fechaAcreditacion" SET DEFAULT now();

ALTER TABLE "mPago" 
  ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();

UPDATE "mPago" 
SET "created_at" = "fechaPago" 
WHERE "fechaPago" IS NOT NULL;

-- 3. ticket: Agregar columna created_at y recuperar fecha histórica desde mVenta.fechaVenta
ALTER TABLE "ticket" 
  ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();

UPDATE "ticket" t
SET "created_at" = v."fechaVenta"
FROM "mVenta" v
WHERE t."idVenta" = v."idventa" 
  AND v."fechaVenta" IS NOT NULL;

-- 4. mEvento: Agregar columna created_at para auditoría de creación de eventos
ALTER TABLE "mEvento" 
  ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
