# Account Setup Suggestions Feature

AI-powered suggestions for account names, display names, and niches when adding new social media accounts.

## Overview

When users add a new account, they now have two options:

1. **✨ AI Suggestions** (default) — Get smart, platform-specific name recommendations
2. **Manual Entry** — Traditional form entry

## How It Works

### Frontend Flow

1. User selects platform (TikTok, YouTube, Instagram, etc.)
2. User enters their content niche (e.g., "Fitness coaching", "Tech reviews")
3. Clicks "Generate" to get AI suggestions
4. Component shows:
   - **Usernames**: 4-5 creative, memorable usernames (8-18 chars)
   - **Display Names**: 4-5 professional names (15-40 chars, may include emojis)
   - **Niches**: 3-4 related content categories
   - **Bio Inspiration**: 2 platform-appropriate bio templates

5. User clicks any suggestion to select it (visual confirmation with checkmark)
6. Preview card shows final username, display name, and niche
7. Click "Add Account" to save

### Backend Flow

**Endpoint**: `POST /api/account-suggestions`

**Request**:
```json
{
  "platform": "tiktok",
  "niche": "Fitness coaching"
}
```

**Response**:
```json
{
  "usernames": [
    "fitnessdave",
    "coachfitness",
    "fitjourney",
    "traindave"
  ],
  "display_names": [
    "Dave 💪 Fitness Coach",
    "Coach Dave | Fitness",
    "Dave's Fitness Journey",
    "Fitness with Dave"
  ],
  "bios": [
    "💪 Fitness coach | Helping you reach your goals 🎯",
    "Transform your body 💪 Personal training tips daily 📍 DMs open"
  ],
  "niches": [
    "Fitness Coaching",
    "Workout Tutorials",
    "Nutrition Tips",
    "Transformation Stories"
  ]
}
```

## Components

### `components/account-setup-suggestions.tsx`

Interactive suggestion cards with:
- Niche input field with "Generate" button
- Selectable username cards (with character count)
- Selectable display name cards
- Clickable niche tags
- Bio inspiration cards (copy-to-clipboard ready)
- Pro tips section with best practices
- Error and loading states
- Platform-specific color theming

**Props**:
```typescript
interface AccountSetupSuggestionsProps {
  platform: 'tiktok' | 'youtube' | 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  niche?: string;
  selectedUsername?: string;
  selectedDisplayName?: string;
  onSelect: (data: {
    username: string;
    display_name?: string;
    niche?: string;
  }) => void;
}
```

### `app/api/account-suggestions/route.ts`

Uses Claude Haiku to generate platform-specific suggestions:

1. Takes platform name and niche
2. Crafts a prompt requesting JSON-formatted suggestions
3. Calls Claude API
4. Parses and validates JSON response
5. Returns suggestions

**Prompt Strategy**:
- Requests suggestions in strict JSON format (no markdown)
- Specifies exact field names and counts
- Platform-aware (different styles for LinkedIn vs TikTok)
- Includes constraints (character counts, naming rules)
- Forces valid JSON-only responses

## Integration

### In Accounts Page

Modified `app/(dashboard)/accounts/page.tsx`:

1. Added state: `addMode`, `addDisplayName`
2. Added tab selector: "✨ AI Suggestions" / "Manual Entry"
3. AI Suggestions mode shows:
   - Platform selector
   - `<AccountSetupSuggestions />` component
   - Live preview card
   - Add Account button
4. Manual Entry mode shows original form

### Data Flow

```
User enters niche
  ↓
Clicks "Generate"
  ↓
POST /api/account-suggestions
  ↓
Claude generates JSON
  ↓
Display suggestions with checkmarks
  ↓
User clicks selections
  ↓
State updates: addUsername, addDisplayName, addNiche
  ↓
Preview card updates in real-time
  ↓
User clicks "Add Account"
  ↓
Same handleAddAccount() function executes
  ↓
Account saved to Supabase with:
  - platform_username: @username
  - display_name: "Display Name"
  - niche: "Fitness coaching"
```

