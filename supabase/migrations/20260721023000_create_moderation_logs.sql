begin;

alter table public.reports
  add column if not exists moderation_note text not null default '';

alter table public.reports
  drop constraint if exists reports_moderation_note_length_check;

alter table public.reports
  add constraint reports_moderation_note_length_check
  check (char_length(moderation_note) <= 1000);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  moderator_id uuid references auth.users(id) on delete set null,
  old_status text not null,
  new_status text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint moderation_logs_old_status_check check (old_status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  constraint moderation_logs_new_status_check check (new_status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  constraint moderation_logs_note_length_check check (char_length(note) <= 1000)
);

alter table public.moderation_logs enable row level security;

create policy "Moderators can read moderation logs"
on public.moderation_logs for select to authenticated
using ((select public.is_moderator()));

revoke all on table public.moderation_logs from public, anon, authenticated;
grant select on table public.moderation_logs to authenticated;
grant update (status, reviewed_at, moderation_note) on table public.reports to authenticated;

create or replace function public.log_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.moderation_logs (
      report_id, moderator_id, old_status, new_status, note
    ) values (
      new.id, (select auth.uid()), old.status, new.status, new.moderation_note
    );
  end if;
  return new;
end;
$$;

revoke all on function public.log_report_status_change() from public, anon, authenticated;

drop trigger if exists log_report_status_change on public.reports;
create trigger log_report_status_change
after update of status on public.reports
for each row execute function public.log_report_status_change();

create index if not exists moderation_logs_report_created_at_idx
  on public.moderation_logs (report_id, created_at desc);

commit;
