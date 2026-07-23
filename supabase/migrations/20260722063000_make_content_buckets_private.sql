begin;

alter table public.curiosity_images
  add column if not exists storage_path text;

-- Recupere le chemin des images deja creees depuis leur ancienne URL publique.
update public.curiosity_images
set storage_path = regexp_replace(
  image_url,
  '^.*/storage/v1/object/public/curiosity-images/',
  ''
)
where storage_path is null
  and image_url like '%/storage/v1/object/public/curiosity-images/%';

grant select (storage_path) on public.curiosity_images to anon, authenticated;
grant insert (storage_path) on public.curiosity_images to authenticated;

update storage.buckets
set public = false
where id in ('adventure-images', 'curiosity-images', 'fragment-images');

-- Politique permissive necessaire pour creer les liens temporaires.
drop policy if exists "Visible content images can be downloaded" on storage.objects;
create policy "Visible content images can be downloaded"
on storage.objects for select to anon, authenticated
using (
  (
    bucket_id = 'adventure-images'
    and exists (
      select 1 from public.adventures a
      where a.id::text = (storage.foldername(name))[2]
        and a.owner_id::text = (storage.foldername(name))[1]
    )
  )
  or (
    bucket_id = 'fragment-images'
    and exists (
      select 1 from public.fragments f
      where f.id::text = (storage.foldername(name))[2]
        and f.owner_id::text = (storage.foldername(name))[1]
    )
  )
  or (
    bucket_id = 'curiosity-images'
    and exists (
      select 1 from public.curiosities c
      where c.id::text = (storage.foldername(name))[2]
        and c.owner_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Meme si une ancienne politique trop large subsiste, celle-ci impose la
-- visibilite des tables parentes. Les autres buckets ne sont pas affectes.
drop policy if exists "Content image downloads follow parent visibility" on storage.objects;
create policy "Content image downloads follow parent visibility"
on storage.objects as restrictive for select to anon, authenticated
using (
  bucket_id not in ('adventure-images', 'curiosity-images', 'fragment-images')
  or (
    bucket_id = 'adventure-images'
    and exists (
      select 1 from public.adventures a
      where a.id::text = (storage.foldername(name))[2]
        and a.owner_id::text = (storage.foldername(name))[1]
    )
  )
  or (
    bucket_id = 'fragment-images'
    and exists (
      select 1 from public.fragments f
      where f.id::text = (storage.foldername(name))[2]
        and f.owner_id::text = (storage.foldername(name))[1]
    )
  )
  or (
    bucket_id = 'curiosity-images'
    and exists (
      select 1 from public.curiosities c
      where c.id::text = (storage.foldername(name))[2]
        and c.owner_id::text = (storage.foldername(name))[1]
    )
  )
);

drop policy if exists "Content image uploads require ownership" on storage.objects;
create policy "Content image uploads require ownership"
on storage.objects as restrictive for insert to authenticated
with check (
  bucket_id not in ('adventure-images', 'curiosity-images', 'fragment-images')
  or (
    (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      (bucket_id = 'adventure-images' and exists (
        select 1 from public.adventures a
        where a.id::text = (storage.foldername(name))[2]
          and a.owner_id = (select auth.uid())
      ))
      or (bucket_id = 'fragment-images' and exists (
        select 1 from public.fragments f
        where f.id::text = (storage.foldername(name))[2]
          and f.owner_id = (select auth.uid())
      ))
      or (bucket_id = 'curiosity-images' and exists (
        select 1 from public.curiosities c
        where c.id::text = (storage.foldername(name))[2]
          and c.owner_id = (select auth.uid())
      ))
    )
  )
);

drop policy if exists "Content image updates require ownership" on storage.objects;
create policy "Content image updates require ownership"
on storage.objects as restrictive for update to authenticated
using (
  bucket_id not in ('adventure-images', 'curiosity-images', 'fragment-images')
  or (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id not in ('adventure-images', 'curiosity-images', 'fragment-images')
  or (
    (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      (bucket_id = 'adventure-images' and exists (
        select 1 from public.adventures a
        where a.id::text = (storage.foldername(name))[2]
          and a.owner_id = (select auth.uid())
      ))
      or (bucket_id = 'fragment-images' and exists (
        select 1 from public.fragments f
        where f.id::text = (storage.foldername(name))[2]
          and f.owner_id = (select auth.uid())
      ))
      or (bucket_id = 'curiosity-images' and exists (
        select 1 from public.curiosities c
        where c.id::text = (storage.foldername(name))[2]
          and c.owner_id = (select auth.uid())
      ))
    )
  )
);

drop policy if exists "Content image deletes require ownership" on storage.objects;
create policy "Content image deletes require ownership"
on storage.objects as restrictive for delete to authenticated
using (
  bucket_id not in ('adventure-images', 'curiosity-images', 'fragment-images')
  or (
    (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      (bucket_id = 'adventure-images' and exists (
        select 1 from public.adventures a
        where a.id::text = (storage.foldername(name))[2]
          and a.owner_id = (select auth.uid())
      ))
      or (bucket_id = 'fragment-images' and exists (
        select 1 from public.fragments f
        where f.id::text = (storage.foldername(name))[2]
          and f.owner_id = (select auth.uid())
      ))
      or (bucket_id = 'curiosity-images' and exists (
        select 1 from public.curiosities c
        where c.id::text = (storage.foldername(name))[2]
          and c.owner_id = (select auth.uid())
      ))
    )
  )
);

commit;
