begin;

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'moderator', 'admin'));

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('moderator', 'admin')
  );
$$;

revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

create policy "Moderators can read all reports"
on public.reports for select to authenticated
using ((select public.is_moderator()));

create policy "Moderators can update reports"
on public.reports for update to authenticated
using ((select public.is_moderator()))
with check ((select public.is_moderator()));

grant update (status, reviewed_at)
  on table public.reports to authenticated;

create index if not exists profiles_role_idx
  on public.profiles (role)
  where role in ('moderator', 'admin');

commit;
