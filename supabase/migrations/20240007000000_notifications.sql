-- ============================================================
-- Notifications table for AudienceAI dashboard
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'trend_alert',
    'content_published',
    'content_failed',
    'account_status',
    'team_update',
    'system'
  )),
  title text not null,
  message text not null default '',
  read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);

-- Index for fast lookup by user + recency
create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- Index for unread count queries
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, read)
  where read = false;

-- RLS policies
alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Users can delete their own notifications
create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Allow service role / edge functions to insert notifications
create policy "Service role can insert notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

-- Enable realtime for the notifications table
alter publication supabase_realtime add table public.notifications;
