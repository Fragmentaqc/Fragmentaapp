begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_display_name text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if requested_username !~ '^[a-z0-9._-]{3,30}$' then raise exception 'Invalid username'; end if;
  if char_length(requested_display_name) not between 1 and 80 then raise exception 'Invalid display name'; end if;
  if coalesce((new.raw_user_meta_data ->> 'adult_confirmed')::boolean, false) is not true then raise exception 'Adult confirmation required'; end if;
  if coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> '2026-07-20' then raise exception 'Current terms must be accepted'; end if;

  insert into public.profiles (id, username, display_name, terms_accepted_at, terms_version, adult_confirmed_at)
  values (new.id, requested_username, requested_display_name, now(), '2026-07-20', now());
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Les profils et leurs preuves legales sont crees uniquement par le trigger serveur.
revoke insert on table public.profiles from authenticated;
revoke insert (id, username, display_name, bio, avatar_url, country, updated_at, social_links, cover_url, terms_accepted_at, terms_version, adult_confirmed_at)
on table public.profiles from authenticated;

create or replace function public.delete_own_account(confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  recent_sign_in timestamptz;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if confirmation <> 'SUPPRIMER' then raise exception 'Invalid confirmation'; end if;

  select last_sign_in_at into recent_sign_in from auth.users where id = current_user_id;
  if recent_sign_in is null or recent_sign_in < now() - interval '10 minutes' then
    raise exception 'Recent authentication required';
  end if;

  delete from auth.users where id = current_user_id;
  if not found then raise exception 'Account not found'; end if;
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

-- Les preuves et notes internes de moderation ne font pas partie de l'export du plaignant.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'phone', u.phone, 'created_at', u.created_at, 'updated_at', u.updated_at, 'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at, 'phone_confirmed_at', u.phone_confirmed_at) from auth.users u where u.id = (select auth.uid())),
    'account_status', (select jsonb_build_object('identity_status', s.identity_status, 'identity_verified_at', s.identity_verified_at, 'premium_status', s.premium_status) from private.account_security s where s.user_id = (select auth.uid())),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'adventures', coalesce((select jsonb_agg(to_jsonb(a)) from public.adventures a where a.owner_id = (select auth.uid())), '[]'::jsonb),
    'adventure_images', coalesce((select jsonb_agg(to_jsonb(i)) from public.adventure_images i where i.owner_id = (select auth.uid())), '[]'::jsonb),
    'fragments', coalesce((select jsonb_agg(to_jsonb(f)) from public.fragments f where f.owner_id = (select auth.uid())), '[]'::jsonb),
    'fragment_images', coalesce((select jsonb_agg(to_jsonb(i)) from public.fragment_images i where i.owner_id = (select auth.uid())), '[]'::jsonb),
    'curiosities', coalesce((select jsonb_agg(to_jsonb(c)) from public.curiosities c where c.owner_id = (select auth.uid())), '[]'::jsonb),
    'curiosity_images', coalesce((select jsonb_agg(to_jsonb(i)) from public.curiosity_images i join public.curiosities c on c.id = i.curiosity_id where c.owner_id = (select auth.uid())), '[]'::jsonb),
    'favorites', coalesce((select jsonb_agg(to_jsonb(f)) from public.favorites f where f.owner_id = (select auth.uid())), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(r) - 'evidence' - 'moderation_note') from public.reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb),
    'blocked_users', coalesce((select jsonb_agg(to_jsonb(b)) from public.user_blocks b where b.blocker_id = (select auth.uid())), '[]'::jsonb),
    'verification_requests', coalesce((select jsonb_agg(to_jsonb(v)) from public.curiosity_verification_requests v where v.requester_id = (select auth.uid())), '[]'::jsonb)
  ) where (select auth.uid()) is not null;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

commit;
