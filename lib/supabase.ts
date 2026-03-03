import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          user_id: string;
          platform: 'tiktok' | 'youtube' | 'instagram' | 'twitter' | 'linkedin' | 'facebook';
          platform_username: string;
          platform_id: string;
          team_id: string | null;
          followers_count: number;
          status: 'active' | 'paused' | 'inactive';
          niche: string | null;
          tiktok_open_id: string | null;
          tiktok_access_token: string | null;
          tiktok_refresh_token: string | null;
          tiktok_token_expires_at: string | null;
          avatar_url: string | null;
          display_name: string | null;
          tone: 'casual' | 'educational' | 'humorous' | 'inspirational' | 'professional' | 'edgy' | null;
          content_style: 'storytelling' | 'tutorial' | 'listicle' | 'commentary' | 'challenge' | 'day-in-life' | 'product-review' | null;
          target_audience: string | null;
          posting_goals: string | null;
          brand_voice: string | null;
          tiktok_email: string | null;
          tiktok_password_encrypted: string | null;
          tiktok_phone_encrypted: string | null;
          platform_access_token: string | null;
          platform_refresh_token: string | null;
          platform_token_expires_at: string | null;
          platform_user_id: string | null;
          platform_page_id: string | null;
          platform_metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          members: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      content: {
        Row: {
          id: string;
          account_id: string;
          team_id: string | null;
          title: string;
          script: string;
          video_url: string | null;
          status: 'draft' | 'scheduled' | 'published' | 'failed';
          scheduled_at: string | null;
          published_at: string | null;
          engagement_metrics: {
            views?: number;
            likes?: number;
            comments?: number;
            shares?: number;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['content']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['content']['Insert']>;
      };
      trends: {
        Row: {
          id: string;
          user_id: string;
          trend_name: string;
          category: string;
          momentum: number;
          description: string | null;
          detected_at: string;
          expires_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trends']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['trends']['Insert']>;
      };
    };
  };
};

export type Account = Database['public']['Tables']['accounts']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type Content = Database['public']['Tables']['content']['Row'];
export type Trend = Database['public']['Tables']['trends']['Row'];
