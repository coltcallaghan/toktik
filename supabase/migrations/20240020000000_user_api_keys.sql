-- User API keys table
-- Stores encrypted third-party API keys per user
-- Keys are encrypted at rest using pgcrypto with the server-side CREDENTIALS_ENC_KEY

create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, -- 'runway', 'heygen', 'elevenlabs', 'anthropic'
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

-- RLS
alter table public.user_api_keys enable row level security;

create policy "Users can manage their own API keys"
  on public.user_api_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated at trigger
create or replace function public.update_user_api_keys_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_user_api_keys_updated_at
  before update on public.user_api_keys
  for each row execute function public.update_user_api_keys_updated_at();
