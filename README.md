# AudienceAI - AI-Powered Social Media Management Platform

A Next.js 15 application that helps creators manage, generate, and publish content across multiple social media platforms (TikTok, YouTube, Instagram, Facebook, Twitter, LinkedIn) using AI.

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- Anthropic API key (for Claude)

### 2. Setup

```bash
# Clone repository
git clone <repo>
cd audienceai

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Fill in required env vars (see ENVIRONMENT_SETUP.md)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...

# Run migrations (first time only)
npx supabase migration up

# Start dev server
npm run dev

# Open http://localhost:3000
```

### 3. Login
- Email: test@example.com  
- Password: (set in Supabase)
- Or sign up for new account

## 📚 Documentation Map

**For Getting Started:**
- ENVIRONMENT_SETUP.md — Local dev setup, environment variables
- DATABASE_SCHEMA.md — Database tables, fields, relationships

**For Features:**
- QUICK_START_ACCOUNT_SUGGESTIONS.md — AI-powered account setup
- ACCOUNT_SETUP_SUGGESTIONS.md — Feature details
- ACCOUNT_SETUP_VISUAL_GUIDE.md — UI mockups and flows

**For Architecture:**
- ARCHITECTURE.md — System design, data flow
- ACCOUNT_SUGGESTIONS_ARCHITECTURE.md — Account suggestions internals
- API_REFERENCE.md — All endpoints documented

**For Development:**
- CONTRIBUTING.md — Code standards, commit conventions
- TROUBLESHOOTING.md — Common issues and solutions
- DEPLOYMENT.md — Production checklist

**For Strategy:**
- MULTI_ACCOUNT_STRATEGY.md — Phone number workarounds, account management

## 🎯 Core Features

### 1. Multi-Platform OAuth
Connect accounts from 6 platforms with secure token storage.

### 2. Content Generation
- AI-powered script, title, and caption generation
- Bulk generation for multiple accounts
- A/B testing framework

### 3. Content Management
- Draft → Schedule → Publish workflow
- Engagement metrics tracking
- Content repurposing across platforms

### 4. Analytics & Trends
- Trend detection and analysis
- Engagement rate calculation
- Per-account performance tracking

### 5. Team Collaboration
- Team creation and member management
- Role-based access
- Shared content and analytics

### 6. Account Setup (NEW!)
- AI-powered username/display name suggestions
- Platform-specific recommendations
- Niche auto-detection

## 🏗️ Stack

- **Frontend**: React 19 + Next.js 15 + TypeScript
- **Styling**: Tailwind CSS + custom UI components
- **Database**: Supabase PostgreSQL with RLS
- **Auth**: Supabase Auth + OAuth
- **AI**: Claude Haiku 4.5 (Anthropic)
- **Deployment**: Vercel

## 🔗 Quick Links

- [README.md](README.md) — This file
- [MEMORY.md](.claude/projects/-Users-colt-hasc-Documents-toktik/memory/MEMORY.md) — Project summary
- [QUICK_START_ACCOUNT_SUGGESTIONS.md](QUICK_START_ACCOUNT_SUGGESTIONS.md) — New feature guide

## 🐛 Common Issues

**Unauthorized on page load** → Check middleware.ts
**API errors 401/403** → Verify SUPABASE_SERVICE_ROLE_KEY
**DB migrations fail** → Run `npx supabase migration up`
**OAuth redirect error** → Check NEXT_PUBLIC_APP_URL

See TROUBLESHOOTING.md for complete troubleshooting guide.

---

**Last Updated**: March 2026
