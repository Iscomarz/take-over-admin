-- ==============================================================================
-- FIX: Infinite recursion on public."mPerfil" RLS policies (Error 42P17)
-- ==============================================================================

-- 1. Función security definer para comprobar admin sin disparar RLS recursivo
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public."mPerfil"
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- 2. Eliminar policies recursivas anteriores
drop policy if exists "Usuarios pueden leer su propio perfil" on public."mPerfil";
drop policy if exists "Admins pueden leer todos los perfiles" on public."mPerfil";
drop policy if exists "Admins pueden actualizar perfiles" on public."mPerfil";

-- 3. Policy para que cada usuario autenticado lea su propio perfil (no recursiva)
create policy "Usuarios pueden leer su propio perfil"
    on public."mPerfil"
    for select
    to authenticated
    using (auth.uid() = id);

-- 4. Admins pueden leer todos los perfiles usando la función security definer
create policy "Admins pueden leer todos los perfiles"
    on public."mPerfil"
    for select
    to authenticated
    using (public.is_admin());

-- 5. Admins pueden actualizar perfiles usando la función security definer
create policy "Admins pueden actualizar perfiles"
    on public."mPerfil"
    for update
    to authenticated
    using (public.is_admin());
