# Database Schema

Complete Supabase PostgreSQL schema for AudienceAI.

## Tables Overview

```
accounts (user accounts per social platform)
├── id (UUID) [PK]
├── user_id (UUID) [FK → auth.users]
├── platform (text) - 'tiktok', 'youtube', etc.
├── platform_username (text) - @username
├── platform_id (text) - username without @
├── display_name (text) - "Dave 💪 Fitness Coach"
├── niche (text) - "Fitness coaching"
├── followers_count (int)
├── status (text) - 'active', 'paused', 'inactive'
├── avatar_url (text) - profile picture URL
├── tone (text) - 'casual', 'professional', etc.
├── content_style (text)
├── target_audience (text)
├── posting_goals (text)
├── brand_voice (text)
├── [OAuth tokens for each platform]
└── timestamps

content (generated and published content)
├── id (UUID) [PK]
├── account_id (UUID) [FK → accounts]
├── user_id (UUID) [FK → auth.users]
├── team_id (UUID) [FK → teams]
├── title (text)
├── script (text)
├── video_url (text)
├── status (text) - 'draft', 'scheduled', 'published', 'failed'
├── scheduled_at (timestamp)
├── published_at (timestamp)
├── engagement_metrics (JSONB)
│   ├── views (int)
│   ├── likes (int)
│   ├── comments (int)
│   ├── shares (int)
│   ├── platform_post_id (text) - for platform queries
│   └── last_synced_at (timestamp)
└── timestamps

teams (collaboration groups)
├── id (UUID) [PK]
├── user_id (UUID) [FK → auth.users]
├── name (text)
├── description (text)
├── members (JSONB array) - ["user1@example.com", ...]
└── timestamps

trends (AI-detected trends)
├── id (UUID) [PK]
├── user_id (UUID) [FK → auth.users]
├── trend_name (text)
├── category (text)
├── momentum (int) - 1-100 score
├── description (text)
├── detected_at (timestamp)
└── expires_at (timestamp)
```

## Detailed Schema

### accounts Table

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Platform info
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'facebook', 'twitter', 'linkedin')),
  platform_username TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  display_name TEXT,
  niche TEXT,
  
  -- Stats
  followers_count INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  
  -- Profile
  avatar_url TEXT,
  
  -- Brand customization
  tone TEXT CHECK (tone IN ('casual', 'educational', 'humorous', 'inspirational', 'professional', 'edgy')),
  content_style TEXT CHECK (content_style IN ('storytelling', 'tutorial', 'listicle', 'commentary', 'challenge', 'day-in-life', 'product-review')),
  target_audience TEXT,
  posting_goals TEXT,
  brand_voice TEXT,
  
  -- OAuth tokens (encrypted via pgcrypto)
  tiktok_access_token TEXT,
  tiktok_refresh_token TEXT,
  tiktok_token_expires_at TIMESTAMP,
  tiktok_open_id TEXT,
  platform_access_token TEXT,
  platform_refresh_token TEXT,
  platform_token_expires_at TIMESTAMP,
  platform_user_id TEXT,
  platform_page_id TEXT,
  platform_metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_accounts_user_platform ON accounts(user_id, platform, platform_id);
```

### content Table

```sql
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  title TEXT,
  script TEXT,
  video_url TEXT,
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  
  engagement_metrics JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_user_status ON content(user_id, status);
CREATE INDEX idx_content_account ON content(account_id);
CREATE INDEX idx_content_published_at ON content(published_at DESC);
```

### teams Table

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  members TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### trends Table

```sql
CREATE TABLE trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  trend_name TEXT NOT NULL,
  category TEXT,
  momentum INT CHECK (momentum >= 0 AND momentum <= 100),
  description TEXT,
  
  detected_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  UNIQUE(user_id, trend_name)
);
```

## Row-Level Security (RLS)

All tables have RLS enabled:

```sql
-- accounts: users only see their own
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_user_access ON accounts
  FOR ALL USING (user_id = auth.uid());

-- content: users see own + team
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_user_access ON content
  FOR ALL USING (user_id = auth.uid());

-- teams: users see own teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_user_access ON teams
  FOR ALL USING (user_id = auth.uid());

-- trends: users see own trends
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY trends_user_access ON trends
  FOR ALL USING (user_id = auth.uid());
```

## Foreign Keys & Relationships

```
auth.users
├──→ accounts (one user has many accounts)
├──→ content (one user has many content items)
├──→ teams (one user has many teams)
└──→ trends (one user has many trends)

accounts
└──→ content (one account has many content items)

teams
└──→ content (team collaboration on content)
```

## Engagement Metrics Schema

The `engagement_metrics` JSONB field stores:

```json
{
  "views": 1500,
  "likes": 320,
  "comments": 45,
  "shares": 12,
  "platform_post_id": "abc123def456",
  "last_synced_at": "2026-03-03T15:30:00Z",
  "tiktok_video_id": "1234567890",
  "creatomate_render_id": "render_xyz",
  "caption": "Check out this amazing fitness tip!",
  "hashtags": ["#fitness", "#gym", "#motivation"]
}
```

## Migrations

All schema is defined in:
```
supabase/migrations/
├── [timestamp]_initial_schema.sql
└── [timestamp]_other_changes.sql
```

Run with:
```bash
npx supabase migration up
```

## Indexes

For performance, indexes exist on:
- `accounts(user_id, platform)`
- `content(user_id, status)`
- `content(published_at DESC)`
- `teams(user_id)`

---

**Next**: See API_REFERENCE.md for endpoint documentation.
