# TokTik - AI TikTok Management Dashboard

A comprehensive front-end dashboard for managing multiple AI TikTok accounts, with team-based AI agents for automated content creation (scripts, videos, voices) and trend monitoring.

## Features

- **Multi-Account Management**: Manage multiple TikTok accounts from a single dashboard
- **AI Agent Teams**: Organize AI agents into teams for specialized content creation
  - Script Writer AI
  - Video Producer
  - Voice Actor
  - Trend Detector
  - Thumbnail Designer
  - Caption Generator
- **Content Management**: Track content across drafts, scheduled, and published states
- **Trend Monitoring**: Real-time trend detection with momentum scores and expiration tracking
- **Performance Analytics**: View engagement metrics, views, and follower growth
- **Supabase Integration**: Authentication and data persistence

## Tech Stack

- **Frontend**: Next.js 15 + React 19
- **Styling**: Tailwind CSS + Custom UI Components
- **UI Library**: Custom component library (Shadcn/ui inspired)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Supabase (Auth + Database)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available at https://supabase.com)

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```

4. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
toktik/
├── app/
│   ├── dashboard/        # Dashboard overview
│   ├── accounts/         # Account management
│   ├── content/          # Content library
│   ├── teams/            # AI team management
│   ├── trends/           # Trend monitoring
│   ├── settings/         # User settings
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles
│   └── page.tsx          # Home redirect
├── components/
│   ├── ui/               # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── tabs.tsx
│   └── layout/
│       ├── sidebar.tsx   # Navigation sidebar
│       └── topbar.tsx    # Top navigation bar
├── lib/
│   └── supabase.ts       # Supabase client & types
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## Setting Up Supabase Database

Create the following tables in your Supabase project:

### 1. Accounts Table
```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  platform_username text not null,
  platform_id text not null,
  team_id uuid references teams,
  followers_count integer default 0,
  status text default 'active' check (status in ('active', 'paused', 'inactive')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### 2. Teams Table
```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  members text[] default array[]::text[],
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### 3. Content Table
```sql
create table content (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts not null,
  team_id uuid references teams,
  title text not null,
  script text not null,
  video_url text,
  status text default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamp,
  published_at timestamp,
  engagement_metrics jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);
```

### 4. Trends Table
```sql
create table trends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  trend_name text not null,
  category text not null,
  momentum numeric default 0,
  description text,
  detected_at timestamp default now(),
  expires_at timestamp
);
```

## Features in Detail

### Dashboard
- Real-time metrics overview
- Account performance charts
- Quick access to active accounts
- View/Edit account status

### Accounts Management
- Add/remove TikTok accounts
- Search and filter accounts
- View followers and engagement
- Assign accounts to teams

### Content Library
- Create new content with AI agents
- Manage drafts, scheduled, and published content
- Track performance metrics
- Bulk scheduling

### AI Teams
- Create specialized teams of AI agents
- Available agents:
  - Script Writer: Creates hooks and engaging scripts
  - Video Producer: Generates video content
  - Voice Actor: Text-to-speech generation
  - Trend Detector: Identifies trending topics
  - Thumbnail Designer: Creates thumbnails
  - Caption Generator: Auto-generates captions

### Trend Monitoring
- Real-time trend detection
- Momentum scoring system
- Expiration tracking
- One-click content creation for trends

### Settings
- Account management
- API key configuration
- Connected services
- Notification preferences

## Next Steps

1. **Implement Authentication**: Add Supabase Auth UI components
2. **Connect AI APIs**: Integrate with Claude API for script generation, video synthesis, and trend analysis
3. **Real-time Updates**: Add real-time listeners for content and trend updates
4. **Scheduling System**: Implement background jobs for content scheduling and posting
5. **Performance Metrics**: Add real data fetching from TikTok API
6. **Video Preview**: Add video player component for content preview

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=       # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Your Supabase anon key
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT

## Support

For issues and questions, check the [Supabase documentation](https://supabase.com/docs) and [Next.js documentation](https://nextjs.org/docs).
