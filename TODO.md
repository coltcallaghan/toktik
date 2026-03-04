# AudienceAI — Launch Checklist

## 🔑 API Keys & Environment Variables

### Already Working
- [x] `NEXT_PUBLIC_SUPABASE_URL` — configured
- [x] `NEXT_PUBLIC_SUPABASE_KEY` — configured
- [x] `SUPABASE_SERVICE_ROLE_KEY` — configured
- [x] `ANTHROPIC_API_KEY` — configured (BYOK: users bring their own too)
- [x] `CREATOMATE_API_KEY` — configured (video + caption generation)

### Still Needed
- [ ] `STRIPE_SECRET_KEY` — get from https://dashboard.stripe.com/apikeys
- [ ] `STRIPE_PRICE_CREATOR` — create Creator plan price in Stripe dashboard
- [ ] `STRIPE_PRICE_AGENCY` — create Agency plan price in Stripe dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` — register webhook at https://dashboard.stripe.com/webhooks
  - Endpoint: `https://yourdomain.com/api/billing/stripe-webhook`
  - Events: `checkout.session.completed`, `customer.subscription.deleted`
- [ ] `NEXT_PUBLIC_APP_URL` — set to your production domain (e.g. `https://audienceai.co`)
- [ ] `CRON_SECRET` — random string to protect `/api/cron/publish-scheduled`
- [ ] `CREDENTIALS_ENC_KEY` — long random string for encrypting OAuth tokens

---

## 📱 Platform OAuth Setup

Each platform needs a developer app created. Users connect their accounts via OAuth.

### TikTok
- [ ] Go to https://developers.tiktok.com/
- [ ] Create app → enable **Login Kit** + **Content Posting API**
- [ ] Add redirect URI: `https://yourdomain.com/api/auth/tiktok/callback`
- [ ] Copy `Client Key` → `TIKTOK_CLIENT_KEY`
- [ ] Copy `Client Secret` → `TIKTOK_CLIENT_SECRET`

### YouTube / Google
- [ ] Go to https://console.cloud.google.com/
- [ ] Create project → APIs & Services → Enable **YouTube Data API v3**
- [ ] Create **OAuth 2.0 Client ID** (Web application)
- [ ] Add redirect URI: `https://yourdomain.com/api/auth/youtube/callback`
- [ ] Copy Client ID → `GOOGLE_CLIENT_ID`
- [ ] Copy Client Secret → `GOOGLE_CLIENT_SECRET`

### Instagram & Facebook (same Meta app)
- [ ] Go to https://developers.facebook.com/
- [ ] Create app → add **Instagram Graph API** + **Facebook Login**
- [ ] Add redirect URIs:
  - `https://yourdomain.com/api/auth/instagram/callback`
  - `https://yourdomain.com/api/auth/facebook/callback`
- [ ] Copy App ID → `META_APP_ID`
- [ ] Copy App Secret → `META_APP_SECRET`

### Twitter / X
- [ ] Go to https://developer.twitter.com/en/portal/projects-and-apps
- [ ] Create project + app → enable **OAuth 2.0** with PKCE
- [ ] Add redirect URI: `https://yourdomain.com/api/auth/twitter/callback`
- [ ] Copy Client ID → `TWITTER_CLIENT_ID`
- [ ] Copy Client Secret → `TWITTER_CLIENT_SECRET`
- [ ] Note: Basic tier is $100/mo — required for posting

### LinkedIn
- [ ] Go to https://www.linkedin.com/developers/apps
- [ ] Create app → add **Sign In with LinkedIn** + **Share on LinkedIn**
- [ ] Add redirect URI: `https://yourdomain.com/api/auth/linkedin/callback`
- [ ] Copy Client ID → `LINKEDIN_CLIENT_ID`
- [ ] Copy Client Secret → `LINKEDIN_CLIENT_SECRET`

---

## 🗄️ Database Migrations

- [ ] Run `supabase db push` to apply all pending migrations
  - Includes: `20240021000000_competitors_platform.sql` (adds `platform` column to competitors)

---

## 💳 Stripe Setup

- [ ] Create two products in Stripe dashboard:
  - **Creator** — $X/mo (set your price)
  - **Agency** — $X/mo (set your price)
- [ ] Copy price IDs to env vars (`STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_AGENCY`)
- [ ] Register webhook (see API Keys section above)
- [ ] Test checkout flow end-to-end in Stripe test mode first

---

## ⏰ Cron Job (Scheduled Publishing)

- [ ] Set up cron to hit `GET /api/cron/publish-scheduled` every minute
  - **Vercel**: add to `vercel.json` → `{ "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "* * * * *" }] }`
  - **External**: use cron-job.org or similar, pass `Authorization: Bearer {CRON_SECRET}` header

---

## 🚀 Pre-Launch

- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain in all OAuth redirect URIs
- [ ] Test signup → payment → plan upgrade flow
- [ ] Test at least one platform OAuth connect (TikTok recommended first)
- [ ] Apply Supabase DB migrations on production
- [ ] Add custom domain in Vercel / hosting provider
- [ ] Set up Stripe webhook in production (not just test mode)

---

## 💡 Optional Future Improvements

- [ ] YouTube Data API for real subscriber counts on competitors page (`YOUTUBE_API_KEY`)
- [ ] Google Trends API integration for real trend momentum data
- [ ] HeyGen API key for AI avatar video generation (`HEYGEN_API_KEY`)
- [ ] Runway ML API key for AI video generation (`RUNWAY_API_KEY`)
- [ ] Wire up Distribute tab for non-TikTok platforms (currently shows "coming soon")
- [ ] Wire up Settings page (appearance/notification preferences) to Supabase
