-- Migration: Add platform column to accounts for multi-platform support

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'tiktok'
  CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'twitter', 'linkedin', 'facebook'));

CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);
