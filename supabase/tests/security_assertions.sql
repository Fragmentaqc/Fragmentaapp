-- Fragmenta — assertions à exécuter après les migrations.
-- La requête ne modifie aucune donnée.

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'adventures'
      and policyname = 'Everyone can view adventures'
  ) then
    raise exception 'La politique publique des aventures existe encore.';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.profiles',
    'premium_status',
    'UPDATE'
  ) then
    raise exception 'premium_status reste modifiable par authenticated.';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.profiles',
    'identity_status',
    'UPDATE'
  ) then
    raise exception 'identity_status reste modifiable par authenticated.';
  end if;

  if has_column_privilege(
    'anon',
    'public.profiles',
    'stripe_verification_session_id',
    'SELECT'
  ) or has_column_privilege(
    'authenticated',
    'public.profiles',
    'stripe_verification_session_id',
    'SELECT'
  ) then
    raise exception 'Le champ Stripe reste lisible depuis le client.';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.curiosities',
    'verification_status',
    'INSERT'
  ) or has_column_privilege(
    'authenticated',
    'public.curiosities',
    'verification_status',
    'UPDATE'
  ) then
    raise exception 'verification_status reste contrôlable par le propriétaire.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'adventure_images'
      and policyname = 'Owners can create adventure images'
  ) then
    raise exception 'La politique renforcée des images manque.';
  end if;

  if exists (
    select 1
    from storage.buckets
    where id in ('adventure-images', 'curiosity-images')
      and (
        file_size_limit is distinct from 10485760
        or allowed_mime_types is null
        or not ('image/jpeg' = any(allowed_mime_types))
        or not ('image/png' = any(allowed_mime_types))
      )
  ) then
    raise exception 'La configuration des buckets de contenu est invalide.';
  end if;

  if exists (
    select 1
    from storage.buckets
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

select 'Toutes les assertions de sécurité Fragmenta sont valides.'
  as result;
