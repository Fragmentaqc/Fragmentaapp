create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint profile_follows_no_self_follow check (follower_id <> followed_id)
);

create index if not exists profile_follows_followed_id_idx on public.profile_follows (followed_id, created_at desc);
alter table public.profile_follows enable row level security;
create policy "Les abonnements sont visibles par tous" on public.profile_follows for select using (true);
create policy "Un membre peut suivre un profil" on public.profile_follows for insert to authenticated
  with check (auth.uid() = follower_id and follower_id <> followed_id);
create policy "Un membre peut se désabonner" on public.profile_follows for delete to authenticated
  using (auth.uid() = follower_id);
