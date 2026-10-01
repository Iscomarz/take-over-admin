-- =====================================================================
-- Migración: Corregir asignación de fase para venta 715 y blindar guardar_pago_venta / insertaventa
-- Fecha: 2026-10-01
-- =====================================================================

-- 1. Reasignar venta 715 (monto $529.06 = 2 tickets de $250) a la fase correcta idFase = 85
UPDATE public."mVenta"
SET "idFaseEvento" = 85
WHERE idventa = 715 AND "idFaseEvento" = 84;

UPDATE public."ticket"
SET "idFase" = 85
WHERE "idVenta" = 715 AND "idFase" = 84;

-- Recalcular métricas de cantidadVendida y soldout para las fases afectadas
UPDATE public."cFaseEvento"
SET "cantidadVendida" = (
  SELECT COALESCE(SUM("cantidadTickets"), 0)
  FROM public."mVenta"
  WHERE "idFaseEvento" = 84
)
WHERE "idFase" = 84;

UPDATE public."cFaseEvento"
SET "cantidadVendida" = (
  SELECT COALESCE(SUM("cantidadTickets"), 0)
  FROM public."mVenta"
  WHERE "idFaseEvento" = 85
)
WHERE "idFase" = 85;

-- 2. Blindar guardar_pago_venta(numeric, text, integer, numeric, text, text)
CREATE OR REPLACE FUNCTION public.guardar_pago_venta(
  monto numeric, 
  idtransstripe text, 
  cliente_id integer, 
  cantidadt numeric, 
  descripcionfase text, 
  checkout_session_stripe text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  idPagoRealizado INT;
  idEventoActivo INT;
  idFaseCompra INT;
BEGIN
  -- Insertar pago
  INSERT INTO "mPago" ("cantidad", "fechaPago", "idFormaPago", "acreditado", "idTransaccionStripe", checkout_session) 
  VALUES (monto, now(), 3, false, idTransStripe, checkout_session_stripe)
  RETURNING idPago INTO idPagoRealizado;

  IF idPagoRealizado IS NULL THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', 'No se pudo obtener el ID del pago.');
  END IF;

  -- Obtener id del evento activo
  SELECT me.idevento INTO idEventoActivo
  FROM "mEvento" me
  WHERE me.activo = true
  ORDER BY me.idevento DESC LIMIT 1;

  IF idEventoActivo IS NULL THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', 'No se pudo obtener el ID del evento activo.');
  END IF;

  -- Obtener idFase de la compra:
  -- Preferir fase activa y no agotada más reciente, en caso de fases con el mismo nombre
  SELECT "idFase" INTO idFaseCompra
  FROM "cFaseEvento" cf
  WHERE "idEvento" = idEventoActivo 
    AND "nombreFace" = descripcionFase
    AND cf.activo = true 
    AND (cf.soldout IS NOT TRUE)
  ORDER BY "idFase" DESC LIMIT 1;

  -- Fallback si todas están agotadas o inactivas: tomar la más reciente creada
  IF idFaseCompra IS NULL THEN
    SELECT "idFase" INTO idFaseCompra
    FROM "cFaseEvento" cf
    WHERE "idEvento" = idEventoActivo 
      AND "nombreFace" = descripcionFase
    ORDER BY "idFase" DESC LIMIT 1;
  END IF;

  IF idFaseCompra IS NULL THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', 'No se pudo obtener el ID de la fase de la compra.');
  END IF;

  -- Insertar en "mVenta"
  INSERT INTO "mVenta" (cliente_id, "idEvento", "fechaVenta", "cantidadTickets", "idPago", "idFaseEvento", "idUsuario")
  VALUES (cliente_id, idEventoActivo, now(), cantidadT, idPagoRealizado, idFaseCompra, 'b2e2464a-cadf-4e5c-8ac9-851d6261f90c');

  RETURN JSON_BUILD_OBJECT('codigo', 0, 'mensaje', 'Pago y venta guardados exitosamente', 'idPago', idPagoRealizado);
EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', SQLERRM);
END;
$function$;

-- 3. Blindar guardar_pago_venta con nombre/correo
CREATE OR REPLACE FUNCTION public.guardar_pago_venta(
  monto numeric, 
  idtransstripe text, 
  nombrev character varying, 
  correov character varying, 
  cantidadt numeric, 
  descripcionfase text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  idPagoRealizado INT;
  idEventoActivo INT;
  idFaseCompra INT;
BEGIN
  INSERT INTO "mPago" ("cantidad", "fechaPago", "idFormaPago", "acreditado", "idTransaccionStripe") 
  VALUES (monto, now(), 3, false, idTransStripe)
  RETURNING idPago INTO idPagoRealizado;

  IF idPagoRealizado IS NULL THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', 'No se pudo obtener el ID del pago.');
  END IF;

  SELECT me.idevento INTO idEventoActivo
  FROM "mEvento" me
  WHERE me.activo = true
  ORDER BY me.idevento DESC LIMIT 1;

  IF idEventoActivo IS NULL THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', 'No se pudo obtener el ID del evento activo.');
  END IF;

  SELECT "idFase" INTO idFaseCompra
  FROM "cFaseEvento" cf
  WHERE "idEvento" = idEventoActivo 
    AND "nombreFace" = descripcionFase
    AND cf.activo = true 
    AND (cf.soldout IS NOT TRUE)
  ORDER BY "idFase" DESC LIMIT 1;

  IF idFaseCompra IS NULL THEN
    SELECT "idFase" INTO idFaseCompra
    FROM "cFaseEvento" cf
    WHERE "idEvento" = idEventoActivo 
      AND "nombreFace" = descripcionFase
    ORDER BY "idFase" DESC LIMIT 1;
  END IF;

  IF idFaseCompra IS NULL THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', 'No se pudo obtener el ID de la fase de la compra.');
  END IF;

  INSERT INTO "mVenta" (nombre, correo, "idEvento", "fechaVenta", "cantidadTickets", "idPago", "idFaseEvento", "idUsuario")
  VALUES (nombreV, correoV, idEventoActivo, now(), cantidadT, idPagoRealizado, idFaseCompra, 'b2e2464a-cadf-4e5c-8ac9-851d6261f90c');

  RETURN JSON_BUILD_OBJECT('codigo', 0, 'mensaje', 'Pago y venta guardados exitosamente', 'idPago', idPagoRealizado);
EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT('codigo', 1, 'mensaje', SQLERRM);
END;
$function$;

-- 4. Blindar insertaventa
CREATE OR REPLACE FUNCTION public.insertaventa(
  cliente_id integer, 
  cantidad integer, 
  idpagostripe text, 
  descripcionfase text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  idPagoRealizado INT;
  idFaseEve INT;
  idEventoActivo INT;
BEGIN
  SET TIME ZONE 'America/Chihuahua';

  SELECT idpago INTO idPagoRealizado
  FROM "mPago"
  WHERE "idTransaccionStripe" = idpagostripe;

  SELECT idevento INTO idEventoActivo
  FROM "mEvento"
  WHERE activo = true
  ORDER BY idevento DESC LIMIT 1; 

  SELECT "idFase" INTO idFaseEve
  FROM "cFaseEvento"
  WHERE "idEvento" = idEventoActivo 
    AND "nombreFace" = descripcionfase
    AND activo = true 
    AND (soldout IS NOT TRUE)
  ORDER BY "idFase" DESC LIMIT 1;

  IF idFaseEve IS NULL THEN
    SELECT "idFase" INTO idFaseEve
    FROM "cFaseEvento"
    WHERE "idEvento" = idEventoActivo AND "nombreFace" = descripcionfase
    ORDER BY "idFase" DESC LIMIT 1;
  END IF;

  INSERT INTO "mVenta" (
    cliente_id, 
    "idEvento", 
    "fechaVenta",
    "cantidadTickets", 
    "idPago", 
    "idFaseEvento", 
    "idUsuario"
  )
  VALUES (
    cliente_id, 
    idEventoActivo, 
    now(),
    cantidad, 
    idPagoRealizado, 
    idFaseEve, 
    'b2e2464a-cadf-4e5c-8ac9-851d6261f90c'
  );
END;
$function$;
