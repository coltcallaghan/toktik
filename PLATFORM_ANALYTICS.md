# Multi-Platform Analytics & Engagement Metrics

This document explains how TokTik handles engagement metrics across all supported platforms: **TikTok, YouTube, Instagram, Facebook, Twitter/X, and LinkedIn**.

## 📊 Engagement Metrics Structure

All published content stores metrics in the `engagement_metrics` JSONB field:

```json
{
  "platform_post_id": "v230819c123456...",
  "views": 1247,
  "likes": 156,
  "comments": 23,
  "shares": 8,
  "last_synced_at": "2026-03-03T14:32:00Z",

  "caption": "My awesome video...",
  "video_status": "done",
  "creatomate_render_id": "render_123",

  // Platform-specific fields
  "tiktok_video_id": "7284712840...",
  "tiktok_publish_id": "v230819c..."
}
```

**Required field for syncing:** `platform_post_id` — the unique identifier for the post on that platform

## 🔄 How Metrics are Synced

### 1. **Publishing a Post**

When you publish content (via `/api/content/[id]/publish`):

```
┌─ User clicks "Publish"
│
├─ TokTik posts video to platform's API
│  ├─ TikTok: `POST /v2/post/publish/video/init/` → returns publish_id → polls for video_id
│  ├─ YouTube: Video uploaded as draft
│  ├─ Instagram: Media item created
│  ├─ Facebook: Post created
│  ├─ Twitter: Tweet posted
│  └─ LinkedIn: Post created
│
├─ Store in `engagement_metrics`:
│  ├─ platform_post_id (the platform's unique ID)
│  ├─ Initial metrics: views=0, likes=0, comments=0, shares=0
│  └─ last_synced_at: now
│
└─ Return to user with post ID
```

### 2. **Manual Sync (On-Demand)**

User can sync any published post anytime:

```bash
POST /api/content/sync-metrics-universal
{
  "content_id": "abc123"
}

Response:
{
  "success": true,
  "platform": "tiktok",
  "post_id": "v230819c123456...",
  "metrics": {
    "views": 1247,
    "likes": 156,
    "comments": 23,
    "shares": 8
  },
  "last_synced": "2026-03-03T14:32:00Z"
}
```

### 3. **Automatic Sync (Cron Job)**

Hourly cron job syncs all recent published content:

```bash
GET /api/cron/sync-all-platforms
Header: Authorization: Bearer <CRON_SECRET>

Response:
{
  "total": 30,
  "synced": 27,
  "skipped": 2,
  "failed": 1,
  "by_platform": {
    "tiktok": { "success": 15, "skip": 1, "error": 0 },
    "youtube": { "success": 8, "skip": 1, "error": 0 },
    "instagram": { "success": 4, "skip": 0, "error": 1 }
  },
  "results": [...]
}
```

## 🔗 Platform-Specific Implementation

### **TikTok**

- **Post ID:** `tiktok_video_id` (from `/v2/video/query/` response)
- **Analytics Endpoint:** `POST /v2/video/query/?fields=view_count,like_count,comment_count,share_count`
- **Fields Returned:** Views ✅, Likes ✅, Comments ✅, Shares ✅

```typescript
{
  "platform_post_id": "7284712840123456789",
  "views": 1247,
  "likes": 156,
  "comments": 23,
  "shares": 8
}
```

### **YouTube**

- **Post ID:** `youtube_video_id` (video ID from `/channels?mine=true`)
- **Analytics Endpoint:** `GET /youtube/v3/videos?part=statistics&id=VIDEO_ID`
- **Fields Returned:** Views ✅, Likes ✅, Comments ✅, Shares ❌ (not available)

```typescript
{
  "platform_post_id": "dQw4w9WgXcQ",
  "views": 125000,
  "likes": 8500,
  "comments": 1200,
  "shares": 0  // Not available
}
```

### **Instagram**

- **Post ID:** `instagram_media_id` (media ID from `/me/media`)
- **Analytics Endpoint:** `GET /v18.0/MEDIA_ID?fields=like_count,comments_count`
- **Limitations:** Views not available for most accounts (requires Business Account + Insights API)
- **Fields Returned:** Views ❌, Likes ✅, Comments ✅, Shares ❌

```typescript
{
  "platform_post_id": "17999123456789012",
  "views": 0,        // Requires Business Account + Insights API
  "likes": 450,
  "comments": 32,
  "shares": 0        // Not available
}
```

### **Facebook**

- **Post ID:** `facebook_post_id` (from `/me/feed`)
- **Analytics Endpoint:** `GET /v18.0/POST_ID?fields=shares,likes.summary(total_count),comments.summary(total_count)`
- **Limitations:** Views not available via Graph API for regular posts
- **Fields Returned:** Views ❌, Likes ✅, Comments ✅, Shares ✅

```typescript
{
  "platform_post_id": "123456789_987654321",
  "views": 0,        // Not available
  "likes": 320,
  "comments": 45,
  "shares": 18
}
```

