# Account Setup Suggestions - Visual Guide

## User Flow

```
Accounts Page
    ↓
Click "Add Manually" button
    ↓
┌─────────────────────────────────────┐
│ Tabs: ✨ AI Suggestions (default)   │
│       Manual Entry                  │
└─────────────────────────────────────┘
    ↓
    └─→ [AI SUGGESTIONS MODE]
        │
        ├─ Platform Selector
        │  ┌──────┬──────┬──────┬──────┬──────┬──────┐
        │  │ Tk   │ YT   │ IG   │ Tw   │ LI   │ FB   │
        │  └──────┴──────┴──────┴──────┴──────┴──────┘
        │
        ├─ AI Suggestions Card
        │  ┌──────────────────────────────────────────────┐
        │  │ 💡 AI Setup Suggestions                      │
        │  │                                              │
        │  │ What's your content niche?                   │
        │  │ ┌──────────────────────────────┬──────────┐  │
        │  │ │ Fitness coaching   [Generate]│          │  │
        │  │ └──────────────────────────────┴──────────┘  │
        │  │                                              │
        │  │ Suggested Usernames (click to select)       │
        │  │ ┌─────────────────┐ ┌─────────────────┐    │
        │  │ │ @fitnessdave    │ │ @coachfitness   │    │
        │  │ │ 12 chars ✓      │ │ 15 chars        │    │
        │  │ └─────────────────┘ └─────────────────┘    │
        │  │ ┌─────────────────┐ ┌─────────────────┐    │
        │  │ │ @fitjourney     │ │ @traindave      │    │
        │  │ └─────────────────┘ └─────────────────┘    │
        │  │                                              │
        │  │ Suggested Display Names (click to select)   │
        │  │ ┌────────────────────┐ ┌────────────────┐  │
        │  │ │ Dave 💪 Fitness    │ │ Coach Dave|Fit │  │
        │  │ │ Professional       │ │ Professional   │  │
        │  │ └────────────────────┘ └────────────────┘  │
        │  │                                              │
        │  │ Content Niches                               │
        │  │ [Fitness Coaching] [Workouts] [Nutrition]  │
        │  │ [Transformations]                            │
        │  │                                              │
        │  │ Bio Inspiration                              │
        │  │ ┌──────────────────────────────────────────┐│
        │  │ │ 💪 Fitness coach | Reach your goals 🎯  ││
        │  │ │ Copy this to your TikTok bio             ││
        │  │ └──────────────────────────────────────────┘│
        │  │                                              │
        │  │ 💡 Pro Tips:                                 │
        │  │ ✓ Keep usernames under 20 chars             │
        │  │ ✓ Include keywords in display name          │
        │  │ ✓ Use platform-specific formats             │
        │  │ ✓ Add emojis to stand out                   │
        │  └──────────────────────────────────────────────┘
        │
        ├─ Preview Card
        │  ┌──────────────────────────┐
        │  │ Preview                  │
        │  │                          │
        │  │ @fitnessdave             │
        │  │ Dave 💪 Fitness Coach   │
        │  │ 📍 Fitness Coaching      │
        │  └──────────────────────────┘
        │
        └─ Add Account Button → Saves to Supabase
           - platform: 'tiktok'
           - platform_username: '@fitnessdave'
           - display_name: 'Dave 💪 Fitness Coach'
           - niche: 'Fitness coaching'
```

## Interaction States

### 1. Initial State (Empty)
```
[✨ AI Suggestions] [Manual Entry]

Platform Selector
[TK] [YT] [IG] [TW] [LI] [FB]

What's your content niche?
[Enter niche...] [Generate Button - DISABLED]
```

### 2. User Types Niche
```
What's your content niche?
[Fitness coaching] [Generate Button - ENABLED ✓]
```

### 3. Generating (Loading)
```
[Generate Button - LOADING]
💫 Generating suggestions...
```

### 4. Suggestions Loaded
```
Suggested Usernames
┌──────────────────────┐
│ @fitnessdave         │ ← Unselected (hover shows →)
│ 12 chars             │
└──────────────────────┘

┌──────────────────────┐
│ ✅ @fitnessdave      │ ← Selected (shows checkmark)
│ 12 chars             │
└──────────────────────┘
```

