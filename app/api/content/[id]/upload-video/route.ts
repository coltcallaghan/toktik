import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contentId } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify the content belongs to the user
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id, account_id, accounts!inner(user_id)')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('video') as File | null;
    if (!file) return NextResponse.json({ error: 'No video file provided' }, { status: 400 });

    const ext = file.name.split('.').pop() ?? 'mp4';
    const storagePath = `${user.id}/${contentId}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(storagePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error('video upload error:', uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get a signed URL valid for 1 hour (for playback in dashboard)
    const { data: signed } = await supabase.storage
      .from('videos')
      .createSignedUrl(storagePath, 3600);

    // Store the storage path on the content record
    await supabase
      .from('content')
      .update({ video_url: storagePath })
      .eq('id', contentId);

    return NextResponse.json({ success: true, video_url: storagePath, preview_url: signed?.signedUrl });
  } catch (err) {
    console.error('upload-video error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
