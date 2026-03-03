-- Migration: Audit log for tracking all platform actions

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,                  -- content.created, content.published, account.added, team.invited, etc.
  resource_type TEXT NOT NULL,           -- content, account, team, trend, webhook, etc.
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,    -- extra context (title, username, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own audit log"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System inserts audit log"
  ON audit_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usage tracking for billing/credits
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,                  -- ai_generation, video_upload, tts_generation, etc.
  credits_used INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_user_month ON usage_records(user_id, created_at);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own usage"
  ON usage_records FOR ALL
  USING (user_id = auth.uid());
