import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Peak engagement hours for TikTok (local-time based heuristic)
const PEAK_HOURS = [7, 8, 9, 12, 13, 17, 18, 19, 20, 21];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentId } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { scheduled_at, auto } = body as { scheduled_at?: string; auto?: boolean };

    // Verify content belongs to user
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id, status, account_id, accounts!inner(user_id)')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    let finalScheduledAt: string;
    let autoScheduled = false;

    if (auto) {
      // Auto-schedule: pick the next available peak hour
      finalScheduledAt = pickOptimalTime(contentId);
      autoScheduled = true;
    } else if (scheduled_at) {
      const date = new Date(scheduled_at);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      if (date < new Date()) {
        return NextResponse.json({ error: 'Cannot schedule in the past' }, { status: 400 });
      }
      finalScheduledAt = date.toISOString();
    } else {
      return NextResponse.json(
        { error: 'Provide scheduled_at or auto: true' },
        { status: 400 }
      );
    }

    // Update content
    const { error: updateError } = await supabase
      .from('content')
      .update({
        scheduled_at: finalScheduledAt,
        status: 'scheduled',
        schedule_status: 'pending',
        auto_scheduled: autoScheduled,
      })
      .eq('id', contentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scheduled_at: finalScheduledAt,
      auto_scheduled: autoScheduled,
    });
  } catch (err) {
    console.error('schedule error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Pick the next available peak engagement hour.
 * Walks forward from now and picks the next peak hour that's at least 1 hour away.
 */
function pickOptimalTime(contentId: string): string {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setMinutes(0, 0, 0);

  // Start from next hour
  candidate.setHours(candidate.getHours() + 1);

  // Walk forward until we hit a peak hour, up to 48 hours
  for (let i = 0; i < 48; i++) {
    const hour = candidate.getHours();
    if (PEAK_HOURS.includes(hour)) {
      return candidate.toISOString();
    }
    candidate.setHours(candidate.getHours() + 1);
  }

  // Fallback: tomorrow at 9 AM
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback.toISOString();
}