### 5. Display Name Selected
```
Suggested Display Names
┌────────────────────────┐
│ Dave 💪 Fitness Coach  │ ← Selected with checkmark
│ Professional name      │
└────────────────────────┘
```

### 6. Final Preview
```
Preview
┌──────────────────────┐
│ @fitnessdave         │
│ Dave 💪 Fitness     │
│ 📍 Fitness coaching  │
└──────────────────────┘

[Add Account Button] [Cancel]
```

### 7. After Clicking "Add Account"
```
✅ Account Created

@fitnessdave added to your accounts
Next: Set up account theme (tone, audience, etc.)
```

## Platform-Specific Examples

### TikTok (Casual, Trendy)
```
Platform: TikTok
Niche: Comedy

Usernames:
- @comedydave (casual, lowkey)
- @davescomedy (personal vibe)
- @funnyvidz (trendy, shortened)
- @davelaugh (personality-driven)

Display Names:
- Dave 😂 Comedy
- Dave's Comedy Corner
- 😂 Comedy by Dave
- Laugh with Dave

Bios:
- 😂 Making people laugh daily | Follow for funny vids
- Comedy skits, fails & reactions 😂 DMs open
```

### YouTube (Professional, Searchable)
```
Platform: YouTube
Niche: Tech Reviews

Usernames:
- davetechtv (tech focused)
- reviewtech (clear category)
- techwdave (initials)
- davetechreviews (descriptive)

Display Names:
- Dave's Tech Reviews
- Tech Reviewer Dave
- Tech with Dave
- Dave | Tech Reviews

Bios:
- 📱 Latest smartphone & gadget reviews with honest opinions
- Tech reviews, unboxings, and tutorials by Dave
```

### Instagram (Aesthetic, Brand-Friendly)
```
Platform: Instagram
Niche: Photography

Usernames:
- davephotography (clear)
- photosbydave (creator-focused)
- davecaptures (poetic)
- visualdave (modern)

Display Names:
- Dave's Photography
- Photographer | Dave
- Capturing moments with Dave
- Dave Photography

Bios:
- 📸 Travel & lifestyle photography | DM for collaborations
- Visual storyteller | Photography | Link in bio
```

### LinkedIn (Professional, Credible)
```
Platform: LinkedIn
Niche: Marketing Leadership

Usernames:
- dave-marketing-leader
- davidmarketing
- dave-digital-expert
- marketingleader-dave

Display Names:
- Dave Smith | Marketing Director
- Dave Smith - Digital Marketing Leader
- Dave Smith, Marketing Strategist
- Dave Smith | Marketing & Strategy

Bios:
- Digital Marketing Director | 10+ years strategy | LinkedIn
- Helping businesses scale | Marketing specialist | Open to connections
```

### Twitter/X (Witty, Conversational)
```
Platform: Twitter
Niche: Web Development

Usernames:
- @davecodes (direct)
- @webdevdave (specific)
- @davewebdev (clear)
- @codeswithdave (inclusive)

Display Names:
- Dave 👨‍💻 Web Dev
- Dave | Full-Stack Developer
- Dave's Code Journey
- Web Dev Dave

Bios:
- 👨‍💻 Building the web | React + TypeScript | Coffee addict | Tweets about code
- Web developer obsessed with clean code ✨ Share my journey here
```

## Color Theming by Platform

```
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│ Platform        │ Background   │ Border       │ Text         │
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ TikTok          │ black/5      │ black/20     │ black        │
│ YouTube         │ red-50       │ red-200      │ red-600      │
│ Instagram       │ pink-50      │ pink-200     │ pink-600     │
│ Twitter         │ sky-50       │ sky-200      │ sky-600      │
│ LinkedIn        │ blue-50      │ blue-200     │ blue-600     │
│ Facebook        │ blue-50      │ blue-200     │ blue-600     │
└─────────────────┴──────────────┴──────────────┴──────────────┘

Each card in AI Suggestions has platform colors when selected:
┌─ Selected TikTok Item ──────┐
│ (black/5 background)        │
│ ✅ Item Text                │
│ (black border highlight)    │
└─────────────────────────────┘

┌─ Selected YouTube Item ─────┐
│ (red/50 background)         │
│ ✅ Item Text                │
│ (red border highlight)      │
└─────────────────────────────┘
```

