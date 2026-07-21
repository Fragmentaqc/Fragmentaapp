begin;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists adult_confirmed_at timestamptz;

grant insert (terms_accepted_at, terms_version, adult_confirmed_at)
  on table public.profiles to authenticated;

commit;
