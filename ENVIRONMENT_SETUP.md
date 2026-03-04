# Environment Setup Guide

Complete guide to setting up your local development environment for AudienceAI.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- A text editor (VS Code recommended)

## 1. Create .env.local

Copy the example:
```bash
cp .env.example .env.local
```

## 2. Required Environment Variables

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...  # For server-side operations
```

Get these from: Supabase Project Settings → API

### Anthropic (Claude API)
```
ANTHROPIC_API_KEY=sk-ant-v0-xxxxx...
```

Get from: https://console.anthropic.com/account/keys

### Optional: OAuth Platforms
```
# TikTok
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...

# Google (YouTube)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Meta (Instagram, Facebook)
META_APP_ID=...
META_APP_SECRET=...

# Twitter
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
```

### App URL
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Database Setup

### First Time Only

```bash
# Create Supabase project (if not done)
# Then run migrations:
npx supabase migration up
```

### Verify Connection

```bash
npm run db:check
```

## 5. Start Development Server

```bash
npm run dev
```

Then open http://localhost:3000

## 6. Create Test Account

In Supabase:
1. Go to Auth → Users
2. Click "Add user"
3. Email: test@example.com
4. Password: any password
5. Click "Create user"

Login with these credentials.

## Development Workflow

### Running Dev Server
```bash
npm run dev
```

### Type Checking
```bash
npm run type-check
```

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Troubleshooting Setup

**"Cannot find module @supabase/supabase-js"**
→ Run `npm install` again

**"NEXT_PUBLIC_SUPABASE_URL is not set"**
→ Check .env.local file exists and has correct variables

**"Unauthorized" on login**
→ Check Supabase URL and anon key are correct

**"connect ECONNREFUSED"**
→ Supabase project may be paused or down

**TypeScript errors**
→ Run `npm run type-check` to see all errors
→ Fix types in tsconfig.json if needed

## VS Code Setup (Recommended)

Install extensions:
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- TypeScript Vue Plugin

Create .vscode/settings.json:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Docker Setup (Optional)

For Supabase locally with Docker:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Stop local Supabase
supabase stop
```

Then use `127.0.0.1:54321` as SUPABASE_URL.

## Production Deployment

For Vercel deployment:

1. Push repo to GitHub
2. Connect GitHub to Vercel
3. Add all env vars in Vercel dashboard
4. Deploy!

See DEPLOYMENT.md for complete checklist.

---

**Next Steps**: See README.md for quick start, or TROUBLESHOOTING.md if issues arise.
