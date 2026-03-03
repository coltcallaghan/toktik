'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Share2,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Video,
  Hash,
  Lightbulb,
  FileText,
  ArrowRight,
  Loader2,
  Search,
} from 'lucide-react';
import { createClient, type Content, type Account } from '@/lib/supabase';
import clsx from 'clsx';

type ContentWithAccount = Content & { account?: Account };

interface RepurposedResult {
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  tips: string[];
  platform_spec: { name: string; maxLength: number; format: string; aspect: string };
  error?: string;
  raw?: string;
}

const PLATFORMS = [
  { key: 'youtube_shorts', label: 'YouTube Shorts', icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10' },
  { key: 'instagram_reels', label: 'Instagram Reels', icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { key: 'facebook_reels', label: 'Facebook Reels', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-600/10' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-700/10' },
];

export default function DistributePageWrapper() {
  return (
    <Suspense>
      <DistributePage />
    </Suspense>
  );
}

function DistributePage() {
  const searchParams = useSearchParams();
  const [content, setContent] = useState<ContentWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('content'));
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube_shorts', 'instagram_reels']);
  const [repurposing, setRepurposing] = useState(false);
  const [results, setResults] = useState<Record<string, Record<string, RepurposedResult>>>({});
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      const supabase = createClient();
      const [contentRes, accountsRes] = await Promise.all([
        supabase.from('content').select('*').order('created_at', { ascending: false }),
        supabase.from('accounts').select('*'),
      ]);
      if (!contentRes.error && contentRes.data && !accountsRes.error) {
        setContent(
          contentRes.data.map((c) => ({
            ...c,
            account: accountsRes.data?.find((a) => a.id === c.account_id),
          }))
        );
      }
      setLoading(false);
    }
    fetchContent();
  }, []);

  function togglePlatform(key: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  async function handleRepurpose() {
    if (!selectedId || selectedPlatforms.length === 0) return;
    setRepurposing(true);
    setExpandedPlatform(null);

    try {
      const res = await fetch(`/api/content/${selectedId}/repurpose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: selectedPlatforms }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults((prev) => ({
          ...prev,
          [selectedId]: data.repurposed,
        }));
        // Auto-expand first result
        const firstKey = Object.keys(data.repurposed)[0];
        if (firstKey) setExpandedPlatform(firstKey);
      }
    } catch (err) {
      console.error('Repurpose failed:', err);
    }
    setRepurposing(false);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const selectedContent = content.find((c) => c.id === selectedId);
  const currentResults = selectedId ? results[selectedId] : null;

  const filteredContent = content.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.account?.platform_username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Cross-Platform Distribution</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Repurpose your TikTok content for YouTube Shorts, Instagram Reels, and more
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Content Picker */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-3">Select Content</h3>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredContent.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={clsx(
                      'w-full text-left rounded-md border p-3 transition-colors',
                      selectedId === item.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {item.account?.platform_username || 'No account'}
                      </span>
                      <span className={clsx(
                        'text-xs rounded-full px-1.5 py-0.5 font-medium',
                        item.status === 'published' ? 'bg-green-500/10 text-green-600' :
                        item.status === 'scheduled' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-gray-500/10 text-gray-500'
                      )}>
                        {item.status}
                      </span>
                    </div>
                    {item.script && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.script}</p>
                    )}
                  </button>
                ))}
                {filteredContent.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No content found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Platform selection + results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Platform Picker */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-3">Target Platforms</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const selected = selectedPlatforms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePlatform(p.key)}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all',
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full', p.bg)}>
                      <Icon className={clsx('h-5 w-5', p.color)} />
                    </div>
                    <span className="text-xs font-medium text-center">{p.label}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleRepurpose}
              disabled={!selectedId || selectedPlatforms.length === 0 || repurposing}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {repurposing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Repurposing with AI…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Repurpose for {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>

          {/* Selected content preview */}
          {selectedContent && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Original TikTok</h4>
              </div>
              <p className="font-medium">{selectedContent.title}</p>
              {selectedContent.script && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{selectedContent.script}</p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedContent.account?.platform_username}</span>
                <span>•</span>
                <span>{selectedContent.status}</span>
                <span>•</span>
                <span>{new Date(selectedContent.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* No content selected */}
          {!selectedContent && !repurposing && (
            <div className="rounded-lg border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Share2 className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">Select content to repurpose</p>
              <p className="text-sm mt-1">Pick a TikTok from the left, choose platforms, and let AI adapt it</p>
            </div>
          )}

          {/* Results */}
          {currentResults && Object.keys(currentResults).length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Repurposed Versions
              </h3>
              {Object.entries(currentResults).map(([platformKey, result]) => {
                const platform = PLATFORMS.find((p) => p.key === platformKey);
                if (!platform) return null;
                const Icon = platform.icon;
                const isExpanded = expandedPlatform === platformKey;
                const hasError = result.error;

                return (
                  <div key={platformKey} className="rounded-lg border border-border bg-card overflow-hidden">
                    <button
                      onClick={() => setExpandedPlatform(isExpanded ? null : platformKey)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full', platform.bg)}>
                          <Icon className={clsx('h-5 w-5', platform.color)} />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">{platform.label}</p>
                          {!hasError && result.title && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{result.title}</p>
                          )}
                          {hasError && <p className="text-xs text-red-500">Failed to generate</p>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>

                    {isExpanded && !hasError && (
                      <div className="border-t border-border p-4 space-y-4">
                        {/* Title */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
                            <button
                              onClick={() => copyToClipboard(result.title, `${platformKey}-title`)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              {copied === `${platformKey}-title` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copied === `${platformKey}-title` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-sm font-medium">{result.title}</p>
                        </div>

                        {/* Script */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Script
                            </label>
                            <button
                              onClick={() => copyToClipboard(result.script, `${platformKey}-script`)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              {copied === `${platformKey}-script` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copied === `${platformKey}-script` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">{result.script}</div>
                          {result.platform_spec && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Max {result.platform_spec.maxLength}s • {result.platform_spec.format} • {result.platform_spec.aspect}
                            </p>
                          )}
                        </div>

                        {/* Caption */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caption</label>
                            <button
                              onClick={() => copyToClipboard(
                                result.caption + '\n\n' + (result.hashtags || []).map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' '),
                                `${platformKey}-caption`
                              )}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              {copied === `${platformKey}-caption` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copied === `${platformKey}-caption` ? 'Copied!' : 'Copy All'}
                            </button>
                          </div>
                          <p className="text-sm">{result.caption}</p>
                        </div>

                        {/* Hashtags */}
                        {result.hashtags && result.hashtags.length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                              <Hash className="h-3 w-3" /> Hashtags
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {result.hashtags.map((tag: string, i: number) => (
                                <span key={i} className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
                                  {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tips */}
                        {result.tips && result.tips.length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                              <Lightbulb className="h-3 w-3" /> Platform Tips
                            </label>
                            <ul className="space-y-1">
                              {result.tips.map((tip: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Copy All button */}
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `Title: ${result.title}\n\nScript:\n${result.script}\n\nCaption:\n${result.caption}\n\nHashtags: ${(result.hashtags || []).join(' ')}`,
                              `${platformKey}-all`
                            )
                          }
                          className="w-full flex items-center justify-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
                        >
                          {copied === `${platformKey}-all` ? (
                            <><Check className="h-4 w-4" /> Copied Everything!</>
                          ) : (
                            <><Copy className="h-4 w-4" /> Copy All to Clipboard</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
