-- Generic platform OAuth token columns for non-TikTok platforms
-- TikTok continues to use its existing tiktok_* columns for backward compatibility

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform_access_token TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform_refresh_token TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform_token_expires_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform_user_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform_page_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform_metadata JSONB DEFAULT '{}';

-- Index for looking up accounts by platform user ID
CREATE INDEX IF NOT EXISTS idx_accounts_platform_user_id ON accounts(platform_user_id);

-- RLS: ensure platform tokens follow same policies as existing columns
-- (existing RLS on accounts table already covers all columns)
