-- Migration: Comment bot settings & logs

CREATE TABLE IF NOT EXISTS comment_bot_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('auto_reply', 'auto_like', 'keyword_reply')),
  trigger_keywords TEXT[],           -- keywords that trigger this rule (null = all)
  reply_template TEXT,               -- template or "ai" for AI-generated replies
  tone TEXT DEFAULT 'friendly',      -- friendly, professional, casual, humorous
  max_replies_per_hour INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comment_bot_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES comment_bot_rules(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  original_comment TEXT,
  reply_text TEXT,
  action TEXT NOT NULL CHECK (action IN ('replied', 'liked', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comment_bot_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_bot_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bot rules"
  ON comment_bot_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own bot logs"
  ON comment_bot_log FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));
