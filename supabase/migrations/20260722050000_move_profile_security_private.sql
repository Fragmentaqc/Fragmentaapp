begin;

-- Les donnees d'autorisation, d'identite et de paiement ne doivent pas vivre
-- dans une table exposee par l'API publique.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.account_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
    check (role in ('user', 'moderator', 'admin')),
  identity_status text not null default 'unverified'
    check (identity_status in ('unverified', 'pending', 'verified', 'failed', 'requires_input')),
  identity_verified_at timestamptz,
  premium_status text not null default 'free'
    check (premium_status in ('free', 'premium_pending', 'premium')),
  stripe_verification_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.account_security enable row level security;
revoke all on table private.account_security from public, anon, authenticated;

-- Conserve toutes les valeurs existantes avant de retirer les colonnes publiques.
insert into private.account_security (
  user_id,
  role,
  identity_status,
  identity_verified_at,
  premium_status,
  stripe_verification_session_id
)
select
  id,
  coalesce(role, 'user'),
  coalesce(identity_status, 'unverified'),
  identity_verified_at,
  coalesce(premium_status, 'free'),
  stripe_verification_session_id
from public.profiles
on conflict (user_id) do update set
  role = excluded.role,
  identity_status = excluded.identity_status,
  identity_verified_at = excluded.identity_verified_at,
  premium_status = excluded.premium_status,
  stripe_verification_session_id = excluded.stripe_verification_session_id,
  updated_at = now();

alter table public.profiles
  drop column if exists role,
  drop column if exists identity_status,
  drop column if exists identity_verified_at,
  drop column if exists premium_status,
  drop column if exists stripe_verification_session_id;

drop index if exists public.profiles_role_idx;

create index if not exists account_security_role_idx
  on private.account_security (role)
  where role in ('moderator', 'admin');

-- Cree automatiquement la ligne privee de chaque nouveau compte.
create or replace function private.ensure_account_security()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.account_security (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.ensure_account_security() from public, anon, authenticated;

drop trigger if exists profiles_ensure_account_security on public.profiles;
create trigger profiles_ensure_account_security
after insert on public.profiles
for each row execute function private.ensure_account_security();

-- La fonction publique ne retourne qu'un booleen et ne revele aucun role.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.account_security
    where user_id = (select auth.uid())
      and role in ('moderator', 'admin')
  );
$$;

revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

-- L'export personnel expose les statuts du compte, jamais la reference Stripe.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'phone', u.phone,
      'created_at', u.created_at,
      'updated_at', u.updated_at,
      'last_sign_in_at', u.last_sign_in_at,
      'email_confirmed_at', u.email_confirmed_at,
      'phone_confirmed_at', u.phone_confirmed_at
    ) from auth.users u where u.id = (select auth.uid())),
    'account_status', (select jsonb_build_object(
      'identity_status', s.identity_status,
      'identity_verified_at', s.identity_verified_at,
      'premium_status', s.premium_status
    ) from private.account_security s where s.user_id = (select auth.uid())),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'adventures', coalesce((select jsonb_agg(to_jsonb(a)) from public.adventures a where a.owner_id = (select auth.uid())), '[]'::jsonb),
    'adventure_images', coalesce((select jsonb_agg(to_jsonb(i)) from public.adventure_images i where i.owner_id = (select auth.uid())), '[]'::jsonb),
    'fragments', coalesce((select jsonb_agg(to_jsonb(f)) from public.fragments f where f.owner_id = (select auth.uid())), '[]'::jsonb),
    'fragment_images', coalesce((select jsonb_agg(to_jsonb(i)) from public.fragment_images i where i.owner_id = (select auth.uid())), '[]'::jsonb),
    'curiosities', coalesce((select jsonb_agg(to_jsonb(c)) from public.curiosities c where c.owner_id = (select auth.uid())), '[]'::jsonb),
    'curiosity_images', coalesce((select jsonb_agg(to_jsonb(i)) from public.curiosity_images i join public.curiosities c on c.id = i.curiosity_id where c.owner_id = (select auth.uid())), '[]'::jsonb),
    'favorites', coalesce((select jsonb_agg(to_jsonb(f)) from public.favorites f where f.owner_id = (select auth.uid())), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(r)) from public.reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb),
    'blocked_users', coalesce((select jsonb_agg(to_jsonb(b)) from public.user_blocks b where b.blocker_id = (select auth.uid())), '[]'::jsonb),
    'verification_requests', coalesce((select jsonb_agg(to_jsonb(v)) from public.curiosity_verification_requests v where v.requester_id = (select auth.uid())), '[]'::jsonb)
  )
  where (select auth.uid()) is not null;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

commit;
