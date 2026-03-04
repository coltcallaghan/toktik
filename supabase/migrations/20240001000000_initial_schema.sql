-- AudienceAI Initial Schema
-- Run this once in your Supabase SQL editor

-- ============================================================
-- TEAMS
-- ============================================================
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text,
  members     text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- ACCOUNTS
-- ============================================================
create table if not exists public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  platform_username   text not null,
  platform_id         text not null,
  team_id             uuid references public.teams(id) on delete set null,
  followers_count     integer not null default 0,
  status              text not null default 'active'
                        check (status in ('active', 'paused', 'inactive')),
  niche               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- CONTENT
-- ============================================================
create table if not exists public.content (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid references public.accounts(id) on delete cascade not null,
  team_id             uuid references public.teams(id) on delete set null,
  title               text not null,
  script              text not null default '',
  video_url           text,
  status              text not null default 'draft'
                        check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at        timestamptz,
  published_at        timestamptz,
  engagement_metrics  jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- TRENDS
-- ============================================================
create table if not exists public.trends (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  trend_name   text not null,
  category     text not null,
  momentum     numeric not null default 0 check (momentum >= 0 and momentum <= 100),
  description  text,
  detected_at  timestamptz not null default now(),
  expires_at   timestamptz
);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.handle_updated_at();

create trigger accounts_updated_at
  before update on public.accounts
  for each row execute function public.handle_updated_at();

create trigger content_updated_at
  before update on public.content
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.teams    enable row level security;
alter table public.accounts enable row level security;
alter table public.content  enable row level security;
alter table public.trends   enable row level security;

-- Teams: users can only see/modify their own
create policy "teams: owner access"
  on public.teams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Accounts: users can only see/modify their own
create policy "accounts: owner access"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Content: users can access content for their own accounts
create policy "content: owner access"
  on public.content for all
  using (
    exists (
      select 1 from public.accounts
      where accounts.id = content.account_id
        and accounts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.accounts
      where accounts.id = content.account_id
        and accounts.user_id = auth.uid()
    )
  );

-- Trends: users can only see/modify their own
create policy "trends: owner access"
  on public.trends for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists accounts_user_id_idx  on public.accounts(user_id);
create index if not exists content_account_id_idx on public.content(account_id);
create index if not exists content_status_idx     on public.content(status);
create index if not exists trends_user_id_idx     on public.trends(user_id);
create index if not exists trends_momentum_idx    on public.trends(momentum desc);
