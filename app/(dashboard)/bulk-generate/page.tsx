'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Layers,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient, type Account, type Trend } from '@/lib/supabase';

/* ── Types ─────────────────────────────────────────────────────── */

type BulkResult = {
  account_id: string;
  content_id: string;
  title: string;
  status: 'ok' | 'error';
  error?: string;
};

/* ── Component ─────────────────────────────────────────────────── */

export default function BulkGeneratePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [planAllowed, setPlanAllowed] = useState<boolean | null>(null);

  // Form state
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [customTrend, setCustomTrend] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [useTrendPicker, setUseTrendPicker] = useState(true);

  useEffect(() => {
    loadData();
    fetch('/api/user-api-keys')
      .then((r) => r.json())
      .then((d) => setHasAnthropicKey(!!d.configured?.anthropic))
      .catch(() => {});
    fetch('/api/user-plan')
      .then((r) => r.json())
      .then((d) => setPlanAllowed(d.config?.features?.bulkGenerate === true))
      .catch(() => setPlanAllowed(false));
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [acctRes, trendRes] = await Promise.all([
      supabase.from('accounts').select('*').order('platform_username'),
      supabase.from('trends').select('*').order('detected_at', { ascending: false }).limit(20),
    ]);
    setAccounts(acctRes.data ?? []);
    setTrends(trendRes.data ?? []);
    setLoading(false);
  }

  /* ── Toggle account selection ──────────────────────────────────── */

  function toggleAccount(id: string) {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map((a) => a.id)));
    }
  }

  /* ── Generate ──────────────────────────────────────────────────── */

  async function handleGenerate() {
    if (selectedAccounts.size === 0) return;
    const trendName = useTrendPicker ? selectedTrend?.trend_name : customTrend;
    const trendDesc = useTrendPicker ? selectedTrend?.description ?? '' : customDesc;
    if (!trendName) return;

    setGenerating(true);
    setResults(null);
    setProgress(0);

    // Fake progress while waiting
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / (selectedAccounts.size * 4), 95));
    }, 800);

    try {
      const res = await fetch('/api/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trend_name: trendName,
          trend_description: trendDesc,
          account_ids: Array.from(selectedAccounts),
        }),
      });

      const data = await res.json();
      setResults(data.results ?? []);
      setProgress(100);
    } catch {
      setResults([]);
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  if (loading || planAllowed === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!planAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <Layers className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-2xl font-bold">Bulk Generate is a Creator feature</h2>
        <p className="text-muted-foreground max-w-sm">
          Generate content for multiple accounts at once. Upgrade to Creator or Agency to unlock this.
        </p>
        <a
          href="/settings?tab=billing"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Zap className="h-4 w-4" />
          Upgrade Plan
        </a>
      </div>
    );
  }

  const canGenerate =
    selectedAccounts.size > 0 &&
    (useTrendPicker ? !!selectedTrend : customTrend.trim().length > 0) &&
    !generating &&
    hasAnthropicKey;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bulk Generate</h1>
        <p className="text-muted-foreground">
          Generate content for multiple accounts at once — each tailored to the account's niche &amp; tone
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Pick a trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Step 1 — Choose a Trend or Topic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={useTrendPicker ? 'default' : 'outline'}
                  onClick={() => setUseTrendPicker(true)}
                >
                  From Trends
                </Button>
                <Button
                  size="sm"
                  variant={!useTrendPicker ? 'default' : 'outline'}
                  onClick={() => setUseTrendPicker(false)}
                >
                  Custom Topic
                </Button>
              </div>

              {useTrendPicker ? (
                <div className="grid gap-2 max-h-52 overflow-y-auto">
                  {trends.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No trends yet. Fetch trends from the Trends page first.
                    </p>
                  )}
                  {trends.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTrend(t)}
                      className={`text-left rounded-md border p-3 text-sm transition-colors ${
                        selectedTrend?.id === t.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="font-medium">{t.trend_name}</div>
                      {t.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {t.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter a topic or trend name..."
                    value={customTrend}
                    onChange={(e) => setCustomTrend(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="Optional description or extra context..."
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Step 2 — Select Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  {selectedAccounts.size === accounts.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedAccounts.size} of {accounts.length} selected
                </span>
              </div>

              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accounts found. Add accounts on the Accounts page first.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {accounts.map((a) => {
                    const checked = selectedAccounts.has(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAccount(a.id)}
                        className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                          checked
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            checked
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            @{a.platform_username}
                          </div>
                          {a.niche && (
                            <div className="text-xs text-muted-foreground truncate">
                              {a.niche}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Summary + Generate */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Generate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trend / Topic</span>
                  <span className="font-medium truncate max-w-[140px]">
                    {useTrendPicker
                      ? selectedTrend?.trend_name ?? '—'
                      : customTrend || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accounts</span>
                  <span className="font-medium">{selectedAccounts.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Drafts to create</span>
                  <span className="font-medium">{selectedAccounts.size}</span>
                </div>
              </div>

              {!hasAnthropicKey && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                  Anthropic API key required — add it in{' '}
                  <a href="/settings" className="underline hover:no-underline">Settings → API & Integrations</a>
                </p>
              )}
              <Button
                className="w-full"
                disabled={!canGenerate}
                onClick={handleGenerate}
                title={!hasAnthropicKey ? 'Add your Anthropic API key in Settings → API & Integrations' : undefined}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate {selectedAccounts.size} Draft{selectedAccounts.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>

              {/* Progress */}
              {generating && (
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Generating content with AI agents…
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.length === 0 && (
                  <p className="text-sm text-muted-foreground">No results.</p>
                )}
                {results.map((r, i) => {
                  const acct = accounts.find((a) => a.id === r.account_id);
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${
                        r.status === 'ok'
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      {r.status === 'ok' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          @{acct?.platform_username ?? 'unknown'}
                        </div>
                        {r.status === 'ok' ? (
                          <div className="text-xs text-muted-foreground truncate">
                            {r.title}
                          </div>
                        ) : (
                          <div className="text-xs text-red-400 truncate">{r.error}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
