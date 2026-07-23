begin;

-- Centralise la regle de blocage. La fonction ne revele aucune liste de comptes.
create or replace function public.can_view_profile_content(content_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is null
    or content_owner_id = (select auth.uid())
    or not exists (
      select 1
      from public.user_blocks
      where (blocker_id = (select auth.uid()) and blocked_id = content_owner_id)
         or (blocker_id = content_owner_id and blocked_id = (select auth.uid()))
    );
$$;

revoke all on function public.can_view_profile_content(uuid) from public;
grant execute on function public.can_view_profile_content(uuid) to anon, authenticated;

drop policy if exists "Blocked profiles cannot be followed" on public.profile_follows;
create policy "Blocked profiles cannot be followed"
on public.profile_follows as restrictive for insert to authenticated
with check (
  follower_id = (select auth.uid())
  and (select public.can_view_profile_content(followed_id))
);

-- Aventures: proprietaire, public, ou abonne autorise. Un blocage gagne toujours.
drop policy if exists "Public adventures are readable" on public.adventures;
create policy "Public adventures are readable"
on public.adventures for select to public
using (
  owner_id = (select auth.uid())
  or (
    publication_status = 'published'
    and (select public.can_view_profile_content(owner_id))
    and (
      visibility = 'public'
      or (
        visibility = 'followers'
        and exists (
          select 1 from public.profile_follows
          where follower_id = (select auth.uid())
            and followed_id = adventures.owner_id
        )
      )
    )
  )
);

drop policy if exists "Content owner required to create adventures" on public.adventures;
create policy "Content owner required to create adventures"
on public.adventures as restrictive for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Content owner required to update adventures" on public.adventures;
create policy "Content owner required to update adventures"
on public.adventures as restrictive for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Content owner required to delete adventures" on public.adventures;
create policy "Content owner required to delete adventures"
on public.adventures as restrictive for delete to authenticated
using (owner_id = (select auth.uid()));

-- Curiosites: un brouillon reste prive et un blocage est applique par la base.
drop policy if exists "Published curiosities or owners are readable" on public.curiosities;
create policy "Published curiosities or owners are readable"
on public.curiosities as restrictive for select to public
using (
  owner_id = (select auth.uid())
  or (
    status = 'published'
    and (select public.can_view_profile_content(owner_id))
  )
);

drop policy if exists "Content owner required to create curiosities" on public.curiosities;
create policy "Content owner required to create curiosities"
on public.curiosities as restrictive for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Content owner required to update curiosities" on public.curiosities;
create policy "Content owner required to update curiosities"
on public.curiosities as restrictive for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Content owner required to delete curiosities" on public.curiosities;
create policy "Content owner required to delete curiosities"
on public.curiosities as restrictive for delete to authenticated
using (owner_id = (select auth.uid()));

-- Fragments: la visibilite suit exactement celle de l'aventure parente.
drop policy if exists "Readable fragments follow their adventure" on public.fragments;
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
          and (select public.can_view_profile_content(adventures.owner_id))
          and (
            adventures.visibility = 'public'
            or (
              adventures.visibility = 'followers'
              and exists (
                select 1 from public.profile_follows
                where follower_id = (select auth.uid())
                  and followed_id = adventures.owner_id
              )
            )
          )
        )
      )
  )
);

drop policy if exists "Content owner required to create fragments" on public.fragments;
create policy "Content owner required to create fragments"
on public.fragments as restrictive for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adventures
    where id = fragments.adventure_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Content owner required to update fragments" on public.fragments;
create policy "Content owner required to update fragments"
on public.fragments as restrictive for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adventures
    where id = fragments.adventure_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Content owner required to delete fragments" on public.fragments;
create policy "Content owner required to delete fragments"
on public.fragments as restrictive for delete to authenticated
using (owner_id = (select auth.uid()));

-- Metadonnees des images d'aventure.
drop policy if exists "Adventure images follow adventure visibility" on public.adventure_images;
create policy "Adventure images follow adventure visibility"
on public.adventure_images as restrictive for select to public
using (
  exists (
    select 1 from public.adventures
    where id = adventure_images.adventure_id
      and (
        owner_id = (select auth.uid())
        or (
          publication_status = 'published'
          and (select public.can_view_profile_content(owner_id))
          and (
            visibility = 'public'
            or (
              visibility = 'followers'
              and exists (
                select 1 from public.profile_follows
                where follower_id = (select auth.uid())
                  and followed_id = adventures.owner_id
              )
            )
          )
        )
      )
  )
);

