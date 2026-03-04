'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Loader2,
  Trophy,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient, type Account, type Content } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ABTest {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  trend_name: string | null;
  status: 'active' | 'completed' | 'cancelled';
  winner_variant_id: string | null;
  created_at: string;
  updated_at: string;
}

type VariantContent = Content & {
  variant_label: string | null;
  ab_test_id: string | null;
  account?: { platform_username: string; avatar_url: string | null };
};

interface TestWithVariants extends ABTest {
  variants: VariantContent[];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ABTestingPage() {
  const [tests, setTests] = useState<TestWithVariants[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTrend, setFormTrend] = useState('');
  const [formTrendDesc, setFormTrendDesc] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formVariantCount, setFormVariantCount] = useState(3);
  const [createError, setCreateError] = useState('');

  // Actions
  const [pickingWinner, setPickingWinner] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [planAllowed, setPlanAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    loadAll();
    fetch('/api/user-plan')
      .then((r) => r.json())
      .then((d) => setPlanAllowed(d.config?.features?.abTesting === true))
      .catch(() => setPlanAllowed(false));
  }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();

    // Load accounts
    const { data: accts } = await supabase.from('accounts').select('*');
    setAccounts(accts ?? []);

    // Load tests
    const res = await fetch('/api/ab-test');
    const data = await res.json();
    const testList: ABTest[] = data.tests ?? [];

    // Load variants for each test
    const testsWithVariants: TestWithVariants[] = [];
    for (const test of testList) {
      const detailRes = await fetch(`/api/ab-test/${test.id}`);
      const detailData = await detailRes.json();
      testsWithVariants.push({
        ...test,
        variants: detailData.variants ?? [],
      });
    }

