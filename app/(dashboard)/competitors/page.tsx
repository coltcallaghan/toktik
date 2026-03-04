'use client';

import React, { useEffect, useState } from 'react';
import {
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
  Link2,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';

/* ── Types ─────────────────────────────────────────────────────── */

type Platform = 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'linkedin' | 'facebook';

type Competitor = {
  id: string;
  username: string;
  platform: Platform | null;
  display_name: string;
  niche: string | null;
  follower_count: number;
  avg_views: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  posting_frequency: string | null;
  top_content_themes: string[];
  notes: string | null;
  last_analyzed_at: string | null;
  created_at: string;
};

/* ── Platform meta ─────────────────────────────────────────────── */

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
    </svg>
  );
}

const PLATFORM_META: Record<Platform, { label: string; icon: React.ElementType; color: string; bg: string; placeholder: string }> = {
  tiktok:    { label: 'TikTok',    icon: TikTokIcon, color: 'text-foreground', bg: 'bg-foreground/10', placeholder: 'username' },
  instagram: { label: 'Instagram', icon: Instagram,  color: 'text-pink-500',   bg: 'bg-pink-500/10',   placeholder: 'username' },
  youtube:   { label: 'YouTube',   icon: Youtube,    color: 'text-red-500',    bg: 'bg-red-500/10',    placeholder: 'channel name' },
  twitter:   { label: 'X/Twitter', icon: Twitter,    color: 'text-sky-500',    bg: 'bg-sky-500/10',    placeholder: 'username' },
  linkedin:  { label: 'LinkedIn',  icon: Linkedin,   color: 'text-blue-700',   bg: 'bg-blue-700/10',   placeholder: 'profile slug' },
  facebook:  { label: 'Facebook',  icon: Facebook,   color: 'text-blue-600',   bg: 'bg-blue-600/10',   placeholder: 'page name' },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_META) as Platform[];

