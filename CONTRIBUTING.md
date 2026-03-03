# Contributing to TokTik

Guidelines for developers contributing to the TokTik project.

## Code Style

### TypeScript
- **Always use TypeScript**, no `any` types
- Explicit types for function parameters and returns
- Use `type` for objects, `interface` only when needed
- Use strict null checks

```typescript
// ✅ Good
async function fetchAccount(id: string): Promise<Account> {
  return supabase.from('accounts').select().eq('id', id).single();
}

// ❌ Avoid
async function fetchAccount(id: any): Promise<any> {
  return supabase.from('accounts').select().eq('id', id).single();
}
```

### React Components
- Functional components only (no class components)
- Use hooks (`useState`, `useEffect`, `useCallback`)
- Props interface always at top of file
- Export component name matches file name

```typescript
// components/example-component.tsx
interface ExampleComponentProps {
  title: string;
  onSubmit: (value: string) => void;
}

export function ExampleComponent({ title, onSubmit }: ExampleComponentProps) {
  const [value, setValue] = useState('');
  
  return (
    <button onClick={() => onSubmit(value)}>
      {title}
    </button>
  );
}
```

### API Routes
- One endpoint per file
- Consistent error handling
- Proper HTTP status codes
- Document what data is needed

```typescript
// app/api/example/route.ts
export async function POST(req: NextRequest) {
  try {
    // Validate input
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    
    // Do work
    const result = await doSomething(id);
    
    // Return result
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## Naming Conventions

**Files:**
- Components: `kebab-case` → `user-profile.tsx`
- Utils: `kebab-case` → `date-utils.ts`
- API routes: `kebab-case` → `/api/user-profile/route.ts`

**Variables:**
- `camelCase` → `const userName = '...';`
- Constants: `UPPER_SNAKE_CASE` → `const MAX_RETRIES = 3;`
- Types: `PascalCase` → `type UserProfile = { ... };`

**Functions:**
- `camelCase` → `function getUserProfile() {}`
- Hooks: start with `use` → `function useUserProfile() {}`

## Database

### Queries
- Use Supabase client (see `lib/supabase.ts`)
- Always check for errors
- Use types from `lib/supabase.ts`

```typescript
const supabase = createClient();
const { data, error } = await supabase
  .from('accounts')
  .select('*')
  .eq('user_id', userId);

if (error) {
  console.error('Database error:', error);
  return null;
}
```

### Migrations
- Keep migrations simple and idempotent
- Test migrations locally
- Add comments explaining changes

## Commits

### Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code restructure
- `docs` — Documentation
- `test` — Tests
- `chore` — Maintenance

**Examples:**
```
feat(accounts): add AI-powered username suggestions

- Created AccountSetupSuggestions component
- Integrated Claude API for recommendations
- Added platform-specific theming

Fixes #123
```

```
fix(content): resolve engagement metrics sync error

Updated database query to handle null values properly.
```

### Commit Guidelines
- One feature/fix per commit (when possible)
- Test before committing
- Write descriptive messages
- Reference GitHub issues: `Fixes #123`

## Pull Requests

### Before Creating PR
1. Create feature branch: `git checkout -b feat/your-feature`
2. Make changes in small, logical commits
3. Test locally: `npm run dev` + `npm run type-check`
4. Update relevant documentation
5. Push to GitHub

### PR Title Format
Keep concise:
```
✨ Add AI username suggestions for accounts
🐛 Fix engagement metrics calculation
📝 Update CONTRIBUTING.md guidelines
```

### PR Description
Include:
1. **What**: What does this PR do?
2. **Why**: Why is this change needed?
3. **How**: How did you implement it?
4. **Testing**: How was it tested?

**Example:**
```
## What
Add AI-powered username suggestions when users create accounts.

## Why
Reduces friction in account setup. Users often struggle to pick usernames.

## How
- Created AccountSetupSuggestions React component
- Integrated Claude API endpoint for suggestions
- Added platform-specific theming

## Testing
- Manual testing across all platforms (TikTok, YouTube, Instagram)
- Verified suggestions update live preview
- Tested error states and loading states
- Verified account saves to Supabase correctly
```

## Testing

### Manual Testing
- Always test in browser before committing
- Test happy path AND error cases
- Test on different screen sizes
- Test dark mode if styling added

### Automated Testing
- Run type checker: `npm run type-check`
- Run linter: `npm run lint`
- No console errors in browser

## Documentation

### Code Comments
- Only comment **why**, not **what**
- Self-documenting code is preferred

```typescript
// ✅ Good
// Retry logic: exponential backoff reduces API rate limit hits
for (let i = 0; i < MAX_RETRIES; i++) {
  const delay = Math.pow(2, i) * 1000;
  await wait(delay);
}

// ❌ Avoid
// Loop i times
for (let i = 0; i < MAX_RETRIES; i++) {
  // Wait
  await wait(delay);
}
```

### File Comments
- Add JSDoc for exported functions
- Explain complex logic

```typescript
/**
 * Fetch platform analytics from any of 6 social media platforms
 * @param platform - 'tiktok', 'youtube', 'instagram', etc.
 * @param accessToken - OAuth access token for the platform
 * @param postId - Platform-specific post/video ID
 * @returns Engagement metrics (views, likes, comments, shares)
 */
export async function fetchPlatformAnalytics(
  platform: PlatformKey,
  accessToken: string,
  postId: string
): Promise<PlatformAnalytics | null> {
  // ...
}
```

### Updating Docs
- Update README.md for user-facing changes
- Update relevant .md files for features
- Keep MEMORY.md in sync

## Performance

### General
- Minimize re-renders in React
- Batch database operations
- Use pagination for large lists
- Lazy load images

### API
- Cache when possible
- Limit database query results
- Use indexes on frequently queried fields

### Bundle Size
- Code split components
- Use dynamic imports for large features
- Avoid unnecessary dependencies

## Security

### Never
- Store secrets in code
- Commit .env files
- Use `any` types (allows type bypassing)
- Trust user input (validate server-side)

### Always
- Use parameterized queries (Supabase handles this)
- Validate input on server
- Use HTTPS
- Implement RLS on all tables
- Review before merging PRs

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release branch
4. Create PR with release notes
5. Merge to main
6. Deploy to Vercel
7. Test production

## Getting Help

- Check TROUBLESHOOTING.md
- Review similar code for patterns
- Ask in team chat
- Leave comments on PR for discussion

---

**Last Updated**: March 2026
