'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Circle, Sparkles, X, Copy, Check, ExternalLink, Palette, AlertTriangle } from 'lucide-react';
import { createClient, type Account } from '@/lib/supabase';
import type { GenerateContentResponse } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface Props {
  trend: { id: string; trend_name: string; description: string | null; category: string };
  onClose: () => void;
}

type Step = 'idle' | 'running' | 'done' | 'error';

interface PipelineStep {
  id: string;
  label: string;
  status: Step;
}

const STEPS: PipelineStep[] = [
  { id: 'account', label: 'Selecting account', status: 'idle' },
  { id: 'title', label: 'Generating title & hook', status: 'idle' },
  { id: 'script', label: 'Writing script', status: 'idle' },
  { id: 'captions', label: 'Generating captions & hashtags', status: 'idle' },
  { id: 'save', label: 'Saving draft', status: 'idle' },
];

export function GenerateContentModal({ trend, onClose }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [steps, setSteps] = useState<PipelineStep[]>(STEPS);
  const [result, setResult] = useState<GenerateContentResponse | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    createClient().from('accounts').select('*').then(({ data }) => {
      if (data) {
        setAccounts(data);
        if (data.length === 1) setSelectedAccountId(data[0].id);
      }
    });
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const hasTheme = selectedAccount && (selectedAccount.niche || selectedAccount.tone);

  function setStep(id: string, status: Step) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  async function run() {
    if (!selectedAccountId) return;
    setRunning(true);
    setError('');
    setResult(null);
    setSteps(STEPS.map((s) => ({ ...s, status: 'idle' })));

    setStep('account', 'running');
    await delay(300);
    setStep('account', 'done');

    setStep('title', 'running');
    await delay(500);
    setStep('script', 'running');
    await delay(400);
    setStep('captions', 'running');

    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trend_name: trend.trend_name,
          trend_description: trend.description ?? trend.category,
          account_id: selectedAccountId,
          account_username: selectedAccount?.platform_username ?? '',
          niche: selectedAccount?.niche,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Generation failed');
      }

      setStep('title', 'done');
      setStep('script', 'done');
      setStep('captions', 'done');
      setStep('save', 'running');
      await delay(300);
      setStep('save', 'done');
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSteps((prev) => prev.map((s) => s.status === 'running' ? { ...s, status: 'error' } : s));
    }

    setRunning(false);
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Content
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trend: <span className="font-medium text-foreground">{trend.trend_name}</span>
              {' · '}{trend.category}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Account selector */}
          {!result && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Post to account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  disabled={running}
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.platform_username}{a.niche ? ` — ${a.niche}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme preview */}
              {selectedAccount && (
                hasTheme ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Palette className="h-3.5 w-3.5" />
                      Account Theme — will shape AI output
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {selectedAccount.niche && (
                        <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">{selectedAccount.niche}</span>
                      )}
                      {selectedAccount.tone && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 capitalize">{selectedAccount.tone}</span>
                      )}
                      {selectedAccount.content_style && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 capitalize">{selectedAccount.content_style.replace('-', ' ')}</span>
                      )}
                      {selectedAccount.target_audience && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{selectedAccount.target_audience}</span>
                      )}
                    </div>
                    {selectedAccount.posting_goals && (
                      <p className="text-xs text-muted-foreground">Goal: {selectedAccount.posting_goals}</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      This account has no theme set — AI will use generic defaults.{' '}
                      <a href="/accounts" className="font-medium underline">Set a theme</a> for better results.
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Pipeline steps */}
          {(running || result || error) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Pipeline</p>
              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                    {step.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                    {step.status === 'error' && <X className="h-4 w-4 text-destructive shrink-0" />}
                    {step.status === 'idle' && <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={`text-sm ${
                      step.status === 'running' ? 'text-foreground font-medium' :
                      step.status === 'done' ? 'text-green-600' :
                      step.status === 'error' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-medium text-green-800">Draft saved to Content library</p>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
                  <CopyBtn text={result.title} id="title" copied={copied} onCopy={copyText} />
                </div>
                <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium">{result.title}</p>
              </div>

              {/* Hook */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opening Hook</label>
                  <CopyBtn text={result.hook} id="hook" copied={copied} onCopy={copyText} />
                </div>
                <p className="rounded-md bg-muted px-3 py-2 text-sm italic">"{result.hook}"</p>
              </div>

              {/* Script */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Script</label>
                  <CopyBtn text={result.script} id="script" copied={copied} onCopy={copyText} />
                </div>
                <pre className="whitespace-pre-wrap rounded-md bg-muted px-3 py-2 text-sm font-sans leading-relaxed">
                  {result.script}
                </pre>
              </div>

              {/* Caption */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Caption</label>
                  <CopyBtn text={`${result.captions}\n\n${result.hashtags.join(' ')}`} id="caption" copied={copied} onCopy={copyText} />
                </div>
                <p className="rounded-md bg-muted px-3 py-2 text-sm">{result.captions}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {result.hashtags.map((tag) => (
                    <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!result ? (
              <>
                <Button
                  onClick={run}
                  disabled={running || !selectedAccountId}
                  className="flex-1"
                >
                  {running
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    : <><Sparkles className="mr-2 h-4 w-4" />Generate Content</>
                  }
                </Button>
                <Button variant="outline" onClick={onClose} disabled={running}>Cancel</Button>
              </>
            ) : (
              <>
                <Button
                  className="flex-1"
                  onClick={() => { router.push('/content'); onClose(); }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View in Content
                </Button>
                <Button variant="outline" onClick={() => { setResult(null); setSteps(STEPS); }}>
                  Generate Another
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyBtn({ text, id, copied, onCopy }: {
  text: string; id: string; copied: string | null; onCopy: (t: string, k: string) => void
}) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied === id ? 'Copied' : 'Copy'}
    </button>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
