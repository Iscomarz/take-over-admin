-- Asegurar que las funciones de base de datos que registran ventas se ejecuten con SECURITY DEFINER
-- para que nunca sean bloqueadas por políticas RLS, sin importar desde dónde se invoquen.

ALTER FUNCTION public.guardar_pago_venta(numeric, text, integer, numeric, text, text) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.guardar_pago_venta(numeric, text, character varying, character varying, numeric, text) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.insertaventa(integer, integer, text, text) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.insertaventa(text, text, integer, text, text) SECURITY DEFINER SET search_path = public;
