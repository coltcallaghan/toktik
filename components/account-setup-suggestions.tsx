'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Lightbulb, RefreshCw, Check, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface Suggestions {
  usernames: string[];
  display_names: string[];
  bios: string[];
  niches: string[];
}

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

export function AccountSetupSuggestions({
  platform,
  niche,
  selectedUsername,
  selectedDisplayName,
  onSelect,
}: AccountSetupSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customNiche, setCustomNiche] = useState(niche || '');

  async function generateSuggestions() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/account-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          niche: customNiche,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to generate suggestions');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating suggestions');
    }
    setLoading(false);
  }

  const platformColors: Record<string, { bg: string; accent: string; text: string }> = {
    tiktok: { bg: 'bg-black/5 dark:bg-white/5', accent: 'border-black/20 dark:border-white/20', text: 'text-black dark:text-white' },
    youtube: { bg: 'bg-red-50 dark:bg-red-950/20', accent: 'border-red-200 dark:border-red-800', text: 'text-red-600 dark:text-red-400' },
    instagram: { bg: 'bg-pink-50 dark:bg-pink-950/20', accent: 'border-pink-200 dark:border-pink-800', text: 'text-pink-600 dark:text-pink-400' },
    twitter: { bg: 'bg-sky-50 dark:bg-sky-950/20', accent: 'border-sky-200 dark:border-sky-800', text: 'text-sky-600 dark:text-sky-400' },
    linkedin: { bg: 'bg-blue-50 dark:bg-blue-950/20', accent: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400' },
    facebook: { bg: 'bg-blue-50 dark:bg-blue-950/20', accent: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400' },
  };

  const colors = platformColors[platform] || platformColors.tiktok;

  return (
    <Card className={`border-2 ${colors.accent}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <Lightbulb className={clsx('h-5 w-5 mt-0.5 shrink-0', colors.text)} />
            <div>
              <CardTitle className="text-lg">AI Setup Suggestions</CardTitle>
              <CardDescription>Get personalized username, display name, and niche suggestions for your {platform} account</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Niche Input */}
        <div>
          <label className="mb-2 block text-sm font-medium">What's your content niche?</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Fitness, Tech Reviews, Comedy, Gaming..."
              value={customNiche}
              onChange={(e) => setCustomNiche(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={generateSuggestions}
              disabled={loading || !customNiche.trim()}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Examples: Fitness coaching, Tech reviews, Comedy skits, Gaming streams, Beauty tutorials
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {suggestions && (
          <div className="space-y-4">
            {/* Usernames Section */}
            <div>
              <label className="mb-3 block text-sm font-semibold">Suggested Usernames</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.usernames.map((username, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelect({ username, niche: customNiche })}
                    className={clsx(
                      'group relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md',
                      selectedUsername === username
                        ? `${colors.bg} ${colors.accent} ring-1 ring-primary/40`
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">@{username}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {username.length} chars • Memorable & searchable
                        </p>
                      </div>
                      {selectedUsername === username ? (
                        <Check className="h-5 w-5 text-primary shrink-0 ml-2" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Display Names Section */}
            <div>
              <label className="mb-3 block text-sm font-semibold">Suggested Display Names</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.display_names.map((displayName, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelect({
                      username: selectedUsername || suggestions.usernames[0],
                      display_name: displayName,
                      niche: customNiche,
                    })}
                    className={clsx(
                      'group relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md',
                      selectedDisplayName === displayName
                        ? `${colors.bg} ${colors.accent} ring-1 ring-primary/40`
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Professional & memorable name
                        </p>
                      </div>
                      {selectedDisplayName === displayName ? (
                        <Check className="h-5 w-5 text-primary shrink-0 ml-2" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Niches Section */}
            <div>
              <label className="mb-3 block text-sm font-semibold">Content Niches</label>
              <div className="flex flex-wrap gap-2">
                {suggestions.niches.map((niche, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelect({
                      username: selectedUsername || suggestions.usernames[0],
                      display_name: selectedDisplayName || suggestions.display_names[0],
                      niche,
                    })}
                    className={clsx(
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                      customNiche.toLowerCase() === niche.toLowerCase()
                        ? `${colors.bg} ${colors.text} ring-1 ring-primary/40`
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {niche}
                  </button>
                ))}
              </div>
            </div>

            {/* Bios Section */}
            {suggestions.bios.length > 0 && (
              <div>
                <label className="mb-3 block text-sm font-semibold">Bio Inspiration</label>
                <div className="space-y-2">
                  {suggestions.bios.map((bio, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <p className="text-foreground">{bio}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Copy this to your {platform} bio
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">💡 Pro Tips:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Keep usernames under 20 characters for easy typing</li>
                <li>✓ Include keywords related to your niche in your display name</li>
                <li>✓ Use platform-specific bio formats (TikTok: casual, LinkedIn: professional)</li>
                <li>✓ Add relevant emojis to stand out in search results</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
