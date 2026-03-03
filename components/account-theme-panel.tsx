'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Save, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Account } from '@/lib/supabase';

type Tone = 'casual' | 'educational' | 'humorous' | 'inspirational' | 'professional' | 'edgy';
type ContentStyle = 'storytelling' | 'tutorial' | 'listicle' | 'commentary' | 'challenge' | 'day-in-life' | 'product-review';

interface ThemeData {
  niche: string;
  tone: Tone;
  content_style: ContentStyle;
  target_audience: string;
  posting_goals: string;
  brand_voice: string;
}

const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: 'casual',        label: 'Casual',        description: 'Relaxed, friendly, conversational' },
  { value: 'educational',   label: 'Educational',   description: 'Informative, authoritative, clear' },
  { value: 'humorous',      label: 'Humorous',      description: 'Funny, playful, entertaining' },
  { value: 'inspirational', label: 'Inspirational', description: 'Motivating, uplifting, empowering' },
  { value: 'professional',  label: 'Professional',  description: 'Polished, credible, authoritative' },
  { value: 'edgy',          label: 'Edgy',          description: 'Bold, provocative, unconventional' },
];

const STYLE_OPTIONS: { value: ContentStyle; label: string }[] = [
  { value: 'storytelling',   label: 'Storytelling' },
  { value: 'tutorial',       label: 'Tutorial / How-To' },
  { value: 'listicle',       label: 'Listicle (Top 5...)' },
  { value: 'commentary',     label: 'Commentary / Opinion' },
  { value: 'challenge',      label: 'Challenge / Trend' },
  { value: 'day-in-life',    label: 'Day in the Life' },
  { value: 'product-review', label: 'Product Review' },
];

interface Props {
  account: Account;
  onClose: () => void;
  onSaved: (updated: Partial<Account>) => void;
}

export function AccountThemePanel({ account, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ThemeData>({
    niche:           account.niche ?? '',
    tone:            account.tone ?? 'casual',
    content_style:   account.content_style ?? 'storytelling',
    target_audience: account.target_audience ?? '',
    posting_goals:   account.posting_goals ?? '',
    brand_voice:     account.brand_voice ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Sync if account prop changes (e.g. after a refresh)
  useEffect(() => {
    setForm({
      niche:           account.niche ?? '',
      tone:            account.tone ?? 'casual',
      content_style:   account.content_style ?? 'storytelling',
      target_audience: account.target_audience ?? '',
      posting_goals:   account.posting_goals ?? '',
      brand_voice:     account.brand_voice ?? '',
    });
  }, [account.id]);

  function set<K extends keyof ThemeData>(key: K, value: ThemeData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/accounts/${account.id}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSaved(true);
      onSaved(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setSaving(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Account Theme</h2>
              <p className="text-xs text-muted-foreground">{account.platform_username}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Niche */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Niche</label>
            <Input
              value={form.niche}
              onChange={(e) => set('niche', e.target.value)}
              placeholder="e.g. Personal Finance, Fitness, Tech Reviews..."
            />
            <p className="text-xs text-muted-foreground">The topic area this account focuses on</p>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tone of Voice</label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('tone', opt.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    form.tone === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Content Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Content Style</label>
            <div className="grid grid-cols-1 gap-1.5">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('content_style', opt.value)}
                  className={`rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                    form.content_style === opt.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Audience</label>
            <Input
              value={form.target_audience}
              onChange={(e) => set('target_audience', e.target.value)}
              placeholder="e.g. 18-25 year old college students interested in budgeting"
            />
          </div>

          {/* Posting Goals */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Posting Goals</label>
            <Input
              value={form.posting_goals}
              onChange={(e) => set('posting_goals', e.target.value)}
              placeholder="e.g. Grow followers, drive traffic to newsletter, sell course"
            />
          </div>

          {/* Brand Voice */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Voice Notes</label>
            <textarea
              value={form.brand_voice}
              onChange={(e) => set('brand_voice', e.target.value)}
              placeholder="Any specific phrases, topics to avoid, references to use, or personality traits..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">This is injected directly into every AI prompt for this account</p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-6 py-4 space-y-3">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-green-600 font-medium">Theme saved — AI will use this for all future content</p>
          )}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                : <><Save className="mr-2 h-4 w-4" />Save Theme</>
              }
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </>
  );
}
