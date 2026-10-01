-- =====================================================================
-- Migración: Permitir soldout manual en cFaseEvento aunque ventas < límite
-- Fecha: 2026-10-01
-- =====================================================================

-- 1. Actualizar la función del trigger trg_actualizar_fase_al_cambiar_limite
CREATE OR REPLACE FUNCTION public.actualizar_fase_soldout_al_cambiar_limite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_vendidos NUMERIC;
BEGIN
  -- Calcular el total actual vendido
  SELECT COALESCE(SUM("cantidadTickets"), 0)
  INTO total_vendidos
  FROM public."mVenta"
  WHERE "idFaseEvento" = NEW."idFase";

  NEW."cantidadVendida" := total_vendidos;

  -- 1. Si las ventas reales alcanzan o superan el límite, forzar automáticamente soldout = TRUE
  IF NEW."limite" IS NOT NULL AND NEW."limite" > 0 AND total_vendidos >= NEW."limite" THEN
    NEW."soldout" := TRUE;
  -- 2. Si el usuario marcó explícitamente soldout = TRUE manual, respetarlo siempre
  ELSIF NEW."soldout" IS TRUE THEN
    NEW."soldout" := TRUE;
  -- 3. Si no alcanzó el límite y soldout no es TRUE (ej: el usuario lo desmarcó a FALSE), queda FALSE
  ELSE
    NEW."soldout" := COALESCE(NEW."soldout", FALSE);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Actualizar la función de ventas para no resetear soldouts manuales
CREATE OR REPLACE FUNCTION public.actualizar_fase_soldout_y_vendidos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fase_id BIGINT;
  fases_a_actualizar BIGINT[];
  total_vendidos NUMERIC;
  limite_fase NUMERIC;
BEGIN
  -- Identificar fases afectadas según la operación
  IF TG_OP = 'INSERT' THEN
    fases_a_actualizar := ARRAY[NEW."idFaseEvento"];
  ELSIF TG_OP = 'DELETE' THEN
    fases_a_actualizar := ARRAY[OLD."idFaseEvento"];
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."idFaseEvento" IS DISTINCT FROM NEW."idFaseEvento" THEN
      fases_a_actualizar := ARRAY[OLD."idFaseEvento", NEW."idFaseEvento"];
    ELSE
      fases_a_actualizar := ARRAY[NEW."idFaseEvento"];
    END IF;
  END IF;

  -- Recalcular métricas para cada fase involucrada
  FOREACH fase_id IN ARRAY fases_a_actualizar
  LOOP
    IF fase_id IS NOT NULL THEN
      -- Obtener total real vendido
      SELECT COALESCE(SUM("cantidadTickets"), 0)
      INTO total_vendidos
      FROM public."mVenta"
      WHERE "idFaseEvento" = fase_id;

      -- Obtener límite configurado
      SELECT "limite"
      INTO limite_fase
      FROM public."cFaseEvento"
      WHERE "idFase" = fase_id;

      -- Actualizar cFaseEvento: si llega al límite pasa a TRUE, si no, respeta el valor existente (manual)
      UPDATE public."cFaseEvento"
      SET
        "cantidadVendida" = total_vendidos,
        "soldout" = CASE
          WHEN limite_fase IS NOT NULL AND limite_fase > 0 AND total_vendidos >= limite_fase THEN TRUE
          ELSE soldout
        END
      WHERE "idFase" = fase_id;
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
