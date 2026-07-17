-- Ejecutar en Supabase después de crear public."tGaleria".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'galeria-eventos',
  'galeria-eventos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public."tGaleria" enable row level security;

drop policy if exists "Public can read active gallery" on public."tGaleria";
create policy "Public can read active gallery"
  on public."tGaleria" for select to anon using (activo = true);

drop policy if exists "Authenticated users manage gallery" on public."tGaleria";
create policy "Authenticated users manage gallery"
  on public."tGaleria" for all to authenticated using (true) with check (true);

drop policy if exists "Public can view gallery files" on storage.objects;
create policy "Public can view gallery files"
  on storage.objects for select to public using (bucket_id = 'galeria-eventos');

drop policy if exists "Authenticated users upload gallery files" on storage.objects;
create policy "Authenticated users upload gallery files"
  on storage.objects for insert to authenticated with check (bucket_id = 'galeria-eventos');

drop policy if exists "Authenticated users update gallery files" on storage.objects;
create policy "Authenticated users update gallery files"
  on storage.objects for update to authenticated using (bucket_id = 'galeria-eventos');

drop policy if exists "Authenticated users delete gallery files" on storage.objects;
create policy "Authenticated users delete gallery files"
  on storage.objects for delete to authenticated using (bucket_id = 'galeria-eventos');

grant select on public."tGaleria" to anon;
grant select, insert, update, delete on public."tGaleria" to authenticated;
grant usage, select on sequence public."tGaleria_id_seq" to authenticated;
