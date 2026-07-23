-- Fragmenta - assertions de securite a executer apres toutes les migrations.
-- Ce fichier ne modifie aucune donnee applicative.

do $$
declare
  required_table text;
  required_policy record;
  required_tables constant text[] := array[
    'profiles',
    'adventures',
    'adventure_images',
    'curiosities',
    'fragments',
    'fragment_images',
    'favorites',
    'reports',
    'moderation_logs',
    'user_blocks',
    'curiosity_verification_requests',
    'profile_follows',
    'collections',
    'collection_items',
    'conversations',
    'messages',
    'hidden_conversations',
    'notifications'
  ];
begin
  -- Une nouvelle table sensible ne doit jamais se retrouver sans RLS.
  foreach required_table in array required_tables loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'Table de securite attendue absente: public.%', required_table;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = required_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS non active sur public.%', required_table;
    end if;
  end loop;

  -- Les tables privees doivent avoir au moins une politique explicite.
  foreach required_table in array array[
    'favorites', 'reports', 'moderation_logs', 'user_blocks',
    'curiosity_verification_requests', 'profile_follows', 'collections',
    'collection_items', 'conversations', 'messages', 'hidden_conversations',
    'notifications'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = required_table
    ) then
      raise exception 'Aucune politique RLS sur public.%', required_table;
    end if;
  end loop;

  -- Politiques critiques dont la disparition ouvrirait une faille fonctionnelle.
  for required_policy in
    select * from (values
      ('adventures', 'Public adventures are readable'),
      ('adventures', 'Content owner required to update adventures'),
      ('adventure_images', 'Owners can create adventure images'),
      ('adventure_images', 'Adventure images follow adventure visibility'),
      ('curiosities', 'Published curiosities or owners are readable'),
      ('curiosities', 'Content owner required to update curiosities'),
      ('fragments', 'Readable fragments follow their adventure'),
      ('fragments', 'Content owner required to update fragments'),
      ('fragment_images', 'Fragment image owner required to update'),
      ('curiosity_images', 'Curiosity owner required to update images'),
      ('profile_follows', 'Blocked profiles cannot be followed'),
      ('favorites', 'Owners can read their favorites'),
      ('reports', 'Reporters can read their reports'),
      ('reports', 'Moderators can read all reports'),
      ('reports', 'Reports require a visible external target'),
      ('conversations', 'Participants can read conversations'),
      ('messages', 'Participants can read messages'),
      ('messages', 'Participants can send messages'),
      ('messages', 'Message sender and participant required'),
      ('reports', 'Message reports require participation'),
      ('notifications', 'Users read their notifications')
    ) as policies(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = required_policy.table_name
        and policyname = required_policy.policy_name
    ) then
      raise exception 'Politique critique absente: %.%',
        required_policy.table_name, required_policy.policy_name;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'adventures'
      and policyname = 'Everyone can view adventures'
  ) then
    raise exception 'L ancienne politique publique des aventures existe encore.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'Conversation participants receive private broadcast'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'Conversation participants send private broadcast'
  ) then
    raise exception 'Les canaux prives de conversation ne sont pas proteges.';
  end if;

  if exists (
    select 1
    from pg_proc p,
      lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = to_regprocedure('public.can_view_profile_content(uuid)')
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'La fonction de blocage est executable par PUBLIC.';
  end if;

  -- Les donnees d'autorisation et de paiement doivent etre hors du schema public.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name in (
        'role', 'premium_status', 'identity_status',
        'identity_verified_at', 'stripe_verification_session_id'
      )
  ) then
    raise exception 'Une colonne sensible existe encore dans public.profiles.';
  end if;

  if to_regclass('private.account_security') is null then
    raise exception 'La table private.account_security est absente.';
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
    or has_schema_privilege('authenticated', 'private', 'USAGE')
    or has_table_privilege('anon', 'private.account_security', 'SELECT, INSERT, UPDATE, DELETE')
    or has_table_privilege('authenticated', 'private.account_security', 'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'Les donnees de securite des comptes sont accessibles au client.';
  end if;

  if has_column_privilege('authenticated', 'public.curiosities', 'verification_status', 'INSERT')
    or has_column_privilege('authenticated', 'public.curiosities', 'verification_status', 'UPDATE') then
    raise exception 'verification_status reste controlable par le proprietaire.';
  end if;

  if has_table_privilege('authenticated', 'public.reports', 'UPDATE')
    or has_column_privilege('authenticated', 'public.reports', 'status', 'UPDATE')
    or has_column_privilege('authenticated', 'public.reports', 'moderation_note', 'UPDATE') then
    raise exception 'Les signalements restent modifiables directement par le client.';
  end if;

  if not has_function_privilege('authenticated', 'public.review_report(uuid,text,text)', 'EXECUTE') then
    raise exception 'La commande serveur de moderation est inaccessible.';
  end if;

  if has_table_privilege('authenticated', 'public.profiles', 'INSERT')
    or has_column_privilege('authenticated', 'public.profiles', 'terms_accepted_at', 'INSERT')
    or has_column_privilege('authenticated', 'public.profiles', 'adult_confirmed_at', 'INSERT') then
    raise exception 'Le client peut encore creer un profil ou forger les preuves legales.';
  end if;

  if to_regprocedure('public.handle_new_user()') is null then
    raise exception 'Le declencheur serveur de creation de profil est absent.';
  end if;

  if has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
    or has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE') then
    raise exception 'La fonction de creation de profil est appelable directement.';
  end if;

  -- Les donnees strictement privees ne doivent donner aucun droit direct a anon.
  foreach required_table in array array[
    'favorites', 'reports', 'moderation_logs', 'user_blocks',
    'curiosity_verification_requests', 'conversations', 'messages',
    'hidden_conversations', 'notifications'
  ] loop
    if has_table_privilege('anon', format('public.%I', required_table),
      'SELECT, INSERT, UPDATE, DELETE') then
      raise exception 'anon possede encore un droit direct sur public.%', required_table;
    end if;
  end loop;

  -- Toute fonction SECURITY DEFINER publique doit fixer son search_path.
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) setting
        where setting like 'search_path=%'
      )
  ) then
    raise exception 'Une fonction SECURITY DEFINER publique ne fixe pas search_path=public.';
  end if;

  -- Configuration minimale des buckets exposes a l application.
  if exists (
    select 1 from storage.buckets
    where id in ('adventure-images', 'curiosity-images')
      and (
        public is distinct from false
        or
        file_size_limit is distinct from 10485760
        or allowed_mime_types is null
        or not ('image/jpeg' = any(allowed_mime_types))
        or not ('image/png' = any(allowed_mime_types))
      )
  ) then
    raise exception 'La configuration des buckets de contenu est invalide.';
  end if;

  if exists (
    select 1 from storage.buckets
    where id = 'fragment-images'
      and public is distinct from false
  ) then
    raise exception 'Le bucket fragment-images est encore public.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Content image downloads follow parent visibility'
  ) then
    raise exception 'La politique privee des images de contenu est absente.';
  end if;

  if exists (
    select 1 from storage.buckets
    where id = 'avatars'
      and (
        file_size_limit is distinct from 5242880
        or allowed_mime_types is null
        or not ('image/jpeg' = any(allowed_mime_types))
        or not ('image/png' = any(allowed_mime_types))
      )
  ) then
    raise exception 'La configuration du bucket avatars est invalide.';
  end if;
end
$$;

select 'Toutes les assertions de securite Fragmenta sont valides.' as result;
