-- ============================================================
-- Scheduling support for content auto-posting
-- ============================================================

-- Add schedule_status to track the cron lifecycle
-- Values: null (not scheduled), 'pending', 'publishing', 'published', 'failed'
alter table public.content
  add column if not exists schedule_status text
  check (schedule_status in ('pending', 'publishing', 'published', 'failed'));

-- Add optimal_time flag — true if the system picked the time
alter table public.content
  add column if not exists auto_scheduled boolean not null default false;

-- Index for the cron job: find pending items whose time has come
create index if not exists idx_content_schedule_pending
  on public.content (scheduled_at)
  where schedule_status = 'pending' and scheduled_at is not null;
