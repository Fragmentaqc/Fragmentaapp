begin;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self_check check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create policy "Users can read their blocks"
on public.user_blocks for select to authenticated
using (blocker_id = (select auth.uid()));

create policy "Users can create their blocks"
on public.user_blocks for insert to authenticated
with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));

create policy "Users can delete their blocks"
on public.user_blocks for delete to authenticated
using (blocker_id = (select auth.uid()));

revoke all on table public.user_blocks from anon, authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;

create or replace function public.hidden_user_ids()
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select case
    when blocker_id = (select auth.uid()) then blocked_id
    else blocker_id
  end
  from public.user_blocks
  where blocker_id = (select auth.uid()) or blocked_id = (select auth.uid());
$$;

revoke all on function public.hidden_user_ids() from public, anon;
grant execute on function public.hidden_user_ids() to authenticated;

commit;
