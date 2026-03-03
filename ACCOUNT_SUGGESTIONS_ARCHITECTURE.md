# Account Suggestions - Architecture Diagram

## Component Hierarchy

```
AccountsPage (app/(dashboard)/accounts/page.tsx)
│
├─ Auth Guard (checks user session)
│
└─ AccountsPageInner
   │
   ├─ Header
   │  ├─ "Connect Platform" button
   │  └─ "Add Manually" button
   │
   ├─ OAuth Connect Section
   │  └─ Platform grid (TikTok, YouTube, Instagram, etc.)
   │
   └─ Add Account Form [ENHANCED]
      │
      ├─ Tab Selector
      │  ├─ "✨ AI Suggestions" (default)
      │  └─ "Manual Entry"
      │
      ├─ [AI SUGGESTIONS MODE]
      │  │
      │  ├─ Platform Selector
      │  │  └─ Grid of 6 platforms
      │  │
      │  └─ <AccountSetupSuggestions /> [NEW COMPONENT]
      │     │
      │     ├─ Niche Input Section
      │     │  ├─ Input field
      │     │  └─ Generate button
      │     │
      │     ├─ Loading State
      │     │  ├─ Spinner
      │     │  └─ "Generating..." text
      │     │
      │     ├─ Suggestions Display
      │     │  ├─ Usernames Section
      │     │  │  ├─ Card 1: @fitnessdave
      │     │  │  ├─ Card 2: @coachfitness
      │     │  │  └─ ... (4-5 total)
      │     │  │
      │     │  ├─ Display Names Section
      │     │  │  ├─ Card 1: Dave 💪 Fitness Coach
      │     │  │  ├─ Card 2: Coach Dave | Fitness
      │     │  │  └─ ... (4-5 total)
      │     │  │
      │     │  ├─ Niches Section
      │     │  │  ├─ Tag 1: Fitness Coaching
      │     │  │  ├─ Tag 2: Workout Tutorials
      │     │  │  └─ ... (3-4 total)
      │     │  │
      │     │  └─ Bios Section
      │     │     ├─ Bio 1: 💪 Fitness coach...
      │     │     └─ Bio 2: Train hard...
      │     │
      │     ├─ Error State
      │     │  ├─ Error message
      │     │  └─ Retry button
      │     │
      │     └─ Pro Tips
      │        ├─ Tip 1: Keep usernames under 20 chars
      │        ├─ Tip 2: Include keywords in display name
      │        └─ ... (4 total)
      │
      ├─ Preview Card
      │  ├─ Username: @fitnessdave
      │  ├─ Display Name: Dave 💪 Fitness Coach
      │  └─ Niche: 📍 Fitness coaching
      │
      ├─ Submit Section
      │  ├─ "Add Account" button
      │  └─ "Cancel" button
      │
      └─ [MANUAL ENTRY MODE]
         │
         ├─ Platform Selector (same as above)
         │
         ├─ Username Input
         │
         ├─ Niche Input
         │
         └─ Submit Section
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTIONS                       │
└─────────────────────────────────────────────────────────────┘

User clicks "Add Manually"
         │
         ├─→ setShowAdd(true)
         │
         └─→ Form displays with AI Suggestions tab selected

User selects platform (e.g., TikTok)
         │
         ├─→ setAddPlatform('tiktok')
         │
         └─→ UI updates with TikTok colors

User types niche "Fitness coaching"
         │
         ├─→ setAddNiche('Fitness coaching')
         │
         └─→ Generate button becomes enabled

User clicks "Generate"
         │
         ├─→ POST /api/account-suggestions
         │   Body: { platform: "tiktok", niche: "Fitness coaching" }
         │
         ├─→ setLoading(true)
         │
         └─→ Loading spinner appears

[Backend Processing]
         │
         ├─→ Validate inputs
         │
         ├─→ Build Claude prompt
         │
         ├─→ Call Claude API (haiku model)
         │   • Input: ~300 tokens
         │   • Output: ~250 tokens
         │   • Latency: 1-3 seconds
         │
         ├─→ Parse JSON response
         │   • Primary parser: JSON.parse()
         │   • Fallback: Regex extraction + JSON.parse()
         │
         ├─→ Validate structure
         │   • usernames: array ✓
         │   • display_names: array ✓
         │   • bios: array ✓
         │   • niches: array ✓
         │
         └─→ Return suggestions

Frontend receives response
         │
         ├─→ setSuggestions(data)
         │
         ├─→ setLoading(false)
         │
         └─→ Render suggestion cards

User clicks username suggestion (e.g., @fitnessdave)
         │
         ├─→ onSelect({ username: 'fitnessdave' })
         │
         ├─→ setAddUsername('fitnessdave')
         │
         ├─→ Suggestion card shows checkmark
         │
         └─→ Preview card updates: @fitnessdave

User clicks display name suggestion
         │
         ├─→ onSelect({ display_name: 'Dave 💪 Fitness' })
         │
         ├─→ setAddDisplayName('Dave 💪 Fitness')
         │
         ├─→ Suggestion card shows checkmark
         │
         └─→ Preview card updates

User clicks "Add Account"
         │
         ├─→ handleAddAccount() executes
         │
         ├─→ Validate: addUsername not empty ✓
         │
         ├─→ POST to Supabase
         │   INSERT into accounts table:
         │   {
         │     user_id: session.user.id,
         │     platform: 'tiktok',
         │     platform_username: '@fitnessdave',
         │     platform_id: 'fitnessdave',
         │     display_name: 'Dave 💪 Fitness',
         │     niche: 'Fitness coaching',
         │     followers_count: 0,
         │     status: 'active'
         │   }
         │
         ├─→ setSaving(true)
         │
         └─→ Wait for response

Database insert completes
         │
         ├─→ fetchAccounts() updates list
         │
         ├─→ setShowAdd(false) closes form
         │
         ├─→ Success message appears
         │
         └─→ New account visible in accounts list

┌─────────────────────────────────────────────────────────────┐
│                   API ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────┘

Request:
  POST /api/account-suggestions
  {
    "platform": "tiktok",
    "niche": "Fitness coaching"
  }
         │
         ├─→ Validate inputs (non-empty platform + niche)
         │
         ├─→ Build Claude prompt
         │
         │   "You are a social media expert. Generate suggestions
         │    for a Fitness coaching creator on tiktok.
         │
         │    Return ONLY valid JSON:
         │    {
         │      "usernames": [...],
         │      "display_names": [...],
         │      "bios": [...],
         │      "niches": [...]
         │    }
         │
         │    Rules: usernames 8-18 chars, display_names 15-40..."
         │
         ├─→ Call Claude API
         │
         │   Model: claude-haiku-4-5-20251001
         │   Max tokens: 1024
         │   Temperature: (default ~0.7 for creativity)
         │
         ├─→ Response:
         │   {
         │     "content": [
         │       {
         │         "type": "text",
         │         "text": "{\"usernames\": [...], ...}"
         │       }
         │     ]
         │   }
         │
         ├─→ Parse JSON
         │   Try: JSON.parse(content.text)
         │   Fallback: Extract with regex + JSON.parse()
         │
         ├─→ Validate arrays
         │   if (!Array.isArray(suggestions.usernames)) error
         │   if (!Array.isArray(suggestions.display_names)) error
         │   if (!Array.isArray(suggestions.bios)) error
         │   if (!Array.isArray(suggestions.niches)) error
         │
         └─→ Return suggestions

Response:
  {
    "usernames": [
      "fitnessdave",
      "coachfitness",
      "fitjourney",
      "traindave",
      "fitwithdave"
    ],
    "display_names": [
      "Dave 💪 Fitness Coach",
      "Coach Dave | Fitness",
      "Dave's Fitness Journey",
      "Fitness with Dave",
      "Dave | Personal Trainer"
    ],
    "bios": [
      "💪 Fitness coach helping you transform | Workouts...",
      "Train hard. Transform life. 💪 Daily fitness tips..."
    ],
    "niches": [
      "Fitness Coaching",
      "Workout Tutorials",
      "Nutrition Tips",
      "Transformation Stories",
      "Training Programs"
    ]
  }

┌─────────────────────────────────────────────────────────────┐
│                 STATE MANAGEMENT                            │
└─────────────────────────────────────────────────────────────┘

AccountsPageInner Component State:

const [accounts, setAccounts] = useState<Account[]>([]);
  │
  └─ All user's accounts (fetched from Supabase)
     Used for: displaying account list, syncing, deleting

const [loading, setLoading] = useState(true);
  │
  └─ Initial fetch loading
     Used for: showing/hiding accounts list spinner

const [showAdd, setShowAdd] = useState(false);
  │
  └─ Show/hide add form
     Used for: conditional rendering of form

const [addMode, setAddMode] = useState<'suggestions' | 'manual'>('suggestions');
  │
  └─ AI Suggestions vs Manual Entry
     Used for: switching between two form modes

const [addPlatform, setAddPlatform] = useState<PlatformKey>('tiktok');
  │
  └─ Selected platform (tiktok, youtube, instagram, etc.)
     Used for: determining which platform suggestions to request

const [addUsername, setAddUsername] = useState('');
  │
  └─ Selected username from suggestions (or manually typed)
     Used for: populating form, creating account

const [addDisplayName, setAddDisplayName] = useState('');
  │
  └─ Selected display name from suggestions
     Used for: preview, creating account

const [addNiche, setAddNiche] = useState('');
  │
  └─ Entered niche or selected from suggestions
     Used for: generating suggestions, creating account

const [saving, setSaving] = useState(false);
  │
  └─ Form submission in progress
     Used for: disabling button, showing spinner

┌─────────────────────────────────────────────────────────────┐
│            COMPONENT PROPS & STATE (DETAILS)               │
└─────────────────────────────────────────────────────────────┘

<AccountSetupSuggestions /> Props:

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

Component State (internal):

const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  │
  └─ Loaded suggestions from API
     Value: { usernames: [], display_names: [], bios: [], niches: [] }

const [loading, setLoading] = useState(false);
  │
  └─ Generating suggestions
     Used for: showing spinner, disabling Generate button

const [error, setError] = useState('');
  │
  └─ Error message from API or network
     Used for: displaying error alert, retry logic

const [customNiche, setCustomNiche] = useState(niche || '');
  │
  └─ User-typed niche input
     Used for: displaying input, requesting suggestions

┌─────────────────────────────────────────────────────────────┐
│                  RENDERING LOGIC                            │
└─────────────────────────────────────────────────────────────┘

Conditional Renders:

showAdd === false
  └─→ Nothing renders (form hidden)

showAdd === true
  ├─→ Tab selector visible
  │
  ├─→ addMode === 'suggestions'
  │   └─→ Render AI Suggestions UI:
  │       • Platform selector
  │       • <AccountSetupSuggestions /> component
  │       • Preview card
  │       • Submit buttons
  │
  └─→ addMode === 'manual'
      └─→ Render Manual Entry UI:
          • Platform selector
          • Username input
          • Niche input
          • Submit buttons

<AccountSetupSuggestions /> Renders:

customNiche === '' || customNiche.trim() === ''
  └─→ Generate button: disabled

suggestions === null
  └─→ Show: Niche input + disabled Generate button
  └─→ Hide: Suggestions display

loading === true
  └─→ Show: Spinner + "Generating..."
  └─→ Hide: Suggestions display

error !== ''
  └─→ Show: Error alert + Retry button
  └─→ Hide: Suggestions display

suggestions !== null && !loading && error === ''
  └─→ Show: All suggestions
      • Usernames with selection UI
      • Display names with selection UI
      • Niches with selection UI
      • Bios display
      • Pro tips

┌─────────────────────────────────────────────────────────────┐
│               PLATFORM-SPECIFIC COLORS                      │
└─────────────────────────────────────────────────────────────┘

const platformColors = {
  tiktok: {
    bg: 'bg-black/5 dark:bg-white/5',
    accent: 'border-black/20 dark:border-white/20',
    text: 'text-black dark:text-white'
  },
  youtube: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    accent: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400'
  },
  instagram: {
    bg: 'bg-pink-50 dark:bg-pink-950/20',
    accent: 'border-pink-200 dark:border-pink-800',
    text: 'text-pink-600 dark:text-pink-400'
  },
  twitter: {
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    accent: 'border-sky-200 dark:border-sky-800',
    text: 'text-sky-600 dark:text-sky-400'
  },
  linkedin: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    accent: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400'
  },
  facebook: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    accent: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400'
  }
}

Applied to suggestion cards when selected:
  className={`${colors.bg} ${colors.accent} border-2 p-3 rounded-lg`}

┌─────────────────────────────────────────────────────────────┐
│              ERROR HANDLING FLOW                             │
└─────────────────────────────────────────────────────────────┘

User clicks "Generate"
         │
         └─→ POST /api/account-suggestions
            │
            ├─→ [API] Validate inputs
            │   ├─ empty niche? → return 400 error
            │   └─ invalid platform? → return 400 error
            │
            ├─→ [API] Call Claude
            │   ├─ timeout? → return 500 error
            │   ├─ invalid API key? → return 500 error
            │   └─ rate limit? → return 429 error
            │
            ├─→ [API] Parse JSON
            │   ├─ primary: JSON.parse() fails
            │   ├─ fallback: regex extraction
            │   └─ if still fails → return 500 error
            │
            ├─→ [API] Validate structure
            │   └─ missing arrays? → return 500 error
            │
            └─→ [Frontend] Handle response
                ├─ res.ok === true
                │   └─→ setSuggestions(data)
                │       setLoading(false)
                │
                └─ res.ok === false
                    └─→ const errData = await res.json()
                        setError(errData.error)
                        setLoading(false)

User sees error message + Retry button
         │
         └─→ Clicking retry calls generateSuggestions() again

┌─────────────────────────────────────────────────────────────┐
│             PERFORMANCE OPTIMIZATION                         │
└─────────────────────────────────────────────────────────────┘

To minimize API calls:
  ✓ Generate button only enabled when niche has text
  ✓ Single API call per "Generate" click
  ✓ Suggestions cached in component state
  ✓ No API call on component re-render
  ✓ User can regenerate by clicking Generate again

To minimize network requests:
  ✓ Uses Haiku model (faster + cheaper than Opus/Sonnet)
  ✓ Requests < 1KB
  ✓ Response < 2KB
  ✓ JSON-only format (no markdown parsing overhead)

To minimize database operations:
  ✓ Single INSERT when "Add Account" clicked
  ✓ Uses existing accounts table (no new schema)
  ✓ Leverages existing indexes and RLS

To minimize frontend re-renders:
  ✓ Suggestions component isolated (not re-rendering full page)
  ✓ State updates batched (setAddUsername + preview in one render)
  ✓ Memoization ready (could add React.memo for cards)

┌─────────────────────────────────────────────────────────────┐
│            INTEGRATION POINTS                                │
└─────────────────────────────────────────────────────────────┘

With Existing Code:

✓ Uses existing Supabase client (lib/supabase.ts)
✓ Uses existing Account type from Supabase types
✓ Uses existing handleAddAccount() function
✓ Uses existing PLATFORMS config from accounts page
✓ Uses existing UI components (Button, Input, Card)
✓ Uses existing styling system (Tailwind + CSS variables)
✓ Uses existing icons (Lucide React)

With Authentication:

✓ User session accessed via Supabase auth
✓ Only authenticated users see form
✓ RLS ensures only user's accounts visible
✓ Account inserted with user_id from session

With Other Features:

✓ Created accounts can have theme set (tone, audience, etc.)
✓ Created accounts can be connected via OAuth
✓ Created accounts appear in content generation
✓ Created accounts can be used in A/B testing
✓ Created accounts appear in all analytics

```

This architecture provides a clean separation of concerns:
- **UI Layer**: Dumb component that handles selection
- **API Layer**: Claude integration + JSON validation
- **State Layer**: React hooks manage form state
- **Data Layer**: Supabase handles persistence
