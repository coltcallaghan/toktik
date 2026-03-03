-- Add TikTok OAuth columns to accounts table
alter table public.accounts
  add column if not exists tiktok_open_id      text,
  add column if not exists tiktok_access_token  text,
  add column if not exists tiktok_refresh_token text,
  add column if not exists tiktok_token_expires_at timestamptz,
  add column if not exists avatar_url           text,
  add column if not exists display_name         text;

-- Unique index so one TikTok account can only be connected once per user
create unique index if not exists accounts_tiktok_open_id_user_idx
  on public.accounts(user_id, tiktok_open_id)
  where tiktok_open_id is not null;
