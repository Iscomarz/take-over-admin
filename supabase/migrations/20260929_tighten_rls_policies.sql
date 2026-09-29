-- =====================================================================
-- Migración: Blindar políticas RLS para rol viewer y taquilla
-- Fecha: 2026-09-29
-- =====================================================================

-- 1. Helper function para verificar permisos de taquilla/admin
CREATE OR REPLACE FUNCTION public.can_manage_tickets()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."mPerfil"
    WHERE id = auth.uid() AND rol IN ('admin', 'taquilla')
  );
$$;

-- 2. TABLA: mEvento
DROP POLICY IF EXISTS "Admin All Access mEvento" ON public."mEvento";
DROP POLICY IF EXISTS "mEvento authenticated insert" ON public."mEvento";
DROP POLICY IF EXISTS "mEvento authenticated update" ON public."mEvento";
DROP POLICY IF EXISTS "mEvento authenticated delete" ON public."mEvento";

CREATE POLICY "Admins pueden insertar eventos" ON public."mEvento"
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden actualizar eventos" ON public."mEvento"
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden eliminar eventos" ON public."mEvento"
  FOR DELETE TO authenticated USING (public.is_admin());

-- 3. TABLA: cFaseEvento
DROP POLICY IF EXISTS "Admin All Access cFaseEvento" ON public."cFaseEvento";
DROP POLICY IF EXISTS "cFaseEvento authenticated insert" ON public."cFaseEvento";
DROP POLICY IF EXISTS "cFaseEvento authenticated update" ON public."cFaseEvento";
DROP POLICY IF EXISTS "cFaseEvento authenticated delete" ON public."cFaseEvento";

CREATE POLICY "Admins pueden insertar fases" ON public."cFaseEvento"
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden actualizar fases" ON public."cFaseEvento"
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden eliminar fases" ON public."cFaseEvento"
  FOR DELETE TO authenticated USING (public.is_admin());

-- 4. TABLA: r_evento_genero
DROP POLICY IF EXISTS "Admin All Access r_evento_genero" ON public."r_evento_genero";

CREATE POLICY "Authenticated pueden leer r_evento_genero" ON public."r_evento_genero"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden mutar r_evento_genero" ON public."r_evento_genero"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. TABLA: team_member
DROP POLICY IF EXISTS "Admin All Access team_member" ON public."team_member";
DROP POLICY IF EXISTS "team_member authenticated insert" ON public."team_member";
DROP POLICY IF EXISTS "team_member authenticated update" ON public."team_member";
DROP POLICY IF EXISTS "team_member authenticated delete" ON public."team_member";

CREATE POLICY "Admins pueden insertar miembros" ON public."team_member"
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden actualizar miembros" ON public."team_member"
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden eliminar miembros" ON public."team_member"
  FOR DELETE TO authenticated USING (public.is_admin());

-- 6. TABLA: tEventoMedia
DROP POLICY IF EXISTS "Authenticated users can insert event media" ON public."tEventoMedia";
DROP POLICY IF EXISTS "Authenticated users can update event media" ON public."tEventoMedia";
DROP POLICY IF EXISTS "Authenticated users can delete event media" ON public."tEventoMedia";

CREATE POLICY "Admins pueden insertar event media" ON public."tEventoMedia"
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden actualizar event media" ON public."tEventoMedia"
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden eliminar event media" ON public."tEventoMedia"
  FOR DELETE TO authenticated USING (public.is_admin());

-- 7. TABLA: tSoundsTakeOver
DROP POLICY IF EXISTS "Admin All Access tSoundsTakeOver" ON public."tSoundsTakeOver";
DROP POLICY IF EXISTS "Authenticated users can insert sounds" ON public."tSoundsTakeOver";
DROP POLICY IF EXISTS "Authenticated users can update sounds" ON public."tSoundsTakeOver";
DROP POLICY IF EXISTS "Authenticated users can delete sounds" ON public."tSoundsTakeOver";

CREATE POLICY "Admins pueden insertar sounds" ON public."tSoundsTakeOver"
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden actualizar sounds" ON public."tSoundsTakeOver"
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins pueden eliminar sounds" ON public."tSoundsTakeOver"
  FOR DELETE TO authenticated USING (public.is_admin());

-- 8. TABLA: tGaleria
DROP POLICY IF EXISTS "Admin All Access tGaleria" ON public."tGaleria";
DROP POLICY IF EXISTS "Usuarios autenticados administran galeria" ON public."tGaleria";

CREATE POLICY "Authenticated pueden leer galeria" ON public."tGaleria"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden administrar galeria" ON public."tGaleria"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. TABLAS: venue y generos_musicales
DROP POLICY IF EXISTS "Admin All Access venue" ON public."venue";
CREATE POLICY "Authenticated pueden leer venues" ON public."venue"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden mutar venues" ON public."venue"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin All Access generos_musicales" ON public."generos_musicales";
CREATE POLICY "Authenticated pueden leer generos" ON public."generos_musicales"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden mutar generos" ON public."generos_musicales"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10. TABLAS: ticket y mVenta (permitir admin y taquilla, bloquear viewer)
DROP POLICY IF EXISTS "Admin All Access ticket" ON public."ticket";
CREATE POLICY "Authenticated pueden leer tickets" ON public."ticket"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff puede gestionar tickets" ON public."ticket"
  FOR ALL TO authenticated USING (public.can_manage_tickets()) WITH CHECK (public.can_manage_tickets());

DROP POLICY IF EXISTS "Admin All Access mVenta" ON public."mVenta";
CREATE POLICY "Authenticated pueden leer ventas" ON public."mVenta"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff puede gestionar ventas" ON public."mVenta"
  FOR ALL TO authenticated USING (public.can_manage_tickets()) WITH CHECK (public.can_manage_tickets());