## Platform-Specific Behavior

### TikTok
- Usernames: Casual, lowercase (e.g., `fitnessdave`)
- Display Names: Emoji-friendly (e.g., "Dave 💪 Fitness Coach")
- Bios: Trendy, hashtag-ready
- Niches: Entertainment-focused

### YouTube
- Usernames: Channel-ready (e.g., `davefitness`)
- Display Names: Professional & searchable
- Bios: SEO-friendly, description-style
- Niches: Content category-focused

### Instagram
- Usernames: Clean, brand-friendly
- Display Names: Elegant (e.g., "Dave's Fitness")
- Bios: Hashtag & link optimized
- Niches: Aesthetic-focused

### LinkedIn
- Usernames: Professional (e.g., `dave-fitness-coach`)
- Display Names: Full professional title style
- Bios: Professional credential-focused
- Niches: Industry/skill-focused

### Twitter/X
- Usernames: Witty, conversational
- Display Names: Personality-driven
- Bios: Tweet-style brief bios
- Niches: Topic-focused

### Facebook
- Usernames: Personal & approachable
- Display Names: Community-friendly
- Bios: Personal touch
- Niches: Interest-focused

## Styling & UX

### Color Theming
Each platform has platform-specific colors:
```tsx
{
  tiktok: { bg: 'bg-black/5', accent: 'border-black/20', text: 'text-black' },
  youtube: { bg: 'bg-red-50', accent: 'border-red-200', text: 'text-red-600' },
  instagram: { bg: 'bg-pink-50', accent: 'border-pink-200', text: 'text-pink-600' },
  // ... etc
}
```

### Interactions
- Hover states show rightarrow icon
- Selected items show checkmark + highlight
- Disabled states during loading
- Smooth transitions
- Live preview updates instantly

### Accessibility
- Proper labels on all inputs
- Clear error messages
- Loading states visible
- Pro tips for guidance
- Character count hints

## Best Practices (Built-in)

The component displays auto-generated pro tips:
- Keep usernames under 20 characters for easy typing
- Include keywords in display name for discoverability
- Use platform-specific formats (casual for TikTok, professional for LinkedIn)
- Add emojis to stand out in search results

## Error Handling

- Empty niche validation (Generate button disabled)
- API error messages displayed clearly
- JSON parsing fallback (extracts JSON from response if needed)
- Invalid response validation (checks array structure)
- User-friendly error descriptions

## Future Enhancements

Potential improvements:
- [ ] Keyword research integration (trending topics in niche)
- [ ] Competitor username analysis
- [ ] Bio copywriting A/B testing suggestions
- [ ] Availability checking (real-time username check on platforms)
- [ ] Demographic targeting suggestions
- [ ] Hashtag recommendations per niche
- [ ] Content pillar suggestions based on niche
- [ ] Schedule recommendations (best posting times)

## Cost & Performance

- **API Cost**: ~$0.002-0.003 per suggestion generation (Haiku model)
- **Latency**: 1-3 seconds typical (includes network + Claude processing)
- **Tokens Used**: ~300-400 tokens input, ~200-300 tokens output per request
- **Caching**: Could cache niche/platform combinations for 24 hours

## Testing

To test the feature:

1. Go to Accounts page
2. Click "Add Manually"
3. Select "✨ AI Suggestions" tab
4. Choose a platform
5. Enter a niche (e.g., "Fitness coaching")
6. Click "Generate"
7. Watch suggestions load
8. Click any suggestion to select it
9. See preview update
10. Click "Add Account"

Example test cases:
- **Fitness TikTok**: Casual, trendy usernames
- **Tech YouTube**: Professional, searchable names
- **Beauty Instagram**: Aesthetic, emoji-enhanced names
- **Business LinkedIn**: Credential-focused suggestions
- **News Twitter**: Witty, topic-specific names
