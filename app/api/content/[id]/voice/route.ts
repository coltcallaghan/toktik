import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── POST /api/content/[id]/voice ─────────────────────────────── */
/* Generates a voiceover for a content item's script using          */
/* ElevenLabs TTS API or a built-in browser TTS fallback.           */

const ELEVEN_LABS_API = 'https://api.elevenlabs.io/v1';

const DEFAULT_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', accent: 'American Female' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', accent: 'American Female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', accent: 'American Female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', accent: 'American Male' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', accent: 'American Female' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', accent: 'American Male' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', accent: 'American Male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', accent: 'American Male' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', accent: 'American Male' },
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get content
    const { data: content, error: contentErr } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();

    if (contentErr || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const body = await req.json();
    const voiceId: string = body.voice_id ?? DEFAULT_VOICES[0].id;
    const stability: number = body.stability ?? 0.5;
    const similarityBoost: number = body.similarity_boost ?? 0.75;

    // Clean script text for TTS
    const scriptText = (content.script ?? '')
      .replace(/^HOOK:.*\n\n?/i, '') // Remove HOOK label
      .replace(/\[pause\]/gi, '... ')
      .trim();

    if (!scriptText) {
      return NextResponse.json({ error: 'No script text to convert' }, { status: 400 });
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsKey) {
      // Return info that ElevenLabs isn't configured — client can use browser TTS
      return NextResponse.json({
        fallback: true,
        text: scriptText,
        message: 'ElevenLabs API key not configured. Use browser TTS as fallback.',
        voices: DEFAULT_VOICES,
      });
    }

    // Call ElevenLabs TTS
    const ttsRes = await fetch(`${ELEVEN_LABS_API}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: scriptText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    });

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text();
      console.error('ElevenLabs error:', errBody);
      return NextResponse.json(
        { error: 'ElevenLabs API error', details: errBody },
        { status: ttsRes.status }
      );
    }

    // Upload audio to Supabase storage
    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    const fileName = `voiceovers/${id}_${Date.now()}.mp3`;

    const { error: uploadErr } = await supabase.storage
      .from('videos')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('videos').getPublicUrl(fileName);

    // Update content with voiceover URL
    await supabase
      .from('content')
      .update({
        engagement_metrics: {
          ...(content.engagement_metrics as Record<string, unknown> ?? {}),
          voiceover_url: publicUrl,
        },
      })
      .eq('id', id);

    return NextResponse.json({
      voiceover_url: publicUrl,
      voice_id: voiceId,
      duration_estimate: Math.ceil(scriptText.split(/\s+/).length / 2.5), // ~150 wpm
    });
  } catch (err) {
    console.error('voice generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/* ── GET /api/content/[id]/voice — list available voices ─────── */

export async function GET() {
  return NextResponse.json({
    voices: DEFAULT_VOICES,
    has_api_key: !!process.env.ELEVENLABS_API_KEY,
  });
}
