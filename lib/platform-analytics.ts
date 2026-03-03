/**
 * Platform-agnostic analytics fetching
 * Handles TikTok, YouTube, Instagram, Facebook, Twitter, LinkedIn
 */

export interface PlatformAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  platform_post_id: string;
}

export type PlatformKey = 'tiktok' | 'youtube' | 'instagram' | 'facebook' | 'twitter' | 'linkedin';

/**
 * Fetch analytics for a published post on any platform
 */
export async function fetchPlatformAnalytics(
  platform: PlatformKey,
  accessToken: string,
  postId: string,
  refreshToken?: string | null
): Promise<PlatformAnalytics | null> {
  try {
    switch (platform) {
      case 'tiktok':
        return await fetchTikTokAnalytics(accessToken, postId);
      case 'youtube':
        return await fetchYouTubeAnalytics(accessToken, postId);
      case 'instagram':
        return await fetchInstagramAnalytics(accessToken, postId);
      case 'facebook':
        return await fetchFacebookAnalytics(accessToken, postId);
      case 'twitter':
        return await fetchTwitterAnalytics(accessToken, postId);
      case 'linkedin':
        return await fetchLinkedInAnalytics(accessToken, postId);
      default:
        return null;
    }
  } catch (err) {
    console.error(`Failed to fetch ${platform} analytics:`, err);
    return null;
  }
}

// ── TikTok ─────────────────────────────────────────────────────────

async function fetchTikTokAnalytics(accessToken: string, videoId: string): Promise<PlatformAnalytics | null> {
  const res = await fetch(
    'https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: { video_ids: [videoId] },
      }),
    }
  );

  const data = await res.json() as any;
  const video = data.data?.videos?.[0];

  if (!video) return null;

  return {
    views: video.view_count ?? 0,
    likes: video.like_count ?? 0,
    comments: video.comment_count ?? 0,
    shares: video.share_count ?? 0,
    platform_post_id: videoId,
  };
}

// ── YouTube ────────────────────────────────────────────────────────

async function fetchYouTubeAnalytics(accessToken: string, videoId: string): Promise<PlatformAnalytics | null> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await res.json() as any;
  const stats = data.items?.[0]?.statistics;

  if (!stats) return null;

  return {
    views: parseInt(stats.viewCount ?? '0', 10),
    likes: parseInt(stats.likeCount ?? '0', 10),
    comments: parseInt(stats.commentCount ?? '0', 10),
    shares: 0, // YouTube API doesn't expose shares
    platform_post_id: videoId,
  };
}

// ── Instagram ──────────────────────────────────────────────────────

async function fetchInstagramAnalytics(
  accessToken: string,
  mediaId: string
): Promise<PlatformAnalytics | null> {
  // Instagram Graph API v18.0+
  const res = await fetch(
    `https://graph.instagram.com/v18.0/${mediaId}?fields=like_count,comments_count,ig_id`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await res.json() as any;

  if (data.error) return null;

  // Note: Instagram doesn't expose view counts for most users (requires business account)
  return {
    views: 0, // Would need Insights API for business accounts
    likes: data.like_count ?? 0,
    comments: data.comments_count ?? 0,
    shares: 0, // Not available via API
    platform_post_id: mediaId,
  };
}

// ── Facebook ───────────────────────────────────────────────────────

async function fetchFacebookAnalytics(
  accessToken: string,
  postId: string
): Promise<PlatformAnalytics | null> {
  // Facebook Graph API
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${postId}?fields=shares,likes.limit(0).summary(total_count),comments.limit(0).summary(total_count),type`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await res.json() as any;

  if (data.error) return null;

  return {
    views: 0, // Facebook doesn't expose views via Graph API for regular posts
    likes: data.likes?.summary?.total_count ?? 0,
    comments: data.comments?.summary?.total_count ?? 0,
    shares: data.shares ?? 0,
    platform_post_id: postId,
  };
}

// ── Twitter/X ──────────────────────────────────────────────────────

async function fetchTwitterAnalytics(accessToken: string, tweetId: string): Promise<PlatformAnalytics | null> {
  // Twitter API v2
  const res = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await res.json() as any;
  const metrics = data.data?.public_metrics;

  if (!metrics) return null;

  return {
    views: metrics.impression_count ?? 0,
    likes: metrics.like_count ?? 0,
    comments: metrics.reply_count ?? 0,
    shares: metrics.retweet_count ?? 0,
    platform_post_id: tweetId,
  };
}

// ── LinkedIn ───────────────────────────────────────────────────────

async function fetchLinkedInAnalytics(accessToken: string, postId: string): Promise<PlatformAnalytics | null> {
  // LinkedIn API v2
  const res = await fetch(
    `https://api.linkedin.com/v2/shares?q=source&sourceUrn=${postId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  const data = await res.json() as any;
  const share = data.elements?.[0];

  if (!share) return null;

  return {
    views: share.viewCount ?? 0,
    likes: share.likeCount ?? 0,
    comments: share.commentCount ?? 0,
    shares: share.shareCount ?? 0,
    platform_post_id: postId,
  };
}
