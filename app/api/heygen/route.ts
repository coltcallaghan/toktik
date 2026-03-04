import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── GET /api/heygen?type=avatars|voices ─────────────────────────── */

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const heygenKey = process.env.HEYGEN_API_KEY;
  if (!heygenKey) return NextResponse.json({ error: 'HeyGen not configured' }, { status: 500 });

  const type = req.nextUrl.searchParams.get('type') ?? 'avatars';

  try {
    if (type === 'avatars') {
      const res = await fetch('https://api.heygen.com/v2/avatars', {
        headers: { 'x-api-key': heygenKey },
      });
      const data = await res.json() as { data: { avatars: HeyGenAvatar[] }; error: null | { message: string } };
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

      // Return only non-premium, with preview assets — limit to 60 for perf
      const avatars = data.data.avatars
        .filter((a) => !a.premium && a.preview_image_url)
        .slice(0, 60)
        .map((a) => ({
          avatar_id: a.avatar_id,
          name: a.avatar_name,
          gender: a.gender,
          preview_image: a.preview_image_url,
          preview_video: a.preview_video_url,
        }));

      return NextResponse.json({ avatars });
    }

    if (type === 'voices') {
      const res = await fetch('https://api.heygen.com/v2/voices', {
        headers: { 'x-api-key': heygenKey },
      });
      const data = await res.json() as { data: { voices: HeyGenVoice[] }; error: null | { message: string } };
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

      const voices = data.data.voices
        .filter((v) => v.language === 'English' && v.name?.trim())
        .slice(0, 40)
        .map((v) => ({
          voice_id: v.voice_id,
          name: v.name.trim(),
          gender: v.gender,
          preview_audio: v.preview_audio,
        }));

      return NextResponse.json({ voices });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url: string;
  premium: boolean;
}

interface HeyGenVoice {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio: string;
}
