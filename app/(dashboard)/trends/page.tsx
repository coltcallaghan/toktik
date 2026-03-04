'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, Flame, Zap, Target, Loader2, RefreshCw, Sparkles, Trophy, Search, X } from 'lucide-react';
import { createClient, type Trend } from '@/lib/supabase';
import { GenerateContentModal } from '@/components/generate-content-modal';

const ICONS = [Flame, TrendingUp, Zap, Target];

type SortKey = 'momentum' | 'expiry' | 'detected';

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState('');
  const [topPick, setTopPick] = useState<{ name: string; reason: string } | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);

  // Search & filter state
  const [searchTopic, setSearchTopic] = useState('');
  const [searchResults, setSearchResults] = useState<Trend[] | null>(null);
  const [lastSearchTopic, setLastSearchTopic] = useState('');
  const [filterText, setFilterText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('momentum');

  useEffect(() => { fetchTrends(); }, []);

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

  async function searchTrends() {
    if (!searchTopic.trim()) return;
    setAnalysing(true);
    setAnalyseError('');
    setSearchResults(null);
    const topic = searchTopic.trim();
    try {
      const res = await fetch('/api/fetch-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_topic: topic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyseError(data.error ?? `Server error ${res.status}`);
      } else {
        // Map raw API rows to Trend shape for display
        const results: Trend[] = (data.search_results ?? []).map((r: Record<string, unknown>, i: number) => ({
          id: `search-${i}`,
          user_id: '',
          trend_name: r.trend_name as string,
          category: r.category as string,
          momentum: r.momentum as number,
          description: r.description as string,
          detected_at: r.detected_at as string,
          expires_at: r.expires_at as string,
        }));
        setSearchResults(results);
        setLastSearchTopic(topic);
        setSearchTopic('');
      }
    } catch (e) {
      setAnalyseError(e instanceof Error ? e.message : 'Network error');
    }
    setAnalysing(false);
  }

  async function saveSearchResult(trend: Trend) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('trends').insert({
      user_id: user.id,
      trend_name: trend.trend_name,
      category: trend.category,
      momentum: trend.momentum,
      description: trend.description,
      detected_at: trend.detected_at,
      expires_at: trend.expires_at,
    });
    await fetchTrends();
    // Remove from search results
    setSearchResults((prev) => prev?.filter((t) => t.id !== trend.id) ?? null);
  }

  const daysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  };

  // Derived: unique categories from all trends
  const categories = useMemo(() => {
    const cats = Array.from(new Set(trends.map((t) => t.category).filter(Boolean)));
    return cats.sort();
  }, [trends]);

  // Filtered + sorted trends
  const visibleTrends = useMemo(() => {
    let list = [...trends];

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      list = list.filter(
        (t) =>
          t.trend_name.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    if (activeCategory) {
      list = list.filter((t) => t.category === activeCategory);
    }

    list.sort((a, b) => {
      if (sortKey === 'momentum') return b.momentum - a.momentum;
      if (sortKey === 'expiry') {
        const da = daysLeft(a.expires_at) ?? 999;
        const db = daysLeft(b.expires_at) ?? 999;
        return da - db;
      }
      // detected: newest first
      return new Date(b.detected_at ?? 0).getTime() - new Date(a.detected_at ?? 0).getTime();
    });

    return list;
  }, [trends, filterText, activeCategory, sortKey]);

  return (
    <>
      {selectedTrend && (
        <GenerateContentModal
          trend={selectedTrend}
          onClose={() => setSelectedTrend(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
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

        {/* Topic search bar */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium mb-2">Search trends by topic</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTopic}
                  onChange={(e) => setSearchTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchTrends()}
                  placeholder="e.g. AI productivity, weight loss, personal finance…"
                  className="pl-9"
                  disabled={analysing}
                />
              </div>
              <Button onClick={searchTrends} disabled={!searchTopic.trim() || analysing}>
                {analysing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Find Trends</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Claude will research trends specifically around your topic and add them to your list.</p>
          </CardContent>
        </Card>

        {/* Error banner */}
        {analyseError && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-destructive font-medium">Analysis failed: {analyseError}</p>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Search results: &ldquo;{lastSearchTopic}&rdquo;</h2>
                <p className="text-sm text-muted-foreground">Save trends you want to keep in your library</p>
              </div>
              <button onClick={() => setSearchResults(null)} className="text-sm text-muted-foreground hover:text-foreground underline">
                Clear results
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {searchResults.map((trend, i) => {
                const Icon = ICONS[i % ICONS.length];
                const days = daysLeft(trend.expires_at);
                const descParts = trend.description?.split(' | ') ?? [];
                const mainDesc = descParts[0] ?? '';
                const hookPart = descParts.find((p) => p.startsWith('Hook:'));
                return (
                  <Card key={trend.id} className="border-dashed">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg p-2 bg-primary/10 shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg leading-tight">{trend.trend_name}</CardTitle>
                          <CardDescription>{trend.category}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {mainDesc && <p className="text-sm text-muted-foreground">{mainDesc}</p>}
                      {hookPart && (
                        <div className="rounded-md bg-muted px-3 py-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Suggested Hook</p>
                          <p className="text-sm italic">{hookPart.replace('Hook: ', '').replace(/^"|"$/g, '')}</p>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">Momentum</span>
                          <span className="text-sm font-semibold">{trend.momentum}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: `${trend.momentum}%` }} />
                        </div>
                      </div>
                      {days !== null && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                          <span className="text-muted-foreground">Window closes</span>
                          <span className={days <= 1 ? 'text-red-500 font-semibold' : 'font-medium'}>
                            {days === 0 ? 'Today!' : `${days} day${days !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={() => setSelectedTrend(trend)}>
                          <Sparkles className="mr-2 h-4 w-4" /> Generate Content
                        </Button>
                        <Button variant="outline" onClick={() => saveSearchResult(trend)} title="Save to your trend library">
                          Save
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
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
              {analysing ? 'Claude is analysing current social media trends…' : 'Loading trends…'}
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
                  Search for a topic above, or click &quot;Analyse Trends&quot; to find opportunities for your accounts.
                </p>
              </div>
              <Button onClick={analyseTrends}>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyse Trends
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filter + sort bar */}
        {!loading && !analysing && trends.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Text filter */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter trends…"
                  className="pl-9 h-9 text-sm"
                />
                {filterText && (
                  <button onClick={() => setFilterText('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-muted-foreground mr-1">Sort:</span>
                {(['momentum', 'expiry', 'detected'] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      sortKey === key
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {key === 'momentum' ? 'Momentum' : key === 'expiry' ? 'Expiring' : 'Newest'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category pills */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !activeCategory
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  All ({trends.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {cat} ({trends.filter((t) => t.category === cat).length})
                  </button>
                ))}
              </div>
            )}

            {/* No results after filter */}
            {visibleTrends.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No trends match your filter. <button className="underline" onClick={() => { setFilterText(''); setActiveCategory(null); }}>Clear filters</button>
              </p>
            )}
          </div>
        )}

        {/* Trends grid */}
        {!loading && !analysing && visibleTrends.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleTrends.map((trend, i) => {
              const Icon = ICONS[i % ICONS.length];
              const days = daysLeft(trend.expires_at);
              const isTopPick = topPick?.name === trend.trend_name;

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
                        <div className={`rounded-lg p-2 shrink-0 ${isTopPick ? 'bg-primary' : 'bg-primary/10'}`}>
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
                    {mainDesc && <p className="text-sm text-muted-foreground">{mainDesc}</p>}

                    {hookPart && (
                      <div className="rounded-md bg-muted px-3 py-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Suggested Hook</p>
                        <p className="text-sm italic">{hookPart.replace('Hook: ', '').replace(/^"|"$/g, '')}</p>
                      </div>
                    )}

                    {oppPart && <p className="text-xs text-muted-foreground">{oppPart}</p>}

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
            <CardHeader><CardTitle>Trend Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Total Trends" value={trends.length} />
                <Stat
                  label="Avg Momentum"
                  value={`${Math.round(trends.reduce((s, t) => s + t.momentum, 0) / trends.length)}%`}
                />
                <Stat
                  label="Expiring Soon"
                  value={trends.filter((t) => { const d = daysLeft(t.expires_at); return d !== null && d <= 2; }).length}
                />
                <Stat label="Categories" value={categories.length} />
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
