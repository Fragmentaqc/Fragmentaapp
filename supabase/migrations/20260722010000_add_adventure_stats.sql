alter table public.adventures
  add column if not exists distance_km numeric(10,2) not null default 0,
  add column if not exists duration_minutes integer not null default 0;

alter table public.adventures
  drop constraint if exists adventures_distance_km_nonnegative,
  drop constraint if exists adventures_duration_minutes_nonnegative;

alter table public.adventures
  add constraint adventures_distance_km_nonnegative check (distance_km >= 0),
  add constraint adventures_duration_minutes_nonnegative check (duration_minutes >= 0);
