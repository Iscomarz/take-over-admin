-- ==============================================================================
-- FIX: Limpieza total de policies recursivas en public."mPerfil" (Error 42P17)
-- ==============================================================================

-- 1. Eliminar todas las políticas existentes en mPerfil para evitar recursión
drop policy if exists "Usuarios pueden leer su propio perfil" on public."mPerfil";
drop policy if exists "Admins pueden leer todos los perfiles" on public."mPerfil";
drop policy if exists "Admins pueden actualizar perfiles" on public."mPerfil";
drop policy if exists "allow_select_own_profile" on public."mPerfil";
drop policy if exists "allow_update_own_profile" on public."mPerfil";

-- 2. Asegurar que RLS esté habilitado
alter table public."mPerfil" enable row level security;

-- 3. Política directa: cada usuario autenticado solo lee su propia fila (CERO subqueries = CERO recursión)
create policy "allow_select_own_profile"
on public."mPerfil"
for select
to authenticated
using (auth.uid() = id);

-- 4. Política directa de actualización: cada usuario autenticado solo edita su propia fila
create policy "allow_update_own_profile"
on public."mPerfil"
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
