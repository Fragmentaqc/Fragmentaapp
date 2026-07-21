begin;

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  adventure_id uuid references public.adventures(id) on delete cascade,
  curiosity_id uuid references public.curiosities(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_exactly_one_content_check check (
    (adventure_id is not null and curiosity_id is null)
    or (adventure_id is null and curiosity_id is not null)
  )
);

alter table public.favorites enable row level security;

create unique index if not exists favorites_owner_adventure_unique
  on public.favorites (owner_id, adventure_id) where adventure_id is not null;
create unique index if not exists favorites_owner_curiosity_unique
  on public.favorites (owner_id, curiosity_id) where curiosity_id is not null;
create index if not exists favorites_owner_created_at_idx
  on public.favorites (owner_id, created_at desc);

create policy "Owners can read their favorites"
on public.favorites for select to authenticated
using (owner_id = (select auth.uid()));

create policy "Owners can create favorites"
on public.favorites for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    (adventure_id is not null and exists (
      select 1 from public.adventures
      where adventures.id = favorites.adventure_id
        and (adventures.owner_id = (select auth.uid()) or (adventures.publication_status = 'published' and adventures.visibility = 'public'))
    ))
    or
    (curiosity_id is not null and exists (
      select 1 from public.curiosities
      where curiosities.id = favorites.curiosity_id
        and (curiosities.owner_id = (select auth.uid()) or curiosities.status = 'published')
    ))
  )
);

create policy "Owners can delete their favorites"
on public.favorites for delete to authenticated
using (owner_id = (select auth.uid()));

revoke all on table public.favorites from anon;
revoke all on table public.favorites from authenticated;
grant select, insert, delete on table public.favorites to authenticated;

commit;
