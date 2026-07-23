begin;

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  adventure_id uuid references public.adventures(id) on delete cascade,
  curiosity_id uuid references public.curiosities(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint collection_items_exactly_one_check check (
    (adventure_id is not null and curiosity_id is null)
    or (adventure_id is null and curiosity_id is not null)
  )
);

create index if not exists collections_owner_created_idx on public.collections (owner_id, created_at desc);
create unique index if not exists collection_items_adventure_unique on public.collection_items (collection_id, adventure_id) where adventure_id is not null;
create unique index if not exists collection_items_curiosity_unique on public.collection_items (collection_id, curiosity_id) where curiosity_id is not null;

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

create policy "Collections are visible to their owner or publicly"
on public.collections for select
using (is_public or owner_id = (select auth.uid()));

create policy "Owners can create collections"
on public.collections for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "Owners can update collections"
on public.collections for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Owners can delete collections"
on public.collections for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "Collection items follow collection visibility"
on public.collection_items for select
using (exists (
  select 1 from public.collections
  where collections.id = collection_items.collection_id
    and (collections.is_public or collections.owner_id = (select auth.uid()))
));

create policy "Owners can add collection items"
on public.collection_items for insert to authenticated
with check (exists (
  select 1 from public.collections
  where collections.id = collection_items.collection_id
    and collections.owner_id = (select auth.uid())
));

create policy "Owners can remove collection items"
on public.collection_items for delete to authenticated
using (exists (
  select 1 from public.collections
  where collections.id = collection_items.collection_id
    and collections.owner_id = (select auth.uid())
));

grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, delete on public.collection_items to authenticated;
grant select on public.collections, public.collection_items to anon;

commit;
