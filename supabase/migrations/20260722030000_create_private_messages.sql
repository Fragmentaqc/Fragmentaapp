begin;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_one uuid not null references public.profiles(id) on delete cascade,
  participant_two uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_distinct_participants check (participant_one <> participant_two),
  constraint conversations_sorted_participants check (participant_one::text < participant_two::text),
  unique (participant_one, participant_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists conversations_one_idx on public.conversations (participant_one, last_message_at desc);
create index if not exists conversations_two_idx on public.conversations (participant_two, last_message_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index if not exists messages_unread_idx on public.messages (conversation_id, sender_id, created_at) where read_at is null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Participants can read conversations" on public.conversations for select to authenticated
using ((select auth.uid()) in (participant_one, participant_two));

create policy "Participants can read messages" on public.messages for select to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = messages.conversation_id
    and (select auth.uid()) in (c.participant_one, c.participant_two)
));

create policy "Participants can send messages" on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.participant_one, c.participant_two)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = c.participant_one and b.blocked_id = c.participant_two)
           or (b.blocker_id = c.participant_two and b.blocked_id = c.participant_one)
      )
  )
);

create policy "Recipients can mark messages read" on public.messages for update to authenticated
using (sender_id <> (select auth.uid()) and exists (
  select 1 from public.conversations c where c.id = messages.conversation_id
  and (select auth.uid()) in (c.participant_one, c.participant_two)
))
with check (sender_id <> (select auth.uid()));

create or replace function public.touch_conversation_from_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
for each row execute function public.touch_conversation_from_message();

create or replace function public.get_or_create_direct_conversation(other_profile_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  first_id uuid;
  second_id uuid;
  conversation_id uuid;
begin
  if me is null or other_profile_id is null or me = other_profile_id then
    raise exception 'Conversation invalide';
  end if;
  if not exists (select 1 from public.profiles where id = other_profile_id) then
    raise exception 'Profil introuvable';
  end if;
  if exists (select 1 from public.user_blocks where (blocker_id = me and blocked_id = other_profile_id) or (blocker_id = other_profile_id and blocked_id = me)) then
    raise exception 'Conversation indisponible';
  end if;
  if me::text < other_profile_id::text then first_id := me; second_id := other_profile_id;
  else first_id := other_profile_id; second_id := me; end if;
  insert into public.conversations (participant_one, participant_two)
  values (first_id, second_id)
  on conflict (participant_one, participant_two) do update set participant_one = excluded.participant_one
  returning id into conversation_id;
  return conversation_id;
end;
$$;

revoke all on public.conversations, public.messages from anon;
grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

commit;
