-- Crear tabla de perfiles de usuario
create table if not exists public."mPerfil" (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    nombre text,
    rol text not null default 'taquilla' check (rol in ('admin', 'taquilla')),
    creado_en timestamp with time zone not null default now(),
    actualizado_en timestamp with time zone not null default now()
);

-- Habilitar Row Level Security
alter table public."mPerfil" enable row level security;

-- 1. Lectura del propio perfil
drop policy if exists "Usuarios pueden leer su propio perfil" on public."mPerfil";
create policy "Usuarios pueden leer su propio perfil"
    on public."mPerfil"
    for select
    to authenticated
    using (auth.uid() = id);

-- 2. Admins pueden leer todos los perfiles
drop policy if exists "Admins pueden leer todos los perfiles" on public."mPerfil";
create policy "Admins pueden leer todos los perfiles"
    on public."mPerfil"
    for select
    to authenticated
    using (
        exists (
            select 1 from public."mPerfil"
            where id = auth.uid() and rol = 'admin'
        )
    );

-- 3. Admins pueden actualizar perfiles
drop policy if exists "Admins pueden actualizar perfiles" on public."mPerfil";
create policy "Admins pueden actualizar perfiles"
    on public."mPerfil"
    for update
    to authenticated
    using (
        exists (
            select 1 from public."mPerfil"
            where id = auth.uid() and rol = 'admin'
        )
    );

-- Trigger para registrar automáticamente nuevos usuarios de auth.users en mPerfil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public."mPerfil" (id, email, nombre, rol)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
        case 
            when new.email = 'validaciones@takeover.com' then 'taquilla'
            else 'admin'
        end
    )
    on conflict (id) do update
    set email = excluded.email;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Poblar perfiles para los usuarios existentes en auth.users
insert into public."mPerfil" (id, email, nombre, rol)
select 
    id, 
    email, 
    coalesce(raw_user_meta_data->>'nombre', split_part(email, '@', 1)),
    case 
        when email = 'validaciones@takeover.com' then 'taquilla'
        else 'admin'
    end
from auth.users
on conflict (id) do nothing;