/* ── Helpers ───────────────────────────────────────────────────── */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/* ── Component ─────────────────────────────────────────────────── */

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [addError, setAddError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [manualPlatform, setManualPlatform] = useState<Platform>('tiktok');
  const [manualUsername, setManualUsername] = useState('');
  const [formNiche, setFormNiche] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'manual'>('url');

  useEffect(() => { loadCompetitors(); }, []);

  async function loadCompetitors() {
    setLoading(true);
    try {
      const res = await fetch('/api/competitors');
      const data = await res.json();
      setCompetitors(Array.isArray(data) ? data : []);
    } catch {
      setCompetitors([]);
    }
    setLoading(false);
  }

  async function addCompetitor() {
    setAddError('');
    const canSubmit = inputMode === 'url' ? urlInput.trim().length > 0 : manualUsername.trim().length > 0;
    if (!canSubmit) return;

    setAdding(true);
    try {
      const body = inputMode === 'url'
        ? { url: urlInput.trim(), niche: formNiche || undefined, notes: formNotes || undefined }
        : { platform: manualPlatform, username: manualUsername.trim(), niche: formNiche || undefined, notes: formNotes || undefined };

      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setCompetitors((prev) => [data, ...prev]);
        setUrlInput(''); setManualUsername(''); setFormNiche(''); setFormNotes('');
        setShowForm(false);
      } else {
        setAddError(data.error ?? 'Failed to add competitor');
      }
    } catch {
      setAddError('Request failed');
    }
    setAdding(false);
  }

  async function removeCompetitor(id: string) {
    await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' });
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  }

  async function refreshCompetitor(id: string) {
    setRefreshing(id);
    const res = await fetch(`/api/competitors?id=${id}`, { method: 'PATCH' });
    if (res.ok) {
      const updated = await res.json();
      setCompetitors((prev) => prev.map((c) => c.id === id ? updated : c));
    }
    setRefreshing(null);
  }

  async function refreshAll() {
    for (const c of competitors) {
      await refreshCompetitor(c.id);
    }
  }

  const isRefreshingAll = refreshing !== null;

  const canSubmit = inputMode === 'url' ? urlInput.trim().length > 0 : manualUsername.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competitors</h1>
          <p className="text-muted-foreground">
            Track competitor accounts and analyze their content strategy
          </p>
        </div>
        <div className="flex items-center gap-2">
          {competitors.length > 0 && !showForm && (
            <Button variant="outline" onClick={refreshAll} disabled={isRefreshingAll}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              {isRefreshingAll ? 'Refreshing…' : 'Refresh All'}
            </Button>
          )}
          <Button onClick={() => { setShowForm(!showForm); setAddError(''); }}>
            {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add Competitor'}
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-md border border-border bg-muted p-1 w-fit">
              <button
                onClick={() => setInputMode('url')}
                className={clsx('flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors', inputMode === 'url' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Link2 className="h-3.5 w-3.5" />
                Paste URL
              </button>
              <button
                onClick={() => setInputMode('manual')}
                className={clsx('flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors', inputMode === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Users className="h-3.5 w-3.5" />
                Pick Platform
              </button>
            </div>

            {inputMode === 'url' ? (
              <div>
                <label className="text-sm font-medium block mb-1">Profile URL</label>
                <input
                  type="text"
                  placeholder="https://www.tiktok.com/@username  or  https://www.instagram.com/username"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">Supports TikTok, Instagram, YouTube, X/Twitter, LinkedIn, Facebook</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-2">Platform</label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {ALL_PLATFORMS.map((p) => {
                      const meta = PLATFORM_META[p];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={p}
                          onClick={() => setManualPlatform(p)}
                          className={clsx(
                            'flex flex-col items-center gap-1 rounded-lg border p-2.5 transition-all text-xs font-medium',
                            manualPlatform === p ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <div className={clsx('flex h-8 w-8 items-center justify-center rounded-full', meta.bg)}>
                            <Icon className={clsx('h-4 w-4', meta.color)} />
                          </div>
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Username</label>
                  <div className="flex items-center">
                    <span className="rounded-l-md border border-r-0 border-border bg-muted px-3 py-2 text-sm text-muted-foreground">@</span>
                    <input
                      type="text"
                      placeholder={PLATFORM_META[manualPlatform].placeholder}
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value.replace(/^@/, ''))}
                      className="flex-1 rounded-r-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1">Niche (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. fitness, comedy"
                  value={formNiche}
                  onChange={(e) => setFormNiche(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="Why you're tracking them"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {addError && <p className="text-sm text-destructive">{addError}</p>}

            <Button onClick={addCompetitor} disabled={adding || !canSubmit}>
              {adding
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching live data…</>
                : <><Search className="mr-2 h-4 w-4" />Add &amp; Analyze</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {competitors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Tracked</p><p className="text-2xl font-bold">{competitors.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Avg Followers</p><p className="text-2xl font-bold">{fmtNum(Math.round(competitors.reduce((s, c) => s + c.follower_count, 0) / competitors.length))}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Niches Covered</p><p className="text-2xl font-bold">{new Set(competitors.map((c) => c.niche).filter(Boolean)).size}</p></CardContent></Card>
        </div>
      )}

      {/* Competitor cards */}
      {competitors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No competitors tracked yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Paste a profile URL or pick a platform above to get a live analysis.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competitors.map((c) => {
            const meta = c.platform ? PLATFORM_META[c.platform] : null;
            const Icon = meta?.icon;
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {Icon && meta && (
                        <div className={clsx('flex h-8 w-8 items-center justify-center rounded-full shrink-0', meta.bg)}>
                          <Icon className={clsx('h-4 w-4', meta.color)} />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{c.display_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          @{c.username}
                          {meta && <span className="ml-1.5 text-xs">· {meta.label}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.last_analyzed_at && (
                        <span className="text-[10px] text-muted-foreground mr-1">{new Date(c.last_analyzed_at).toLocaleDateString()}</span>
                      )}
                      <button
                        onClick={() => refreshCompetitor(c.id)}
                        disabled={refreshing === c.id}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                        title="Refresh data"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing === c.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => removeCompetitor(c.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Followers', val: fmtNum(c.follower_count), icon: Users, confirmed: true },
                      { label: 'Avg Views', val: c.avg_views != null ? fmtNum(c.avg_views) : '—', icon: Eye, confirmed: c.avg_views != null },
                      { label: 'Avg Likes', val: c.avg_likes != null ? fmtNum(c.avg_likes) : '—', icon: Heart, confirmed: c.avg_likes != null },
                      { label: 'Comments', val: c.avg_comments != null ? fmtNum(c.avg_comments) : '—', icon: MessageCircle, confirmed: c.avg_comments != null },
                    ].map(({ label, val, icon: MIcon, confirmed }) => (
                      <div key={label} className="rounded-md bg-muted p-2">
                        <MIcon className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                        <p className={`text-sm font-bold ${!confirmed ? 'text-muted-foreground' : ''}`}>{val}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {c.niche && <div className="flex justify-between"><span className="text-muted-foreground">Niche</span><span className="font-medium">{c.niche}</span></div>}
                    {c.posting_frequency && <div className="flex justify-between"><span className="text-muted-foreground">Posts</span><span className="font-medium">{c.posting_frequency}</span></div>}
                  </div>

                  {c.top_content_themes?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Content Themes</p>
                      <div className="flex flex-wrap gap-1">
                        {c.top_content_themes.map((theme, i) => (
                          <span key={i} className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px]">{theme}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.notes && <p className="text-xs text-muted-foreground italic">"{c.notes}"</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
