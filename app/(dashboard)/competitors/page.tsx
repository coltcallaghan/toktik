'use client';

import React, { useEffect, useState } from 'react';
import {
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/* ── Types ─────────────────────────────────────────────────────── */

type Competitor = {
  id: string;
  username: string;
  display_name: string;
  niche: string | null;
  follower_count: number;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  posting_frequency: string | null;
  top_content_themes: string[];
  notes: string | null;
  last_analyzed_at: string | null;
  created_at: string;
};

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
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formUsername, setFormUsername] = useState('');
  const [formNiche, setFormNiche] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadCompetitors();
  }, []);

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
    if (!formUsername.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUsername,
          niche: formNiche || undefined,
          notes: formNotes || undefined,
        }),
      });
      if (res.ok) {
        const newComp = await res.json();
        setCompetitors((prev) => [newComp, ...prev]);
        setFormUsername('');
        setFormNiche('');
        setFormNotes('');
        setShowForm(false);
      }
    } catch {}
    setAdding(false);
  }

  async function removeCompetitor(id: string) {
    await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' });
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  }

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
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Competitor'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium block mb-1">TikTok Username</label>
                <input
                  type="text"
                  placeholder="@username"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
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
            <Button onClick={addCompetitor} disabled={adding || !formUsername.trim()}>
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Add &amp; Analyze
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {competitors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Tracked</p>
              <p className="text-2xl font-bold">{competitors.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Avg Followers</p>
              <p className="text-2xl font-bold">
                {fmtNum(
                  Math.round(
                    competitors.reduce((s, c) => s + c.follower_count, 0) / competitors.length
                  )
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Avg Views</p>
              <p className="text-2xl font-bold">
                {fmtNum(
                  Math.round(
                    competitors.reduce((s, c) => s + c.avg_views, 0) / competitors.length
                  )
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Niches Covered</p>
              <p className="text-2xl font-bold">
                {new Set(competitors.map((c) => c.niche).filter(Boolean)).size}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Competitor cards */}
      {competitors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No competitors tracked yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add a competitor above to get an AI-powered analysis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competitors.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {c.display_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">@{c.username}</p>
                  </div>
                  <button
                    onClick={() => removeCompetitor(c.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Metrics row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Followers', val: fmtNum(c.follower_count), icon: Users },
                    { label: 'Avg Views', val: fmtNum(c.avg_views), icon: Eye },
                    { label: 'Avg Likes', val: fmtNum(c.avg_likes), icon: Heart },
                    { label: 'Comments', val: fmtNum(c.avg_comments), icon: MessageCircle },
                  ].map(({ label, val, icon: Icon }) => (
                    <div key={label} className="rounded-md bg-muted p-2">
                      <Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                      <p className="text-sm font-bold">{val}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Additional info */}
                <div className="space-y-1.5 text-sm">
                  {c.niche && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Niche</span>
                      <span className="font-medium">{c.niche}</span>
                    </div>
                  )}
                  {c.posting_frequency && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Posts</span>
                      <span className="font-medium">{c.posting_frequency}</span>
                    </div>
                  )}
                </div>

                {/* Content themes */}
                {c.top_content_themes?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Content Themes</p>
                    <div className="flex flex-wrap gap-1">
                      {c.top_content_themes.map((theme, i) => (
                        <span
                          key={i}
                          className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px]"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {c.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    "{c.notes}"
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
