import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { platform, niche } = await req.json();

    if (!platform || !niche) {
      return NextResponse.json(
        { error: 'platform and niche are required' },
        { status: 400 }
      );
    }

    const prompt = `You are a social media expert helping creators set up accounts. Generate suggestions for a ${niche} creator on ${platform}.

Return ONLY valid JSON with no markdown formatting, no code blocks, and no additional text. The response must be valid JSON that can be parsed:

{
  "usernames": ["username1", "username2", "username3", "username4"],
  "display_names": ["Display Name 1", "Display Name 2", "Display Name 3", "Display Name 4"],
  "bios": ["bio1", "bio2"],
  "niches": ["niche1", "niche2", "niche3"]
}

Rules:
- usernames: 4-5 creative, memorable usernames (lowercase, no special chars except _ or numbers). Each 8-18 chars. Should feel natural on ${platform}.
- display_names: 4-5 professional, catchy display names (proper case). Can include emojis if appropriate for ${platform}. 15-40 chars each.
- bios: 2 short, platform-appropriate bio suggestions. For ${platform}. Include relevant emojis. Max 150 chars each.
- niches: 3-4 related niche categories that align with "${niche}".

Context:
- Platform: ${platform}
- Creator's main niche: ${niche}
- Only return valid JSON - no explanation, no markdown, no code blocks.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response type from Claude' },
        { status: 500 }
      );
    }

    // Parse the response - it should be valid JSON
    let suggestions;
    try {
      suggestions = JSON.parse(content.text);
    } catch (parseErr) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }
      suggestions = JSON.parse(jsonMatch[0]);
    }

    // Validate structure
    if (
      !Array.isArray(suggestions.usernames) ||
      !Array.isArray(suggestions.display_names) ||
      !Array.isArray(suggestions.bios) ||
      !Array.isArray(suggestions.niches)
    ) {
      return NextResponse.json(
        { error: 'Invalid suggestion format from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json(suggestions);
  } catch (err) {
    console.error('account-suggestions error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
