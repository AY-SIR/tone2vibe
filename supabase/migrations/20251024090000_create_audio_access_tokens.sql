-- Audio access token table and RLS
create table if not exists public.audio_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('user-voices','user-generates')),
  storage_path text not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_audio_tokens_token on public.audio_access_tokens(token);
create index if not exists idx_audio_tokens_user on public.audio_access_tokens(user_id);
create index if not exists idx_audio_tokens_expires on public.audio_access_tokens(expires_at);

-- Enable RLS
alter table public.audio_access_tokens enable row level security;

-- Policies: users can manage their own tokens
create policy if not exists "Users can insert their own tokens"
  on public.audio_access_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "Users can select their own tokens"
  on public.audio_access_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own tokens"
  on public.audio_access_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);
