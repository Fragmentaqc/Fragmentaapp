begin;

create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
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
    'profile', (select to_jsonb(p) - 'role' from public.profiles p where p.id = (select auth.uid())),
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
