begin;

-- Un blocage dans un sens ou l'autre interdit tout nouveau message,
-- y compris dans une conversation creee avant le blocage.
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.participant_one, c.participant_two)
      and (select public.can_view_profile_content(
        case
          when c.participant_one = (select auth.uid()) then c.participant_two
          else c.participant_one
        end
      ))
  )
);

drop policy if exists "Message sender and participant required" on public.messages;
create policy "Message sender and participant required"
on public.messages as restrictive for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.participant_one, c.participant_two)
      and (select public.can_view_profile_content(
        case
          when c.participant_one = (select auth.uid()) then c.participant_two
          else c.participant_one
        end
      ))
  )
);

-- Un utilisateur ne peut signaler que les messages d'une conversation
-- dont il est lui-meme participant.
drop policy if exists "Message reports require participation" on public.reports;
create policy "Message reports require participation"
on public.reports as restrictive for insert to authenticated
with check (
  message_id is null
  or exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = reports.message_id
      and (select auth.uid()) in (c.participant_one, c.participant_two)
      and m.sender_id <> (select auth.uid())
  )
);

-- Supprimer signifie maintenant effacer le texte conserve et le retirer
-- des apercus de notifications, pas seulement le cacher dans l'interface.
create or replace function public.delete_own_message(target_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.messages
  set body = '[deleted]', deleted_at = now()
  where id = target_message_id
    and sender_id = (select auth.uid())
    and deleted_at is null;

  if not found then
    return false;
  end if;

  update public.notifications
  set body = 'Message supprime'
  where message_id = target_message_id;

  return true;
end;
$$;

revoke all on function public.delete_own_message(uuid) from public, anon;
grant execute on function public.delete_own_message(uuid) to authenticated;

-- Les indicateurs de saisie utilisent un canal Broadcast prive. Seuls les
-- deux participants non bloques peuvent le lire ou y publier.
drop policy if exists "Conversation participants receive private broadcast" on realtime.messages;
create policy "Conversation participants receive private broadcast"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.conversations c
    where (select realtime.topic()) = 'chat:' || c.id::text
      and (select auth.uid()) in (c.participant_one, c.participant_two)
      and (select public.can_view_profile_content(
        case
          when c.participant_one = (select auth.uid()) then c.participant_two
          else c.participant_one
        end
      ))
  )
);

drop policy if exists "Conversation participants send private broadcast" on realtime.messages;
create policy "Conversation participants send private broadcast"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.conversations c
    where (select realtime.topic()) = 'chat:' || c.id::text
      and (select auth.uid()) in (c.participant_one, c.participant_two)
      and (select public.can_view_profile_content(
        case
          when c.participant_one = (select auth.uid()) then c.participant_two
          else c.participant_one
        end
      ))
  )
);

-- Ces fonctions sont reservees aux declencheurs de la base.
revoke all on function public.touch_conversation_from_message() from public, anon, authenticated;
revoke all on function public.reveal_conversation_on_message() from public, anon, authenticated;
revoke all on function public.notify_new_message() from public, anon, authenticated;

commit;
