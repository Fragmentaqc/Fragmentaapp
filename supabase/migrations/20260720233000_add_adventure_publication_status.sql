-- Séparer la progression d'une aventure de son état de publication.
alter table public.adventures
  add column if not exists publication_status text
  not null default 'published';

alter table public.adventures
  drop constraint if exists adventures_publication_status_check;

alter table public.adventures
  add constraint adventures_publication_status_check
  check (publication_status in ('draft', 'published'));

create index if not exists adventures_publication_status_created_at_idx
  on public.adventures (publication_status, created_at desc);

-- Les contenus existants restent publiés. Un brouillon est visible uniquement
-- par son propriétaire, même si sa visibilité est publique.
drop policy if exists "Public adventures are readable"
  on public.adventures;

create policy "Public adventures are readable"
on public.adventures
for select
to public
using (
  owner_id = (select auth.uid())
  or (
    publication_status = 'published'
    and visibility = 'public'
  )
);

grant insert (publication_status)
  on table public.adventures to authenticated;

grant update (publication_status)
  on table public.adventures to authenticated;
