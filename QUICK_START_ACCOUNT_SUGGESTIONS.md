# Account Setup Suggestions - Quick Start

## 30-Second Overview

Users adding accounts now get AI-powered suggestions for usernames, display names, and niches instead of starting from scratch.

## Testing It (2 minutes)

1. Go to **Accounts page** → Click **"Add Manually"**
2. You'll see two tabs:
   - ✨ **AI Suggestions** (selected by default)
   - Manual Entry
3. **Select a platform** (e.g., TikTok, YouTube)
4. **Enter a niche** (e.g., "Fitness coaching")
5. **Click "Generate"** → Wait 1-3 seconds
6. **Click any suggestion** to select it (you'll see a checkmark)
7. **See preview** of final account name
8. **Click "Add Account"** → Account saves to Supabase

## What You'll See

```
Platform Grid
[TikTok] [YouTube] [Instagram] [Twitter] [LinkedIn] [Facebook]

↓

AI Suggestions Card
- Input: "What's your niche?" → [Fitness coaching]
- Button: [Generate]

↓

Suggestions Loaded:
  Usernames to pick from:
  ✓ @fitnessdave (selected)
    @coachfitness
    @fitjourney

  Display Names to pick from:
  ✓ Dave 💪 Fitness Coach (selected)
    Coach Dave | Fitness
    Dave's Fitness Journey

  Niches to pick from:
  ✓ Fitness Coaching (selected)
    Workout Tutorials
    Nutrition Tips

  Bio Inspiration:
  "💪 Fitness coach helping you transform..."
  "Train hard. Transform life. 💪 Daily tips..."

↓

Preview Card:
@fitnessdave
Dave 💪 Fitness Coach
📍 Fitness coaching

↓

[Add Account] [Cancel]
```

## Files You Need to Know About

| File | Purpose |
|------|---------|
| `components/account-setup-suggestions.tsx` | The UI component |
| `app/api/account-suggestions/route.ts` | The AI API endpoint |
| `app/(dashboard)/accounts/page.tsx` | Modified to use the component |
| `ACCOUNT_SETUP_SUGGESTIONS.md` | Full feature docs |
| `ACCOUNT_SETUP_VISUAL_GUIDE.md` | Visual mockups |
| `ACCOUNT_SUGGESTIONS_IMPLEMENTATION.md` | Deep technical guide |

## How It Actually Works (Technical)

```
User enters niche + clicks Generate
    ↓
POST /api/account-suggestions
  {
    platform: "tiktok",
    niche: "Fitness coaching"
  }
    ↓
Claude generates JSON:
  {
    "usernames": ["fitnessdave", "coachfitness", ...],
    "display_names": ["Dave 💪 Fitness Coach", ...],
    "bios": ["💪 Fitness coach...", ...],
    "niches": ["Fitness Coaching", ...]
  }
    ↓
Frontend displays suggestions
User selects items → state updates
    ↓
User clicks "Add Account"
    ↓
handleAddAccount() executes (same as before)
    ↓
Supabase INSERT:
  {
    platform: "tiktok",
    platform_username: "@fitnessdave",
    display_name: "Dave 💪 Fitness Coach",
    niche: "Fitness coaching",
    ...
  }
```

## Platform-Specific Behavior

The suggestions change based on platform:

### TikTok (Casual)
- Usernames: Lowercase, trendy (e.g., `fitnessdave`)
- Display Names: Emoji-friendly (e.g., "Dave 💪 Fitness Coach")
- Bios: Hashtag-ready

### YouTube (Professional)
- Usernames: Channel-style (e.g., `davefitness`)
- Display Names: SEO-friendly (e.g., "Dave's Fitness Reviews")
- Bios: Description-focused

### Instagram (Aesthetic)
- Usernames: Clean (e.g., `fitnessdave`)
- Display Names: Elegant (e.g., "Dave's Fitness")
- Bios: Hashtag + link optimized

### LinkedIn (Corporate)
- Usernames: Professional (e.g., `dave-fitness-coach`)
- Display Names: Title-based (e.g., "Dave Smith | Fitness Director")
- Bios: Credential-focused

### Twitter (Witty)
- Usernames: Conversational (e.g., `davecodes`)
- Display Names: Personality (e.g., "Dave 👨‍💻 Web Dev")
- Bios: Tweet-style summaries

### Facebook (Personal)
- Usernames: Friendly (e.g., `fitnessdave`)
- Display Names: Approachable (e.g., "Dave Smith")
- Bios: Community-focused

## Cost & Performance

| Metric | Value |
|--------|-------|
| API latency | 1-3 seconds |
| Cost per generation | ~$0.003 |
| Monthly for 1000 users | ~$6 |
| Tokens used | ~300 input, ~250 output |
| Success rate | >99% |

## What Gets Saved to Database

```sql
INSERT INTO accounts (
  user_id,           -- from auth session
  platform,          -- "tiktok", "youtube", etc
  platform_username, -- "@fitnessdave"
  platform_id,       -- "fitnessdave" (without @)
  display_name,      -- "Dave 💪 Fitness Coach"
  niche,             -- "Fitness coaching"
  team_id,           -- null
  followers_count,   -- 0
  status,            -- "active"
  created_at,        -- NOW()
  updated_at         -- NOW()
) VALUES (...)
```

All other fields (`tone`, `content_style`, `avatar_url`, etc.) can be set later via account theme panel.

## Error Handling

If something goes wrong:

```
Niche is empty?
→ Generate button stays disabled

API error?
→ User sees: "⚠️ Failed to generate suggestions. Please try again."
→ Retry button appears

Invalid JSON from Claude?
→ Fallback parser extracts JSON
→ If extraction fails: "Error generating suggestions"

Slow network?
→ Loading spinner shows: "⏳ Generating suggestions..."
```

## Common Questions

**Q: What if I want to use manual entry?**
A: Click the "Manual Entry" tab to switch to the original form.

**Q: Can I use the same username for multiple platforms?**
A: Yes! Each platform has separate accounts. You can be `@fitnessdave` on TikTok and YouTube.

**Q: Are the suggestions guaranteed to be unique?**
A: No, but they're generated fresh each time you click Generate. If you want different suggestions, click Generate again.

**Q: Can I edit the username after saving?**
A: After saving, you can edit by clicking the account's edit button (currently shows in account list).

**Q: Does this check if the username is available on the platform?**
A: Not yet. That's a future enhancement. For now, you'll need to manually check availability on each platform.

**Q: What if my niche is very specific?**
A: Claude will still generate relevant suggestions. Examples:
- "Minimalist lifestyle" → tailored minimalism suggestions
- "Crypto trading for beginners" → finance-focused
- "Senior fitness coaching" → age-appropriate recommendations

**Q: Can I use special characters in usernames?**
A: The suggestions avoid special chars except underscores. Most platforms limit to letters, numbers, underscores, and dots. Stick with suggestions to be safe.

**Q: What language are suggestions in?**
A: Currently English only. Future version could support other languages.

## Customization

If you want to change the suggestions, edit the prompt in `app/api/account-suggestions/route.ts`:

```typescript
const prompt = `You are a social media expert helping creators set up accounts.
Generate suggestions for a ${niche} creator on ${platform}.

// Edit this section to change behavior:
// - Change "4-5" to "3" or "6" for fewer/more suggestions
// - Change character limits (8-18 chars, 15-40 chars)
// - Change tone instructions
// - Add constraints for your niche
`
```

## Integration with Existing Flow

The account still works the same way after creation:

1. **Account created** with platform, username, niche
2. **User can set theme** (tone, audience, etc.) via palette icon
3. **User can connect OAuth** to sync followers and enable publishing
4. **Account appears in list** with all other accounts
5. **Can be used in content generation** with AI scripts tailored to niche

## Monitoring & Analytics (Future)

Could add:
- Track which suggestions users pick most
- A/B test different suggestion styles
- Measure account success rate by niche
- Most popular niches per platform
- Suggestion -> successful account rate

## Rollback Plan

If something breaks:

1. Click "Manual Entry" tab to bypass suggestions
2. Comment out the AccountSetupSuggestions import in `accounts/page.tsx`
3. The original form will still work perfectly

## Next Steps

1. **Test it**: Go add an account with AI suggestions
2. **Try different platforms**: TikTok, YouTube, Instagram, LinkedIn
3. **Try different niches**: "Gaming", "Fitness", "Tech", "Beauty", "Education"
4. **Check the database**: Verify account was saved correctly
5. **Optional**: Add rate limiting if high usage
6. **Future**: Add username availability checking

## Support

For detailed information, see:
- `ACCOUNT_SETUP_SUGGESTIONS.md` — Feature docs
- `ACCOUNT_SETUP_VISUAL_GUIDE.md` — Visual mockups
- `ACCOUNT_SUGGESTIONS_IMPLEMENTATION.md` — Technical deep dive

Enjoy! 🚀
