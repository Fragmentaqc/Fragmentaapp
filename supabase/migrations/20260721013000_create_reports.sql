begin;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  adventure_id uuid references public.adventures(id) on delete cascade,
  curiosity_id uuid references public.curiosities(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint reports_exactly_one_target_check check (
    num_nonnulls(adventure_id, curiosity_id, reported_user_id) = 1
  ),
  constraint reports_reason_check check (
    reason in ('spam', 'harassment', 'dangerous', 'false_information', 'inappropriate', 'other')
  ),
  constraint reports_status_check check (
    status in ('pending', 'reviewing', 'resolved', 'dismissed')
  ),
  constraint reports_details_length_check check (char_length(details) <= 1000),
  constraint reports_not_self_check check (reported_user_id is null or reported_user_id <> reporter_id)
);

alter table public.reports enable row level security;

create index if not exists reports_status_created_at_idx on public.reports (status, created_at);
create index if not exists reports_reporter_created_at_idx on public.reports (reporter_id, created_at desc);
create unique index if not exists reports_open_adventure_unique on public.reports (reporter_id, adventure_id) where adventure_id is not null and status in ('pending', 'reviewing');
create unique index if not exists reports_open_curiosity_unique on public.reports (reporter_id, curiosity_id) where curiosity_id is not null and status in ('pending', 'reviewing');
create unique index if not exists reports_open_user_unique on public.reports (reporter_id, reported_user_id) where reported_user_id is not null and status in ('pending', 'reviewing');

create policy "Reporters can read their reports"
on public.reports for select to authenticated
using (reporter_id = (select auth.uid()));

create policy "Users can create reports"
on public.reports for insert to authenticated
with check (reporter_id = (select auth.uid()));

revoke all on table public.reports from anon;
revoke all on table public.reports from authenticated;
grant select, insert on table public.reports to authenticated;

commit;
