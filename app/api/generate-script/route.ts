import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';

const client = getAnthropicClient();

export async function POST(req: NextRequest) {
  const { topic, niche, style } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
  }

  const prompt = `You are an expert TikTok content creator. Write a short, engaging TikTok video script.

Topic: ${topic}
Niche: ${niche ?? 'General'}
Style: ${style ?? 'Entertaining and informative'}

Requirements:
- Keep it under 60 seconds when spoken aloud (~120-150 words)
- Start with a strong hook in the first 3 seconds
- Include a clear call-to-action at the end
- Use casual, conversational language
- Include natural pauses indicated by [pause]
- Format: just the script text, no scene directions

Write the script now:`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const script = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({ script });
}
