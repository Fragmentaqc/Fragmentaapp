alter table public.profiles
  add column if not exists social_links jsonb not null default '[]'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_social_links_is_array;

alter table public.profiles
  add constraint profiles_social_links_is_array
  check (
    jsonb_typeof(social_links) = 'array'
    and jsonb_array_length(social_links) <= 20
  );

grant select (social_links) on table public.profiles to anon, authenticated;
grant insert (social_links) on table public.profiles to authenticated;
grant update (social_links) on table public.profiles to authenticated;
