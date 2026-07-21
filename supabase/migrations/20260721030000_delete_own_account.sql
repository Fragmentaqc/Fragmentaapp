begin;

create or replace function public.delete_own_account(confirmation text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if confirmation <> 'SUPPRIMER' then
    raise exception 'Invalid confirmation';
  end if;
  delete from auth.users where id = current_user_id;
  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

commit;
