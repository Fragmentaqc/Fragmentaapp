begin;

create table if not exists public.curiosity_verification_requests (
  id uuid primary key default gen_random_uuid(),
  curiosity_id uuid not null references public.curiosities(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  decision_note text not null default '',
  moderator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint curiosity_verification_status_check check (status in ('pending', 'approved', 'rejected')),
  constraint curiosity_verification_note_length_check check (char_length(decision_note) <= 1000)
);

alter table public.curiosity_verification_requests enable row level security;

create unique index if not exists curiosity_verification_pending_unique
  on public.curiosity_verification_requests (curiosity_id) where status = 'pending';
create index if not exists curiosity_verification_created_at_idx
  on public.curiosity_verification_requests (status, created_at);

create policy "Owners can read their verification requests"
on public.curiosity_verification_requests for select to authenticated
using (requester_id = (select auth.uid()));

create policy "Moderators can read verification requests"
on public.curiosity_verification_requests for select to authenticated
using ((select public.is_moderator()));

revoke all on table public.curiosity_verification_requests from public, anon, authenticated;
grant select on table public.curiosity_verification_requests to authenticated;

create or replace function public.request_curiosity_verification(target_curiosity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.curiosities
    where id = target_curiosity_id
      and owner_id = (select auth.uid())
      and status = 'published'
      and verification_status <> 'verified'
  ) then
    raise exception 'Published curiosity not found';
  end if;

  if exists (
    select 1 from public.curiosity_verification_requests
    where curiosity_id = target_curiosity_id and status = 'pending'
  ) then
    raise exception 'Verification already pending';
  end if;

  insert into public.curiosity_verification_requests (curiosity_id, requester_id)
  values (target_curiosity_id, (select auth.uid()));

end;
$$;

create or replace function public.review_curiosity_verification(request_id uuid, decision text, note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not (select public.is_moderator()) then raise exception 'Moderator access required'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Invalid decision'; end if;
  if decision = 'rejected' and char_length(trim(note)) = 0 then raise exception 'A rejection reason is required'; end if;

  update public.curiosity_verification_requests
  set status = decision, decision_note = trim(note), moderator_id = (select auth.uid()), reviewed_at = now()
  where id = request_id and status = 'pending'
  returning curiosity_id into target_id;

  if target_id is null then raise exception 'Pending request not found'; end if;

  update public.curiosities
  set verification_status = case when decision = 'approved' then 'verified' else 'unverified' end
  where id = target_id;
end;
$$;

revoke all on function public.request_curiosity_verification(uuid) from public, anon;
revoke all on function public.review_curiosity_verification(uuid, text, text) from public, anon;
grant execute on function public.request_curiosity_verification(uuid) to authenticated;
grant execute on function public.review_curiosity_verification(uuid, text, text) to authenticated;

commit;
