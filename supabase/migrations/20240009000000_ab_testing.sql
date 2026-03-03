-- ============================================================
-- A/B Testing support
-- ============================================================

create table if not exists public.ab_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  trend_name text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  winner_variant_id uuid,  -- references content.id of the winning variant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Link content items to an A/B test as variants
alter table public.content
  add column if not exists ab_test_id uuid references public.ab_tests(id) on delete set null;

alter table public.content
  add column if not exists variant_label text;  -- e.g. 'A', 'B', 'C'

-- Index for looking up variants by test
create index if not exists idx_content_ab_test
  on public.content (ab_test_id)
  where ab_test_id is not null;

-- RLS
alter table public.ab_tests enable row level security;

create policy "Users can view own ab_tests"
  on public.ab_tests for select using (auth.uid() = user_id);

create policy "Users can insert own ab_tests"
  on public.ab_tests for insert with check (auth.uid() = user_id);

create policy "Users can update own ab_tests"
  on public.ab_tests for update using (auth.uid() = user_id);

create policy "Users can delete own ab_tests"
  on public.ab_tests for delete using (auth.uid() = user_id);
