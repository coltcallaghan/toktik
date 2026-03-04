import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';

const client = getAnthropicClient();

export async function POST(req: NextRequest) {
  const {
    topic,
    niche,
    style,
    // Account theme fields
    tone,
    content_style,
    target_audience,
    brand_voice,
    posting_goals,
    // New explicit inputs
    video_length,
    call_to_action,
    key_points,
  } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
  }

  // Determine word count target from video length
  const lengthMap: Record<string, string> = {
    '15s': '30-40 words (15 seconds)',
    '30s': '60-75 words (30 seconds)',
    '60s': '120-150 words (60 seconds)',
    '3min': '400-450 words (3 minutes)',
  };
  const targetLength = lengthMap[video_length] ?? '120-150 words (60 seconds)';

  const contextLines: string[] = [];
  if (niche)            contextLines.push(`Niche: ${niche}`);
  if (target_audience)  contextLines.push(`Target audience: ${target_audience}`);
  if (tone)             contextLines.push(`Tone: ${tone}`);
  if (content_style)    contextLines.push(`Content style: ${content_style}`);
  if (style)            contextLines.push(`Style notes: ${style}`);
  if (brand_voice)      contextLines.push(`Brand voice: ${brand_voice}`);
  if (posting_goals)    contextLines.push(`Posting goals: ${posting_goals}`);
  if (call_to_action)   contextLines.push(`Call to action: ${call_to_action}`);
  if (key_points?.length) contextLines.push(`Key points to cover:\n${(key_points as string[]).map((p: string) => `- ${p}`).join('\n')}`);

  const prompt = `You are an expert short-form video content creator. Write a compelling video script.

Topic: ${topic}
Target length: ${targetLength}
${contextLines.join('\n')}

Requirements:
- Open with a strong hook in the first 3 seconds that stops the scroll
- Match the tone and style described above precisely
- Use casual, conversational language unless brand voice says otherwise
- End with the specified call to action (or a follow/subscribe CTA if none given)
- Cover all key points if provided
- Output the script text only — no scene directions, no labels, no formatting markup

Write the script now:`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const script = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({ script });
}
