begin;

update public.adventures
set status = 'preparation'
where status is null
   or status not in ('preparation', 'active', 'completed');

alter table public.adventures
  alter column status set default 'preparation',
  alter column status set not null;

alter table public.adventures
  drop constraint if exists adventures_status_check;

alter table public.adventures
  add constraint adventures_status_check
  check (status in ('preparation', 'active', 'completed'));

create index if not exists adventures_status_created_at_idx
  on public.adventures (status, created_at desc);

grant update (status)
  on table public.adventures to authenticated;

commit;