## UX Flow - Click Tracking

```
User Experience Timeline:

T=0s   User clicks "Add Manually"
       └─ setShowAdd(true)
       └─ Mode defaults to 'suggestions'

T=1s   User selects platform (e.g., TikTok)
       └─ setAddPlatform('tiktok')
       └─ UI updates with TikTok colors

T=2s   User types niche "Fitness coaching"
       └─ setAddNiche('Fitness coaching')
       └─ Generate button becomes enabled

T=3s   User clicks "Generate"
       └─ POST /api/account-suggestions
       └─ Loading spinner appears

T=4-5s Claude generates suggestions
       └─ Response received

T=6s   Suggestions render with selection UI

T=7s   User clicks username @fitnessdave
       └─ setAddUsername('fitnessdave')
       └─ Shows checkmark
       └─ Preview updates

T=8s   User clicks display name "Dave 💪 Fitness"
       └─ setAddDisplayName('Dave 💪 Fitness')
       └─ Shows checkmark
       └─ Preview updates

T=9s   User reviews preview:
       @fitnessdave
       Dave 💪 Fitness
       📍 Fitness coaching

T=10s  User clicks "Add Account"
       └─ handleAddAccount()
       └─ Supabase INSERT
       └─ Refresh accounts list
       └─ Show success message

T=11s  User redirected to account theme setup (optional)
```

## Mobile Responsive Layout

```
DESKTOP (md+)                    MOBILE (sm)
┌──────────────────────┐         ┌──────────┐
│ Platform Selector    │         │ Platform │
│ 6 cols grid          │         │ 3 cols   │
│ ┌─┐ ┌─┐ ┌─┐          │         │ ┌─┐┌─┐┌─┐│
│ │T│ │Y│ │I│          │         │ │T││Y││I││
│ └─┘ └─┘ └─┘          │         │ └─┘└─┘└─┘│
│ ┌─┐ ┌─┐ ┌─┐          │         │ ┌─┐┌─┐┌─┐│
│ │T│ │L│ │F│          │         │ │T││L││F││
│ └─┘ └─┘ └─┘          │         │ └─┘└─┘└─┘│
└──────────────────────┘         └──────────┘

Suggestions                      Suggestions
2 cols × 2 rows                 1 col × 4 rows
┌────┬────┐                      ┌──────┐
│ @1 │ @2 │                      │ @1   │
├────┼────┤                      ├──────┤
│ @3 │ @4 │                      │ @2   │
└────┴────┘                      ├──────┤
                                 │ @3   │
                                 ├──────┤
                                 │ @4   │
                                 └──────┘
```

## Loading States

### Fetching Suggestions
```
┌─────────────────────────────────┐
│ 💡 AI Setup Suggestions          │
│                                  │
│ [Input] [🔄 Generating...]      │
│                                  │
│ ⏳ Loading suggestions...         │
│                                  │
└─────────────────────────────────┘
```

### API Error
```
┌─────────────────────────────────┐
│ ⚠️ Error generating suggestions  │
│                                  │
│ Failed to generate suggestions.  │
│ Please try again.                │
│                                  │
│ [Input] [🔄 Retry]               │
└─────────────────────────────────┘
```

### Success
```
✅ Suggestions ready!

Usernames ✓
Display Names ✓
Niches ✓
Bios ✓

Ready to add account
```

## Next Steps After Adding Account

Once user clicks "Add Account":

1. **Success Page**
   ```
   ✅ Account Added!
   @fitnessdave on TikTok

   [Set Account Theme]  [View Account]  [Add Another]
   ```

2. **Optional: Account Theme Setup**
   - Tone: casual, educational, humorous, etc.
   - Content style: storytelling, tutorial, challenge, etc.
   - Target audience: Gen Z, 18-25, professionals, etc.
   - Brand voice: friendly expert, bold creative, etc.

3. **Back to Accounts List**
   - New account appears in list
   - Shows platform, followers (0), niche
   - Prompt: "Connect via OAuth to enable publishing"
