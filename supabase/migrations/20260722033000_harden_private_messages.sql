begin;

alter table public.messages add column if not exists deleted_at timestamptz;

create table if not exists public.hidden_conversations (
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

alter table public.hidden_conversations enable row level security;
create policy "Users manage hidden conversations" on public.hidden_conversations for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and exists (
  select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.participant_one, c.participant_two)
));
grant select, insert, delete on public.hidden_conversations to authenticated;
grant update (hidden_at) on public.hidden_conversations to authenticated;

create or replace function public.delete_own_message(target_message_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.messages set deleted_at = now()
  where id = target_message_id and sender_id = auth.uid() and deleted_at is null;
  return found;
end;
$$;
revoke all on function public.delete_own_message(uuid) from public, anon;
grant execute on function public.delete_own_message(uuid) to authenticated;

alter table public.reports add column if not exists message_id uuid references public.messages(id) on delete set null;
alter table public.reports drop constraint if exists reports_exactly_one_target_check;
alter table public.reports add constraint reports_exactly_one_target_check check (
  num_nonnulls(adventure_id, curiosity_id, reported_user_id, message_id) = 1
);
create unique index if not exists reports_open_message_unique on public.reports (reporter_id, message_id) where message_id is not null and status in ('pending', 'reviewing');

create or replace function public.reveal_conversation_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.hidden_conversations where conversation_id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists messages_reveal_conversation on public.messages;
create trigger messages_reveal_conversation after insert on public.messages
for each row execute function public.reveal_conversation_on_message();

commit;
