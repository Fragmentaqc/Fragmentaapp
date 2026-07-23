begin;

alter table public.reports
  add column if not exists evidence jsonb not null default '{}'::jsonb;

alter table public.reports drop constraint if exists reports_evidence_object_check;
alter table public.reports add constraint reports_evidence_object_check
  check (jsonb_typeof(evidence) = 'object');

create or replace function public.capture_report_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.adventure_id is not null then
    select jsonb_build_object('type', 'adventure', 'id', a.id, 'owner_id', a.owner_id,
      'title', a.title, 'description', a.description, 'captured_at', now())
    into new.evidence from public.adventures a where a.id = new.adventure_id;
  elsif new.curiosity_id is not null then
    select jsonb_build_object('type', 'curiosity', 'id', c.id, 'owner_id', c.owner_id,
      'title', c.title, 'description', c.description, 'captured_at', now())
    into new.evidence from public.curiosities c where c.id = new.curiosity_id;
  elsif new.reported_user_id is not null then
    select jsonb_build_object('type', 'profile', 'id', p.id, 'display_name', p.display_name,
      'username', p.username, 'bio', p.bio, 'captured_at', now())
    into new.evidence from public.profiles p where p.id = new.reported_user_id;
  elsif new.message_id is not null then
    select jsonb_build_object('type', 'message', 'id', m.id, 'conversation_id', m.conversation_id,
      'sender_id', m.sender_id, 'body', m.body, 'created_at', m.created_at, 'captured_at', now())
    into new.evidence from public.messages m where m.id = new.message_id;
  end if;

  if new.evidence is null or new.evidence = '{}'::jsonb then
    raise exception 'Report target unavailable';
  end if;
  return new;
end;
$$;

revoke all on function public.capture_report_evidence() from public, anon, authenticated;
drop trigger if exists reports_capture_evidence on public.reports;
create trigger reports_capture_evidence before insert on public.reports
for each row execute function public.capture_report_evidence();

drop policy if exists "Reports require a visible external target" on public.reports;
create policy "Reports require a visible external target"
on public.reports as restrictive for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and (
    (adventure_id is not null and exists (
      select 1 from public.adventures a
      where a.id = reports.adventure_id and a.owner_id <> (select auth.uid())
    ))
    or (curiosity_id is not null and exists (
      select 1 from public.curiosities c
      where c.id = reports.curiosity_id and c.owner_id <> (select auth.uid())
    ))
    or (reported_user_id is not null and reported_user_id <> (select auth.uid()))
    or (message_id is not null)
  )
);

create or replace function public.review_report(
  target_report_id uuid,
  target_status text,
  review_note text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
  clean_note text := trim(coalesce(review_note, ''));
begin
  if not (select public.is_moderator()) then
    raise exception 'Moderator access required';
  end if;
  if target_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status';
  end if;
  if char_length(clean_note) > 1000 then
    raise exception 'Moderation note too long';
  end if;

  select status into current_status from public.reports
  where id = target_report_id for update;
  if current_status is null then raise exception 'Report not found'; end if;
  if current_status in ('resolved', 'dismissed') then
    raise exception 'Closed report cannot be changed';
  end if;
  if current_status = target_status then return true; end if;

  update public.reports
  set status = target_status, reviewed_at = now(), moderation_note = clean_note
  where id = target_report_id;
  return found;
end;
$$;

revoke all on function public.review_report(uuid, text, text) from public, anon;
grant execute on function public.review_report(uuid, text, text) to authenticated;
revoke update on table public.reports from authenticated;
revoke update (status, reviewed_at, moderation_note) on table public.reports from authenticated;

create or replace function public.log_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.moderation_logs (report_id, moderator_id, old_status, new_status, note)
    values (new.id, (select auth.uid()), old.status, new.status, new.moderation_note);
  end if;
  return new;
end;
$$;

revoke all on function public.log_report_status_change() from public, anon, authenticated;
grant select (evidence) on table public.reports to authenticated;

commit;
