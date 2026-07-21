alter table public.adventures
  add column if not exists routing_profile text;

update public.adventures
set routing_profile = case
  when category = 'Vélo' then 'cycling'
  when category = 'Road trip' then 'driving'
  else 'walking'
end
where routing_profile is null;

alter table public.adventures
  alter column routing_profile set default 'walking',
  alter column routing_profile set not null;

alter table public.adventures
  drop constraint if exists adventures_routing_profile_check;

alter table public.adventures
  add constraint adventures_routing_profile_check
  check (routing_profile in ('driving', 'cycling', 'walking'));
