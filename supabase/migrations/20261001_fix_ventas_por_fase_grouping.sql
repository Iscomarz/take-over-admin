-- =====================================================================
-- Migración: Agrupar ventas por idFase y precio en vez de solo por nombre
-- Incluye todas las fases configuradas del evento mediante LEFT JOIN
-- Fecha: 2026-10-01
-- =====================================================================

DROP FUNCTION IF EXISTS public.ventas_por_fase(integer);

CREATE OR REPLACE FUNCTION public.ventas_por_fase(evento_id integer)
RETURNS TABLE(id_fase bigint, nombre_fase text, precio numeric, cantidad bigint, monto numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select 
    f."idFase" as id_fase,
    f."nombreFace" as nombre_fase,
    f.precio,
    coalesce(sum(v."cantidadTickets"), 0)::bigint as cantidad,
    coalesce(sum(v."cantidadTickets" * f.precio), 0)::numeric as monto
  from "cFaseEvento" f
  left join "mVenta" v on v."idFaseEvento" = f."idFase" and v."idEvento" = evento_id
  where f."idEvento" = evento_id
  group by f."idFase", f."nombreFace", f.precio
  order by f.precio asc, f."idFase" asc;
$function$;

GRANT EXECUTE ON FUNCTION public.ventas_por_fase(integer) TO anon, authenticated, service_role;
