alter table public.profiles
  add column if not exists cover_url text;

grant select (cover_url) on table public.profiles to anon, authenticated;
grant insert (cover_url) on table public.profiles to authenticated;
grant update (cover_url) on table public.profiles to authenticated;
