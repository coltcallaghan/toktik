-- Add platform column to competitors table for cross-platform support
ALTER TABLE competitors
  ADD COLUMN IF NOT EXISTS platform text DEFAULT 'tiktok';
