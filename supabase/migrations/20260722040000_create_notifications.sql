begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('follow', 'message', 'verification', 'adventure', 'curiosity')),
  title text not null,
  body text not null default '',
  adventure_id uuid references public.adventures(id) on delete cascade,
  curiosity_id uuid references public.curiosities(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;

create policy "Users read their notifications" on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));
create policy "Users update their notifications" on public.notifications for update to authenticated
using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy "Users delete their notifications" on public.notifications for delete to authenticated
using (recipient_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify_new_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor_name text;
begin
  select coalesce(display_name, username, 'Un membre') into actor_name from public.profiles where id = new.follower_id;
  insert into public.notifications (recipient_id, actor_id, type, title, body)
  values (new.followed_id, new.follower_id, 'follow', 'Nouvel abonnement', actor_name || ' suit maintenant tes aventures.');
  return new;
end;
$$;
drop trigger if exists profile_follows_notify on public.profile_follows;
create trigger profile_follows_notify after insert on public.profile_follows for each row execute function public.notify_new_follow();

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid; actor_name text;
begin
  select case when participant_one = new.sender_id then participant_two else participant_one end into recipient
  from public.conversations where id = new.conversation_id;
  select coalesce(display_name, username, 'Un membre') into actor_name from public.profiles where id = new.sender_id;
  insert into public.notifications (recipient_id, actor_id, type, title, body, conversation_id, message_id)
  values (recipient, new.sender_id, 'message', 'Nouveau message', actor_name || ' : ' || left(new.body, 120), new.conversation_id, new.id);
  return new;
end;
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages for each row execute function public.notify_new_message();

create or replace function public.notify_verification_decision()
returns trigger language plpgsql security definer set search_path = public as $$
declare curiosity_title text;
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    select coalesce(title, 'Ta curiosité') into curiosity_title from public.curiosities where id = new.curiosity_id;
    insert into public.notifications (recipient_id, type, title, body, curiosity_id)
    values (new.requester_id, 'verification', case when new.status = 'approved' then 'Curiosité vérifiée' else 'Vérification refusée' end,
      curiosity_title || case when new.status = 'approved' then ' est maintenant vérifiée.' else ' n’a pas été approuvée.' end, new.curiosity_id);
  end if;
  return new;
end;
$$;
drop trigger if exists curiosity_verification_notify on public.curiosity_verification_requests;
create trigger curiosity_verification_notify after update of status on public.curiosity_verification_requests for each row execute function public.notify_verification_decision();

create or replace function public.notify_followers_new_adventure()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor_name text;
begin
  if new.publication_status = 'published' and (tg_op = 'INSERT' or old.publication_status is distinct from 'published') then
    select coalesce(display_name, username, 'Un membre') into actor_name from public.profiles where id = new.owner_id;
    insert into public.notifications (recipient_id, actor_id, type, title, body, adventure_id)
    select followed.follower_id, new.owner_id, 'adventure', 'Nouvelle aventure', actor_name || ' a publié « ' || new.title || ' ».', new.id
    from public.profile_follows followed where followed.followed_id = new.owner_id;
  end if;
  return new;
end;
$$;
drop trigger if exists adventures_notify_followers on public.adventures;
create trigger adventures_notify_followers after insert or update of publication_status on public.adventures for each row execute function public.notify_followers_new_adventure();

create or replace function public.notify_followers_new_curiosity()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor_name text;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    select coalesce(display_name, username, 'Un membre') into actor_name from public.profiles where id = new.owner_id;
    insert into public.notifications (recipient_id, actor_id, type, title, body, curiosity_id)
    select followed.follower_id, new.owner_id, 'curiosity', 'Nouvelle curiosité', actor_name || ' a partagé « ' || new.title || ' ».', new.id
    from public.profile_follows followed where followed.followed_id = new.owner_id;
  end if;
  return new;
end;
$$;
drop trigger if exists curiosities_notify_followers on public.curiosities;
create trigger curiosities_notify_followers after insert or update of status on public.curiosities for each row execute function public.notify_followers_new_curiosity();

do $$ begin alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

commit;
