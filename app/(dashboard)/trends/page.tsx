'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Flame, Zap, Target, Loader2, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import { createClient, type Trend } from '@/lib/supabase';
import { GenerateContentModal } from '@/components/generate-content-modal';

const ICONS = [Flame, TrendingUp, Zap, Target];

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState('');
  const [topPick, setTopPick] = useState<{ name: string; reason: string } | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);

  useEffect(() => {
    fetchTrends();
  }, []);

  async function fetchTrends() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('trends')
      .select('*')
      .order('momentum', { ascending: false });
    if (data) setTrends(data);
    setLoading(false);
  }

  async function analyseTrends() {
    setAnalysing(true);
    setTopPick(null);
    setAnalyseError('');

    try {
      const supabase = createClient();
      const { data: accounts } = await supabase.from('accounts').select('niche');
      const niches = accounts?.map((a) => a.niche).filter(Boolean) as string[];

      const res = await fetch('/api/fetch-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niches }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAnalyseError(data.error ?? `Server error ${res.status}`);
      } else {
        setTopPick({ name: data.top_pick, reason: data.top_pick_reason });
        await fetchTrends();
      }
    } catch (e) {
      setAnalyseError(e instanceof Error ? e.message : 'Network error');
    }

    setAnalysing(false);
  }

  const daysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  };

  return (
    <>
      {selectedTrend && (
        <GenerateContentModal
          trend={selectedTrend}
          onClose={() => setSelectedTrend(null)}
        />
      )}

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trending Topics</h1>
            <p className="text-muted-foreground">AI-powered trend analysis — act before momentum peaks</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTrends} disabled={loading || analysing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={analyseTrends} disabled={analysing}>
              {analysing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing...</>
                : <><Sparkles className="mr-2 h-4 w-4" />Analyse Trends</>
              }
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {analyseError && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-destructive font-medium">Analysis failed: {analyseError}</p>
            </CardContent>
          </Card>
        )}

        {/* AI Top Pick Banner */}
        {topPick && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="rounded-lg bg-primary p-2 shrink-0">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary">AI Top Pick: {topPick.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{topPick.reason}</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const t = trends.find((tr) => tr.trend_name === topPick.name);
                  if (t) setSelectedTrend(t);
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Create Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {(loading || analysing) && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {analysing ? 'Claude is analysing current TikTok trends…' : 'Loading trends…'}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !analysing && trends.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-semibold">No trends yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click &quot;Analyse Trends&quot; and Claude will identify the best opportunities for your accounts right now.
                </p>
              </div>
              <Button onClick={analyseTrends}>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyse Trends
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Trends grid */}
        {!loading && !analysing && trends.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {trends.map((trend, i) => {
              const Icon = ICONS[i % ICONS.length];
              const days = daysLeft(trend.expires_at);
              const isTopPick = topPick?.name === trend.trend_name;

              // Split description and hook/opportunity if encoded
              const descParts = trend.description?.split(' | ') ?? [];
              const mainDesc = descParts[0] ?? '';
              const hookPart = descParts.find((p) => p.startsWith('Hook:'));
              const oppPart = descParts.find((p) => p.startsWith('Opportunity'));

              return (
                <Card
                  key={trend.id}
                  className={`hover:shadow-lg transition-shadow ${isTopPick ? 'border-primary ring-1 ring-primary' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${isTopPick ? 'bg-primary' : 'bg-primary/10'}`}>
                          <Icon className={`h-5 w-5 ${isTopPick ? 'text-primary-foreground' : 'text-primary'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg leading-tight">{trend.trend_name}</CardTitle>
                          <CardDescription>{trend.category}</CardDescription>
                        </div>
                      </div>
                      {isTopPick && (
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                          Top Pick
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {mainDesc && (
                      <p className="text-sm text-muted-foreground">{mainDesc}</p>
                    )}

                    {hookPart && (
                      <div className="rounded-md bg-muted px-3 py-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Suggested Hook</p>
                        <p className="text-sm italic">{hookPart.replace('Hook: ', '').replace(/^"|"$/g, '')}</p>
                      </div>
                    )}

                    {oppPart && (
                      <p className="text-xs text-muted-foreground">{oppPart}</p>
                    )}

                    {/* Momentum bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">Momentum</span>
                        <span className="text-sm font-semibold">{trend.momentum}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${trend.momentum}%` }}
                        />
                      </div>
                    </div>

                    {days !== null && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                        <span className="text-muted-foreground">Window closes</span>
                        <span className={days <= 1 ? 'text-red-500 font-semibold' : 'text-foreground font-medium'}>
                          {days === 0 ? 'Today!' : `${days} day${days !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    )}

                    <Button className="w-full" onClick={() => setSelectedTrend(trend)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Content
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Trend Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Total Trends" value={trends.length} />
                <Stat
                  label="Avg Momentum"
                  value={`${Math.round(trends.reduce((s, t) => s + t.momentum, 0) / trends.length)}%`}
                />
                <Stat
                  label="Expiring Soon"
                  value={trends.filter((t) => {
                    const d = daysLeft(t.expires_at);
                    return d !== null && d <= 2;
                  }).length}
                />
                <Stat label="Top Category" value={trends[0]?.category ?? '—'} small />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-bold mt-2 truncate ${small ? 'text-base' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}
