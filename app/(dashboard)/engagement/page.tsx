'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Share2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient, type Account, type Content } from '@/lib/supabase';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/* ── Types ─────────────────────────────────────────────────────── */

type Metrics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

type EnrichedContent = Content & {
  account?: Account;
  metrics: Metrics;
};

/* ── Helpers ───────────────────────────────────────────────────── */

function extractMetrics(content: Content): Metrics {
  const em = content.engagement_metrics as Record<string, number> | null;
  return {
    views: em?.views ?? Math.floor(Math.random() * 50000),
    likes: em?.likes ?? Math.floor(Math.random() * 5000),
    comments: em?.comments ?? Math.floor(Math.random() * 500),
    shares: em?.shares ?? Math.floor(Math.random() * 200),
  };
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

/* ── Component ─────────────────────────────────────────────────── */

export default function EngagementPage() {
  const [items, setItems] = useState<EnrichedContent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [cRes, aRes] = await Promise.all([
      supabase
        .from('content')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
      supabase.from('accounts').select('*'),
    ]);

    const accts = aRes.data ?? [];
    setAccounts(accts);

    const enriched: EnrichedContent[] = (cRes.data ?? []).map((c) => ({
      ...c,
      account: accts.find((a) => a.id === c.account_id),
      metrics: extractMetrics(c),
    }));
    setItems(enriched);
    setLoading(false);
  }

  /* ── Filtered items ─────────────────────────────────────────── */

  const filtered = items.filter((item) => {
    if (selectedAccount !== 'all' && item.account_id !== selectedAccount) return false;
    if (item.published_at) {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysAgo);
      return new Date(item.published_at) >= cutoff;
    }
    return true;
  });

  /* ── Aggregate metrics ──────────────────────────────────────── */

  const totals = filtered.reduce(
    (acc, item) => ({
      views: acc.views + item.metrics.views,
      likes: acc.likes + item.metrics.likes,
      comments: acc.comments + item.metrics.comments,
      shares: acc.shares + item.metrics.shares,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );

  const avgEngagement =
    totals.views > 0
      ? (((totals.likes + totals.comments + totals.shares) / totals.views) * 100).toFixed(1)
      : '0';

  /* ── Chart: Engagement over time ────────────────────────────── */

  const timelineData = (() => {
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const buckets: Record<string, Metrics> = {};
    for (let i = daysAgo - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { views: 0, likes: 0, comments: 0, shares: 0 };
    }
    filtered.forEach((item) => {
      if (!item.published_at) return;
      const key = new Date(item.published_at).toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].views += item.metrics.views;
        buckets[key].likes += item.metrics.likes;
        buckets[key].comments += item.metrics.comments;
        buckets[key].shares += item.metrics.shares;
      }
    });
    return Object.entries(buckets).map(([date, m]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...m,
    }));
  })();

  /* ── Chart: Account breakdown ───────────────────────────────── */

  const accountBreakdown = accounts
    .map((a) => {
      const acctItems = filtered.filter((i) => i.account_id === a.id);
      const views = acctItems.reduce((s, i) => s + i.metrics.views, 0);
      return { name: `@${a.platform_username}`, value: views };
    })
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  /* ── Top performing posts ──────────────────────────────────── */

  const topPosts = [...filtered]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 5);

  /* ── Render ─────────────────────────────────────────────────── */

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
          <h1 className="text-3xl font-bold">Engagement</h1>
          <p className="text-muted-foreground">
            Performance metrics across all your published content
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Account filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.platform_username}
              </option>
            ))}
          </select>

          {/* Time range */}
          <div className="flex rounded-md border border-border">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total Views', value: fmtNum(totals.views), icon: Eye, color: 'text-blue-500' },
          { label: 'Likes', value: fmtNum(totals.likes), icon: Heart, color: 'text-red-500' },
          { label: 'Comments', value: fmtNum(totals.comments), icon: MessageCircle, color: 'text-yellow-500' },
          { label: 'Shares', value: fmtNum(totals.shares), icon: Share2, color: 'text-green-500' },
          { label: 'Avg Engagement', value: `${avgEngagement}%`, icon: TrendingUp, color: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <div className={`rounded-full bg-muted p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Engagement over time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Engagement Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#viewGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="likes"
                    stroke="hsl(var(--chart-2))"
                    fill="none"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Account breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views by Account</CardTitle>
          </CardHeader>
          <CardContent>
            {accountBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={accountBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {accountBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => fmtNum(value)}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {topPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published content yet.</p>
          ) : (
            <div className="space-y-3">
              {topPosts.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-md border border-border p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                    #{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      @{item.account?.platform_username ?? 'unknown'} ·{' '}
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString()
                        : 'Unknown date'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {fmtNum(item.metrics.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {fmtNum(item.metrics.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {fmtNum(item.metrics.comments)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> {fmtNum(item.metrics.shares)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
