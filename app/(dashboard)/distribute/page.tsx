'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Share2,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Video,
  Users,
} from 'lucide-react';
import { createClient, type Content, type Account } from '@/lib/supabase';
import clsx from 'clsx';

type ContentWithAccount = Content & { account?: Account };

const PLATFORM_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  tiktok: { label: 'TikTok', icon: Share2, color: 'text-foreground', bg: 'bg-muted' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-600/10' },
  twitter: { label: 'X / Twitter', icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-700/10' },
};

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('content'));
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [distributing, setDistributing] = useState(false);
  const [results, setResults] = useState<Record<string, Record<string, { ok: boolean; message: string }>>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const [contentRes, accountsRes] = await Promise.all([
        supabase.from('content').select('*').order('created_at', { ascending: false }),
        supabase.from('accounts').select('*').eq('status', 'active'),
      ]);
      if (!accountsRes.error && accountsRes.data) setAccounts(accountsRes.data);
      if (!contentRes.error && contentRes.data) {
        setContent(
          contentRes.data.map((c) => ({
            ...c,
            account: accountsRes.data?.find((a) => a.id === c.account_id),
          }))
        );
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function handleDistribute() {
    if (!selectedId || selectedAccountIds.length === 0) return;
    setDistributing(true);

    try {
      const res = await fetch(`/api/content/${selectedId}/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_ids: selectedAccountIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults((prev) => ({ ...prev, [selectedId]: data.results }));
      }
    } catch (err) {
      console.error('Distribute failed:', err);
    }
    setDistributing(false);
  }

  const selectedContent = content.find((c) => c.id === selectedId);
  const currentResults = selectedId ? results[selectedId] : null;

  // Exclude the account the content already belongs to
  const eligibleAccounts = accounts.filter((a) => a.id !== selectedContent?.account_id);

  const filteredContent = content.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.account?.platform_username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Cross-Post Video</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a piece of content with a video, pick accounts to post it to, and distribute with one click
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
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredContent.map((item) => {
                  const hasVideo = !!item.video_url;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedId(item.id); setSelectedAccountIds([]); }}
                      disabled={!hasVideo}
                      className={clsx(
                        'w-full text-left rounded-md border p-3 transition-colors',
                        !hasVideo && 'opacity-40 cursor-not-allowed',
                        selectedId === item.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {hasVideo
                          ? <Video className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          : <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        }
                        <p className="font-medium text-sm truncate">{item.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {item.account?.platform_username || 'No account'}
                        </span>
                        {!hasVideo && <span className="text-xs text-amber-500">No video</span>}
                      </div>
                    </button>
                  );
                })}
                {filteredContent.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No content found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Account picker + results */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedContent ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Share2 className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">Select content to distribute</p>
              <p className="text-sm mt-1">Only content with a video attached can be cross-posted</p>
            </div>
          ) : (
            <>
              {/* Selected content summary */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold">{selectedContent.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Originally posted to {selectedContent.account?.platform_username ?? 'unknown account'}
                </p>
              </div>

              {/* Account Picker */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Post to Accounts</h3>
                </div>

                {eligibleAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No other active accounts found. Add more accounts in the Accounts page.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {eligibleAccounts.map((acc) => {
                      const meta = PLATFORM_META[acc.platform] ?? PLATFORM_META['tiktok'];
                      const Icon = meta.icon;
                      const selected = selectedAccountIds.includes(acc.id);
                      const hasToken = !!(acc.tiktok_access_token || acc.platform_access_token);

                      return (
                        <button
                          key={acc.id}
                          onClick={() => toggleAccount(acc.id)}
                          className={clsx(
                            'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                            selected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <div className={clsx('flex h-9 w-9 items-center justify-center rounded-full shrink-0', meta.bg)}>
                            <Icon className={clsx('h-4 w-4', meta.color)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{acc.platform_username}</p>
                            <p className="text-xs text-muted-foreground capitalize">{meta.label}</p>
                          </div>
                          {!hasToken && (
                            <span className="text-xs text-amber-500 shrink-0">Not connected</span>
                          )}
                          {selected && hasToken && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={handleDistribute}
                  disabled={selectedAccountIds.length === 0 || distributing}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {distributing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Posting…</>
                  ) : (
                    <><Share2 className="h-4 w-4" />Post to {selectedAccountIds.length} Account{selectedAccountIds.length !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>

              {/* Results */}
              {currentResults && Object.keys(currentResults).length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <h3 className="font-semibold text-sm mb-3">Results</h3>
                  {Object.entries(currentResults).map(([accountId, result]) => {
                    const acc = accounts.find((a) => a.id === accountId);
                    const meta = acc ? (PLATFORM_META[acc.platform] ?? PLATFORM_META['tiktok']) : null;
                    const Icon = meta?.icon ?? Share2;
                    return (
                      <div
                        key={accountId}
                        className={clsx(
                          'flex items-start gap-3 rounded-md p-3',
                          result.ok ? 'bg-green-500/5 border border-green-500/20' : 'bg-destructive/5 border border-destructive/20'
                        )}
                      >
                        {result.ok
                          ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          : <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        }
                        <div>
                          <p className="text-sm font-medium">{acc?.platform_username ?? accountId}</p>
                          <p className={clsx('text-xs mt-0.5', result.ok ? 'text-green-600' : 'text-destructive')}>
                            {result.message}
                          </p>
                        </div>
                        {meta && <Icon className={clsx('h-4 w-4 shrink-0 ml-auto mt-0.5', meta.color)} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
