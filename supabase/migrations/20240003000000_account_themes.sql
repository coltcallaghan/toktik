-- Account Themes: per-account AI content configuration
alter table public.accounts
  add column if not exists tone            text default 'casual'
                                             check (tone in ('casual', 'educational', 'humorous', 'inspirational', 'professional', 'edgy')),
  add column if not exists content_style   text default 'storytelling'
                                             check (content_style in ('storytelling', 'tutorial', 'listicle', 'commentary', 'challenge', 'day-in-life', 'product-review')),
  add column if not exists target_audience text,
  add column if not exists posting_goals   text,
  add column if not exists brand_voice     text;
