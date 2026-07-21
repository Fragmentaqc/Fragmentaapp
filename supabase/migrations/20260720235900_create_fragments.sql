begin;

create table if not exists public.fragments (
  id uuid primary key default gen_random_uuid(),
  adventure_id uuid not null references public.adventures(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  occurred_at timestamptz,
  latitude double precision,
  longitude double precision,
  position integer not null default 0,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fragments_status_check check (status in ('draft', 'published')),
  constraint fragments_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint fragments_longitude_check check (longitude is null or longitude between -180 and 180),
  constraint fragments_position_check check (position >= 0)
);

create table if not exists public.fragment_images (
  id uuid primary key default gen_random_uuid(),
  fragment_id uuid not null references public.fragments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint fragment_images_position_check check (position >= 0)
);

alter table public.fragments enable row level security;
alter table public.fragment_images enable row level security;

create policy "Readable fragments follow their adventure"
on public.fragments for select to anon, authenticated
using (
  exists (
    select 1 from public.adventures
    where adventures.id = fragments.adventure_id
      and (
        adventures.owner_id = (select auth.uid())
        or (
          fragments.status = 'published'
          and adventures.publication_status = 'published'
          and adventures.visibility = 'public'
        )
      )
  )
);

create policy "Owners can create fragments"
on public.fragments for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adventures
    where adventures.id = fragments.adventure_id
      and adventures.owner_id = (select auth.uid())
  )
);

create policy "Owners can update fragments"
on public.fragments for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adventures
    where adventures.id = fragments.adventure_id
      and adventures.owner_id = (select auth.uid())
  )
);

create policy "Owners can delete fragments"
on public.fragments for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "Readable fragment images follow their fragment"
on public.fragment_images for select to anon, authenticated
using (
  exists (
    select 1 from public.fragments
    join public.adventures on adventures.id = fragments.adventure_id
    where fragments.id = fragment_images.fragment_id
      and (
        fragments.owner_id = (select auth.uid())
        or (
          fragments.status = 'published'
          and adventures.publication_status = 'published'
          and adventures.visibility = 'public'
        )
      )
  )
);

create policy "Owners can create fragment images"
on public.fragment_images for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/' || fragment_id::text || '/%'
  and exists (
    select 1 from public.fragments
    where fragments.id = fragment_images.fragment_id
      and fragments.owner_id = (select auth.uid())
  )
);

create policy "Owners can update fragment images"
on public.fragment_images for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/' || fragment_id::text || '/%'
);

create policy "Owners can delete fragment images"
on public.fragment_images for delete to authenticated
using (owner_id = (select auth.uid()));

grant select on public.fragments, public.fragment_images to anon, authenticated;
grant insert, update, delete on public.fragments, public.fragment_images to authenticated;

create index if not exists fragments_adventure_position_idx
  on public.fragments (adventure_id, position, occurred_at);
create index if not exists fragments_owner_id_idx on public.fragments (owner_id);
create index if not exists fragment_images_fragment_position_idx
  on public.fragment_images (fragment_id, position);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fragment-images',
  'fragment-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their fragment images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fragment-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.fragments
    where fragments.id::text = (storage.foldername(name))[2]
      and fragments.owner_id = (select auth.uid())
  )
);

create policy "Users can update their fragment images"
on storage.objects for update to authenticated
using (
  bucket_id = 'fragment-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'fragment-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their fragment images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'fragment-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
