-- Table: public."tEventoMedia"
-- Description: Stores multimedia content (YouTube, SoundCloud, Spotify) associated with an event.

create table if not exists public."tEventoMedia" (
  id bigint generated always as identity primary key,
  id_evento bigint not null references public."mEvento"(idevento) on delete cascade,
  tipo text not null check (tipo in ('youtube', 'soundcloud', 'spotify')),
  url text not null,
  titulo text,
  artista text,
  orden integer not null default 0 check (orden >= 0),
  activo boolean not null default true,
  creado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now()
);

-- Index for fast retrieval by event and sorting
create index if not exists idx_evento_media_evento_orden
  on public."tEventoMedia" (id_evento, activo, orden, creado_en);

-- Trigger to update updated_at timestamp
create or replace function public.set_evento_media_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists set_evento_media_updated_at on public."tEventoMedia";
create trigger set_evento_media_updated_at
before update on public."tEventoMedia"
for each row execute function public.set_evento_media_updated_at();

-- Row Level Security (RLS)
alter table public."tEventoMedia" enable row level security;

-- Policies
drop policy if exists "Public can read active event media" on public."tEventoMedia";
create policy "Public can read active event media"
  on public."tEventoMedia" for select to anon
  using (activo = true);

drop policy if exists "Authenticated users can read event media" on public."tEventoMedia";
create policy "Authenticated users can read event media"
  on public."tEventoMedia" for select to authenticated
  using (true);

drop policy if exists "Authenticated users can insert event media" on public."tEventoMedia";
create policy "Authenticated users can insert event media"
  on public."tEventoMedia" for insert to authenticated
  with check (true);

drop policy if exists "Authenticated users can update event media" on public."tEventoMedia";
create policy "Authenticated users can update event media"
  on public."tEventoMedia" for update to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated users can delete event media" on public."tEventoMedia";
create policy "Authenticated users can delete event media"
  on public."tEventoMedia" for delete to authenticated
  using (true);

-- Permissions
grant select on public."tEventoMedia" to anon;
grant select, insert, update, delete on public."tEventoMedia" to authenticated;
grant usage, select on sequence public."tEventoMedia_id_seq" to authenticated;