    setTests(testsWithVariants);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    const res = await fetch('/api/ab-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        trend_name: formTrend,
        trend_description: formTrendDesc,
        account_id: formAccountId,
        variant_count: formVariantCount,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error ?? 'Failed to create test');
    } else {
      setFormName('');
      setFormTrend('');
      setFormTrendDesc('');
      setFormAccountId('');
      setFormVariantCount(3);
      setShowCreate(false);
      await loadAll();
    }
    setCreating(false);
  }

  async function handlePickWinner(testId: string, variantId: string) {
    setPickingWinner(variantId);
    await fetch(`/api/ab-test/${testId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', winner_variant_id: variantId }),
    });
    await loadAll();
    setPickingWinner(null);
  }

  async function handleDelete(testId: string) {
    if (!confirm('Delete this A/B test? The content drafts will be kept.')) return;
    setDeleting(testId);
    await fetch(`/api/ab-test/${testId}`, { method: 'DELETE' });
    setTests((prev) => prev.filter((t) => t.id !== testId));
    setDeleting(null);
  }

  function getMetric(variant: VariantContent, key: string): number {
    const m = variant.engagement_metrics as Record<string, unknown> | null;
    return typeof m?.[key] === 'number' ? (m[key] as number) : 0;
  }

  function getEngagementScore(variant: VariantContent): number {
    const views = getMetric(variant, 'views');
    const likes = getMetric(variant, 'likes');
    const comments = getMetric(variant, 'comments');
    const shares = getMetric(variant, 'shares');
    if (views === 0) return 0;
    return ((likes + comments * 2 + shares * 3) / views) * 100;
  }

  function getBestVariant(variants: VariantContent[]): VariantContent | null {
    const published = variants.filter((v) => v.status === 'published');
    if (published.length === 0) return null;
    return published.reduce((best, v) =>
      getEngagementScore(v) > getEngagementScore(best) ? v : best
    );
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
        <FlaskConical className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-2xl font-bold">A/B Testing is a Creator feature</h2>
        <p className="text-muted-foreground max-w-sm">
          Test multiple content variations and find what performs best. Upgrade to Creator or Agency to unlock this.
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

  const activeTests = tests.filter((t) => t.status === 'active');
  const completedTests = tests.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground">
            Test multiple content variations and find what performs best
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          New Test
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <FlaskConical className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeTests.length}</p>
              <p className="text-sm text-muted-foreground">Active Tests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Trophy className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTests.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <BarChart3 className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {tests.reduce((sum, t) => sum + t.variants.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Variants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create A/B Test</CardTitle>
            <CardDescription>
              AI will generate multiple distinct content variations for the same trend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Test Name</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder='e.g. "Hook style comparison"'
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account</label>
                  <select
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.platform_username}
                        {a.niche ? ` — ${a.niche}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trend / Topic</label>
                  <Input
                    value={formTrend}
                    onChange={(e) => setFormTrend(e.target.value)}
                    placeholder="e.g. Morning routines"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Variants</label>
                  <select
                    value={formVariantCount}
                    onChange={(e) => setFormVariantCount(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value={2}>2 variants (A/B)</option>
                    <option value={3}>3 variants (A/B/C)</option>
                    <option value={4}>4 variants</option>
                    <option value={5}>5 variants</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Trend Context (optional)</label>
                <textarea
                  value={formTrendDesc}
                  onChange={(e) => setFormTrendDesc(e.target.value)}
                  placeholder="Extra context about the trend to help AI generate better variations…"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Variants…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Test
                    </>
                  )}
                </Button>
                <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tests list */}
      {tests.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No A/B tests yet</p>
            <p className="text-xs text-muted-foreground">
              Create a test to generate multiple content variations and compare performance
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const isExpanded = expandedTest === test.id;
            const best = getBestVariant(test.variants);
            const winner = test.winner_variant_id
              ? test.variants.find((v) => v.id === test.winner_variant_id)
              : null;

            return (
              <Card key={test.id}>
                {/* Header */}
                <div
                  className="flex cursor-pointer items-center justify-between p-6 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        test.status === 'completed'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {test.status === 'completed' ? (
                        <Trophy className="h-5 w-5" />
                      ) : (
                        <FlaskConical className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{test.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            test.status === 'completed'
                              ? 'bg-green-500/10 text-green-500'
                              : test.status === 'active'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {test.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {test.trend_name} · {test.variants.length} variants ·{' '}
                        {new Date(test.created_at).toLocaleDateString()}
                        {winner && (
                          <span className="ml-2 text-green-500">
                            🏆 Winner: Variant {winner.variant_label}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(test.id);
                      }}
                      disabled={deleting === test.id}
                    >
                      {deleting === test.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded: variant comparison */}
                {isExpanded && (
                  <CardContent className="border-t border-border pt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {test.variants.map((variant) => {
                        const views = getMetric(variant, 'views');
                        const likes = getMetric(variant, 'likes');
                        const comments = getMetric(variant, 'comments');
                        const shares = getMetric(variant, 'shares');
                        const score = getEngagementScore(variant);
                        const isBest = best?.id === variant.id && variant.status === 'published';
                        const isWinner = test.winner_variant_id === variant.id;
                        const angle = (variant.engagement_metrics as Record<string, unknown> | null)
                          ?.angle as string | undefined;

                        return (
                          <div
                            key={variant.id}
                            className={`rounded-lg border p-4 space-y-3 ${
                              isWinner
                                ? 'border-green-500 bg-green-500/5 ring-1 ring-green-500/20'
                                : isBest
                                ? 'border-yellow-500/50 bg-yellow-500/5'
                                : 'border-border'
                            }`}
                          >
                            {/* Variant header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                  {variant.variant_label}
                                </span>
                                {isWinner && (
                                  <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                                    <Trophy className="h-3 w-3" />
                                    Winner
                                  </span>
                                )}
                                {isBest && !isWinner && (
                                  <span className="text-xs font-medium text-yellow-500">
                                    ⭐ Best performing
                                  </span>
                                )}
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  variant.status === 'published'
                                    ? 'bg-green-500/10 text-green-500'
                                    : variant.status === 'draft'
                                    ? 'bg-yellow-500/10 text-yellow-500'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {variant.status}
                              </span>
                            </div>

                            {/* Title + angle */}
                            <div>
                              <p className="text-sm font-semibold leading-tight">
                                {variant.title.replace(/^\[[A-Z]\]\s*/, '')}
                              </p>
                              {angle && (
                                <p className="mt-1 text-xs text-muted-foreground italic">
                                  Angle: {angle}
                                </p>
                              )}
                            </div>

                            {/* Script preview */}
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {variant.script}
                            </p>

                            {/* Metrics */}
                            {variant.status === 'published' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Eye className="h-3 w-3 text-muted-foreground" />
                                  <span>{views.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Heart className="h-3 w-3 text-red-400" />
                                  <span>{likes.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <MessageCircle className="h-3 w-3 text-blue-400" />
                                  <span>{comments.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Share2 className="h-3 w-3 text-green-400" />
                                  <span>{shares.toLocaleString()}</span>
                                </div>
                              </div>
                            )}

                            {/* Engagement score bar */}
                            {variant.status === 'published' && views > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-muted-foreground">Engagement Score</span>
                                  <span className="font-semibold">{score.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isBest ? 'bg-green-500' : 'bg-primary'
                                    }`}
                                    style={{ width: `${Math.min(score * 5, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            {test.status === 'active' && variant.status === 'published' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => handlePickWinner(test.id, variant.id)}
                                disabled={pickingWinner === variant.id}
                              >
                                {pickingWinner === variant.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Trophy className="mr-1 h-3 w-3" />
                                )}
                                Pick as Winner
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Insights */}
                    {test.variants.some((v) => v.status === 'published') && (
                      <div className="mt-4 rounded-lg bg-muted/50 p-4">
                        <h4 className="text-sm font-semibold mb-2">Quick Insights</h4>
                        <TestInsights variants={test.variants} />
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Insights sub-component                                             */
/* ------------------------------------------------------------------ */

function TestInsights({ variants }: { variants: VariantContent[] }) {
  const published = variants.filter((v) => v.status === 'published');
  if (published.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Publish variants to see performance comparisons
      </p>
    );
  }

  function getMetric(v: VariantContent, key: string): number {
    const m = v.engagement_metrics as Record<string, unknown> | null;
    return typeof m?.[key] === 'number' ? (m[key] as number) : 0;
  }

  const totalViews = published.reduce((s, v) => s + getMetric(v, 'views'), 0);
  const totalLikes = published.reduce((s, v) => s + getMetric(v, 'likes'), 0);

  const bestViews = published.reduce((best, v) =>
    getMetric(v, 'views') > getMetric(best, 'views') ? v : best
  );
  const bestLikes = published.reduce((best, v) =>
    getMetric(v, 'likes') > getMetric(best, 'likes') ? v : best
  );

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        📊 Total across variants: {totalViews.toLocaleString()} views, {totalLikes.toLocaleString()} likes
      </p>
      {getMetric(bestViews, 'views') > 0 && (
        <p>
          👀 Most views: Variant {bestViews.variant_label} ({getMetric(bestViews, 'views').toLocaleString()})
        </p>
      )}
      {getMetric(bestLikes, 'likes') > 0 && (
        <p>
          ❤️ Most likes: Variant {bestLikes.variant_label} ({getMetric(bestLikes, 'likes').toLocaleString()})
        </p>
      )}
      {published.length < variants.length && (
        <p>
          ⏳ {variants.length - published.length} variant{variants.length - published.length !== 1 ? 's' : ''} still waiting to be published
        </p>
      )}
    </div>
  );
}