### **Twitter/X**

- **Post ID:** `twitter_tweet_id` (tweet ID)
- **Analytics Endpoint:** `GET /2/tweets/TWEET_ID?tweet.fields=public_metrics`
- **Fields Returned:** Views (impressions) ✅, Likes ✅, Comments (replies) ✅, Shares (retweets) ✅

```typescript
{
  "platform_post_id": "1234567890",
  "views": 5432,      // impression_count
  "likes": 234,
  "comments": 89,     // reply_count
  "shares": 456       // retweet_count
}
```

### **LinkedIn**

- **Post ID:** `linkedin_urn` (post URN: `urn:li:share:SHARE_ID`)
- **Analytics Endpoint:** `GET /v2/shares?q=source&sourceUrn=URN`
- **Fields Returned:** Views ✅, Likes ✅, Comments ✅, Shares ✅

```typescript
{
  "platform_post_id": "urn:li:share:1234567890123456789",
  "views": 12500,
  "likes": 450,
  "comments": 78,
  "shares": 23
}
```

## ✅ Publishing Implementation Checklist

When implementing publishing for a new platform, ensure you:

1. **Store the platform post ID** in `engagement_metrics.platform_post_id` after publishing
   ```typescript
   engagement_metrics: {
     platform_post_id: response.id,  // or response.video_id, response.media_id, etc.
     views: 0,
     likes: 0,
     comments: 0,
     shares: 0,
   }
   ```

2. **Add platform analytics fetching** to `lib/platform-analytics.ts`
   ```typescript
   export async function fetchPlatformAnalytics(
     platform: PlatformKey,
     accessToken: string,
     postId: string
   ): Promise<PlatformAnalytics | null>
   ```

3. **Update `PlatformKey` type** to include new platform

4. **Test manual sync**
   ```bash
   curl -X POST http://localhost:3000/api/content/sync-metrics-universal \
     -H "Content-Type: application/json" \
     -d '{"content_id": "..."}'
   ```

5. **Cron job automatically syncs** new platform once added to `fetchPlatformAnalytics`

## 🔐 Security & Rate Limiting

- ✅ All analytics endpoints require valid OAuth tokens
- ✅ Tokens auto-refresh when expired (via `platform_refresh_token`)
- ✅ Rate limiting: Cron job skips posts synced in last 2 hours
- ✅ Service-role key required for cron jobs to access all users' content

## 📈 Dashboard Metrics Calculation

Dashboard calculates in real-time from synced metrics:

```typescript
const publishedContent = content.filter(c => c.status === 'published');

// Total metrics across all platforms
const totalViews = publishedContent.reduce(
  (sum, c) => sum + (c.engagement_metrics?.views ?? 0), 0
);

const totalEngagement = publishedContent.reduce((sum, c) => {
  const m = c.engagement_metrics ?? {};
  return sum + (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0);
}, 0);

// Engagement rate
const engagementRate = totalViews > 0
  ? ((totalEngagement / totalViews) * 100).toFixed(1)
  : '0';
```

## 🚀 Setting Up Cron Sync

### Option A: Vercel Cron (Automatic)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all-platforms",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Option B: External Scheduler

Set up EasyCron or similar service to call:
```
GET https://yourdomain.com/api/cron/sync-all-platforms
Header: Authorization: Bearer <CRON_SECRET>
```

Schedule: Every 60 minutes

## 🔍 Troubleshooting

**Problem:** `platform_post_id not found`
- **Solution:** Ensure publishing endpoint stores the platform's post ID in `engagement_metrics.platform_post_id`

**Problem:** Metrics not updating
- **Solution:**
  1. Check token is valid: `platform_access_token` in accounts table
  2. Verify post ID is stored correctly
  3. Call manual sync: `/api/content/sync-metrics-universal`
  4. Check cron job logs

**Problem:** Some platforms return 0 views
- **Solution:** This is normal - some platforms don't expose views (Instagram, Facebook require Business Account + Insights API)

## 📝 API Reference

### Sync Single Post (Manual)

```
POST /api/content/sync-metrics-universal
Content-Type: application/json

{
  "content_id": "uuid"
}

Response: 200 OK
{
  "success": true,
  "platform": "tiktok",
  "post_id": "video_id",
  "metrics": {
    "views": 1247,
    "likes": 156,
    "comments": 23,
    "shares": 8
  },
  "last_synced": "2026-03-03T14:32:00Z"
}
```

### Sync All (Cron)

```
GET /api/cron/sync-all-platforms
Authorization: Bearer <CRON_SECRET>

Response: 200 OK
{
  "total": 30,
  "synced": 27,
  "skipped": 2,
  "failed": 1,
  "by_platform": {...},
  "results": [...]
}
```

---

**Last Updated:** 2026-03-03
**Supported Platforms:** TikTok, YouTube, Instagram, Facebook, Twitter/X, LinkedIn