drop policy if exists "Adventure image owner required to create" on public.adventure_images;
create policy "Adventure image owner required to create"
on public.adventure_images as restrictive for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/' || adventure_id::text || '/%'
  and exists (
    select 1 from public.adventures
    where id = adventure_images.adventure_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Adventure image owner required to update" on public.adventure_images;
create policy "Adventure image owner required to update"
on public.adventure_images as restrictive for update to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adventures
    where id = adventure_images.adventure_id
      and owner_id = (select auth.uid())
  )
)
with check (
  owner_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/' || adventure_id::text || '/%'
  and exists (
    select 1 from public.adventures
    where id = adventure_images.adventure_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Adventure image owner required to delete" on public.adventure_images;
create policy "Adventure image owner required to delete"
on public.adventure_images as restrictive for delete to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.adventures
    where id = adventure_images.adventure_id
      and owner_id = (select auth.uid())
  )
);

-- Metadonnees des images de fragment.
drop policy if exists "Readable fragment images follow their fragment" on public.fragment_images;
create policy "Readable fragment images follow their fragment"
on public.fragment_images for select to anon, authenticated
using (
  exists (
    select 1
    from public.fragments
    join public.adventures on adventures.id = fragments.adventure_id
    where fragments.id = fragment_images.fragment_id
      and (
        fragments.owner_id = (select auth.uid())
        or (
          fragments.status = 'published'
          and adventures.publication_status = 'published'
          and (select public.can_view_profile_content(adventures.owner_id))
          and (
            adventures.visibility = 'public'
            or (
              adventures.visibility = 'followers'
              and exists (
                select 1 from public.profile_follows
                where follower_id = (select auth.uid())
                  and followed_id = adventures.owner_id
              )
            )
          )
        )
      )
  )
);

drop policy if exists "Fragment image owner required to create" on public.fragment_images;
create policy "Fragment image owner required to create"
on public.fragment_images as restrictive for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/' || fragment_id::text || '/%'
  and exists (
    select 1 from public.fragments
    where id = fragment_images.fragment_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Fragment image owner required to update" on public.fragment_images;
create policy "Fragment image owner required to update"
on public.fragment_images as restrictive for update to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.fragments
    where id = fragment_images.fragment_id
      and owner_id = (select auth.uid())
  )
)
with check (
  owner_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/' || fragment_id::text || '/%'
  and exists (
    select 1 from public.fragments
    where id = fragment_images.fragment_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Fragment image owner required to delete" on public.fragment_images;
create policy "Fragment image owner required to delete"
on public.fragment_images as restrictive for delete to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.fragments
    where id = fragment_images.fragment_id
      and owner_id = (select auth.uid())
  )
);

-- Les images de curiosite n'ont pas de owner_id: la curiosite parente fait foi.
drop policy if exists "Curiosity images follow curiosity visibility" on public.curiosity_images;
create policy "Curiosity images follow curiosity visibility"
on public.curiosity_images as restrictive for select to public
using (
  exists (
    select 1 from public.curiosities
    where id = curiosity_images.curiosity_id
      and (
        owner_id = (select auth.uid())
        or (
          status = 'published'
          and (select public.can_view_profile_content(owner_id))
        )
      )
  )
);

drop policy if exists "Curiosity owner required to create images" on public.curiosity_images;
create policy "Curiosity owner required to create images"
on public.curiosity_images as restrictive for insert to authenticated
with check (
  exists (
    select 1 from public.curiosities
    where id = curiosity_images.curiosity_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Curiosity owner required to update images" on public.curiosity_images;
create policy "Curiosity owner required to update images"
on public.curiosity_images as restrictive for update to authenticated
using (
  exists (
    select 1 from public.curiosities
    where id = curiosity_images.curiosity_id
      and owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.curiosities
    where id = curiosity_images.curiosity_id
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "Curiosity owner required to delete images" on public.curiosity_images;
create policy "Curiosity owner required to delete images"
on public.curiosity_images as restrictive for delete to authenticated
using (
  exists (
    select 1 from public.curiosities
    where id = curiosity_images.curiosity_id
      and owner_id = (select auth.uid())
  )
);

commit;
