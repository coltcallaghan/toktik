'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Brain,
  Clock,
  Flame,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/* ── Types ─────────────────────────────────────────────────────── */

type Prediction = {
  name: string;
  description: string;
  category: string;
  virality_score: number;
  time_horizon: string;
  niche_fit: string[];
  confidence: number;
};

/* ── Component ─────────────────────────────────────────────────── */

export default function TrendPredictionPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [niches, setNiches] = useState('');

  async function runPrediction() {
    setLoading(true);
    setHasRun(true);
    try {
      const res = await fetch('/api/trends/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niches: niches
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      setPredictions(data.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }

  function viralityColor(score: number): string {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-muted-foreground';
  }

  function viralityBg(score: number): string {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-muted';
  }

  function confidenceBadge(confidence: number): string {
    if (confidence >= 80) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (confidence >= 60) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    return 'bg-muted text-muted-foreground border-border';
  }

  function horizonIcon(horizon: string): string {
    if (horizon === 'now') return '🔥';
    if (horizon.includes('1-2 day')) return '⚡';
    if (horizon.includes('3-5')) return '📈';
    return '🔮';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trend Prediction</h1>
          <p className="text-muted-foreground">
            AI-powered forecasting of upcoming viral TikTok trends
          </p>
        </div>
      </div>

      {/* Config panel */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">
                Focus Niches (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. fitness, cooking, comedy — or leave blank for all"
                value={niches}
                onChange={(e) => setNiches(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button onClick={runPrediction} disabled={loading} className="shrink-0">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Predict Trends
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasRun && !loading && predictions.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No predictions generated. Try again or adjust your niches.
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <>
          {/* Summary row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-red-500/10 p-2">
                  <Flame className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hot Now</p>
                  <p className="text-lg font-bold">
                    {predictions.filter((p) => p.time_horizon === 'now').length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-orange-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Virality</p>
                  <p className="text-lg font-bold">
                    {Math.round(
                      predictions.reduce((s, p) => s + p.virality_score, 0) / predictions.length
                    )}
                    %
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-green-500/10 p-2">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">High Confidence</p>
                  <p className="text-lg font-bold">
                    {predictions.filter((p) => p.confidence >= 70).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prediction cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {predictions
              .sort((a, b) => b.virality_score - a.virality_score)
              .map((p, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className={`h-1 ${viralityBg(p.virality_score)}`} />
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{p.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {p.description}
                        </p>
                      </div>
                      <div
                        className={`text-2xl font-bold shrink-0 ${viralityColor(p.virality_score)}`}
                      >
                        {p.virality_score}
                      </div>
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted">
                        {horizonIcon(p.time_horizon)} {p.time_horizon}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted">
                        <Sparkles className="h-2.5 w-2.5" /> {p.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${confidenceBadge(p.confidence)}`}
                      >
                        {p.confidence}% confident
                      </span>
                    </div>

                    {/* Virality bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Virality Score</span>
                        <span>{p.virality_score}/100</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${viralityBg(p.virality_score)}`}
                          style={{ width: `${p.virality_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Niche fit */}
                    {p.niche_fit?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Fits:</span>
                        {p.niche_fit.map((n, j) => (
                          <span
                            key={j}
                            className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
