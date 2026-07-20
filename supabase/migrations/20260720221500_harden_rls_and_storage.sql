-- Fragmenta — durcissement initial de Supabase
-- Cette migration préserve les données existantes et resserre uniquement
-- les droits, les politiques RLS, les buckets et les index.

begin;

-- Une ancienne politique autorise la lecture de toutes les aventures et
-- annule la politique qui protège les aventures privées.
drop policy if exists "Everyone can view adventures"
  on public.adventures;

-- Les colonnes de paiement et de vérification ne doivent jamais être
-- lisibles ou modifiables directement par l'application cliente.
revoke select on table public.profiles from anon, authenticated;
grant select (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  country,
  created_at,
  updated_at
) on table public.profiles to anon, authenticated;

revoke insert on table public.profiles from authenticated;
grant insert (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  country,
  updated_at
) on table public.profiles to authenticated;

revoke update on table public.profiles from authenticated;
grant update (
  username,
  display_name,
  bio,
  avatar_url,
  country,
  updated_at
) on table public.profiles to authenticated;

-- Le statut de vérification appartient au processus de modération.
-- Un propriétaire peut modifier le contenu et son état de publication,
-- mais pas s'auto-confirmer ou s'auto-vérifier.
revoke insert on table public.curiosities from authenticated;
grant insert (
  owner_id,
  adventure_id,
  title,
  description,
  category,
  location_name,
  address,
  latitude,
  longitude,
  accessibility,
  best_time_to_visit,
  recommended_duration,
  status
) on table public.curiosities to authenticated;

-- Une curiosité ne peut être rattachée qu'à une aventure appartenant au
-- même utilisateur. Cela évite les associations forgées via l'API.
drop policy if exists "Authenticated users can create curiosities"
  on public.curiosities;
drop policy if exists "Owners can update curiosities"
  on public.curiosities;

create policy "Owners can create curiosities"
on public.curiosities
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    adventure_id is null
    or exists (
      select 1
      from public.adventures
      where adventures.id = curiosities.adventure_id
        and adventures.owner_id = (select auth.uid())
    )
  )
);

create policy "Owners can update curiosities"
on public.curiosities
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (
    adventure_id is null
    or exists (
      select 1
      from public.adventures
      where adventures.id = curiosities.adventure_id
        and adventures.owner_id = (select auth.uid())
    )
  )
);

revoke update on table public.curiosities from authenticated;
grant update (
  adventure_id,
  title,
  description,
  category,
  location_name,
  address,
  latitude,
  longitude,
  accessibility,
  best_time_to_visit,
  recommended_duration,
  status,
  updated_at
) on table public.curiosities to authenticated;

-- Une image d'aventure doit appartenir au propriétaire de l'aventure et
-- son chemin Storage doit rester dans son dossier utilisateur/aventure.
drop policy if exists "Users can create adventure images"
  on public.adventure_images;
drop policy if exists "Users can update adventure images"
  on public.adventure_images;
drop policy if exists "Users can delete adventure images"
  on public.adventure_images;

create policy "Owners can create adventure images"
on public.adventure_images
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and storage_path like
    (select auth.uid())::text || '/' || adventure_id::text || '/%'
  and exists (
    select 1
    from public.adventures
    where adventures.id = adventure_images.adventure_id
      and adventures.owner_id = (select auth.uid())
  )
);

create policy "Owners can update adventure images"
on public.adventure_images
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.adventures
    where adventures.id = adventure_images.adventure_id
      and adventures.owner_id = (select auth.uid())
  )
)
with check (
  owner_id = (select auth.uid())
  and storage_path like
    (select auth.uid())::text || '/' || adventure_id::text || '/%'
  and exists (
    select 1
    from public.adventures
    where adventures.id = adventure_images.adventure_id
      and adventures.owner_id = (select auth.uid())
  )
);

create policy "Owners can delete adventure images"
on public.adventure_images
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.adventures
    where adventures.id = adventure_images.adventure_id
      and adventures.owner_id = (select auth.uid())
  )
);

-- Harmoniser les limites et types MIME avec ceux envoyés par l'application.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
where id in ('adventure-images', 'curiosity-images');

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png'
  ]
where id = 'avatars';

-- Index utilisés par les politiques RLS et les listes principales.
create index if not exists adventures_owner_id_idx
  on public.adventures (owner_id);
create index if not exists adventures_created_at_idx
  on public.adventures (created_at desc);
create index if not exists adventure_images_adventure_position_idx
  on public.adventure_images (adventure_id, position);
create index if not exists curiosities_owner_id_idx
  on public.curiosities (owner_id);
create index if not exists curiosities_status_created_at_idx
  on public.curiosities (status, created_at desc);
create index if not exists curiosity_images_curiosity_position_idx
  on public.curiosity_images (curiosity_id, position);

commit;
