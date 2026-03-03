'use client';

import React, { useEffect, useState } from 'react';
import {
  Bot,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Power,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient, type Account } from '@/lib/supabase';

/* ── Types ─────────────────────────────────────────────────────── */

type BotRule = {
  id: string;
  account_id: string;
  enabled: boolean;
  rule_type: 'auto_reply' | 'auto_like' | 'keyword_reply';
  trigger_keywords: string[] | null;
  reply_template: string | null;
  tone: string;
  max_replies_per_hour: number;
  created_at: string;
};

/* ── Component ─────────────────────────────────────────────────── */

export default function CommentBotPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rules, setRules] = useState<BotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [formAccountId, setFormAccountId] = useState('');
  const [formType, setFormType] = useState<BotRule['rule_type']>('auto_reply');
  const [formKeywords, setFormKeywords] = useState('');
  const [formTemplate, setFormTemplate] = useState('ai');
  const [formCustomReply, setFormCustomReply] = useState('');
  const [formTone, setFormTone] = useState('friendly');
  const [formMaxPerHour, setFormMaxPerHour] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [aRes, rRes] = await Promise.all([
      supabase.from('accounts').select('*'),
      supabase.from('comment_bot_rules').select('*').order('created_at', { ascending: false }),
    ]);
    setAccounts(aRes.data ?? []);
    setRules(rRes.data ?? []);
    if (aRes.data?.length) setFormAccountId(aRes.data[0].id);
    setLoading(false);
  }

  async function addRule() {
    if (!formAccountId) return;
    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('comment_bot_rules')
      .insert({
        user_id: user!.id,
        account_id: formAccountId,
        rule_type: formType,
        trigger_keywords: formKeywords
          ? formKeywords.split(',').map((k) => k.trim()).filter(Boolean)
          : null,
        reply_template: formTemplate === 'ai' ? 'ai' : (formCustomReply || 'ai'),
        tone: formTone,
        max_replies_per_hour: formMaxPerHour,
      })
      .select()
      .single();

    if (data) {
      setRules((prev) => [data, ...prev]);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function toggleRule(id: string, enabled: boolean) {
    const supabase = createClient();
    await supabase.from('comment_bot_rules').update({ enabled }).eq('id', id);
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
  }

  async function deleteRule(id: string) {
    const supabase = createClient();
    await supabase.from('comment_bot_rules').delete().eq('id', id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function getAccountName(id: string): string {
    return accounts.find((a) => a.id === id)?.platform_username ?? 'Unknown';
  }

  const ruleTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    auto_reply: { label: 'Auto Reply', icon: <MessageCircle className="h-3.5 w-3.5" />, color: 'bg-blue-500/10 text-blue-500' },
    auto_like: { label: 'Auto Like', icon: <Heart className="h-3.5 w-3.5" />, color: 'bg-red-500/10 text-red-500' },
    keyword_reply: { label: 'Keyword Reply', icon: <Zap className="h-3.5 w-3.5" />, color: 'bg-yellow-500/10 text-yellow-500' },
  };

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
          <h1 className="text-3xl font-bold">Comment Bot</h1>
          <p className="text-muted-foreground">
            Auto-reply and engage with comments on your published content
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Rule'}
        </Button>
      </div>

      {/* New rule form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Bot Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1">Account</label>
                <select
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      @{a.platform_username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Rule Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as BotRule['rule_type'])}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="auto_reply">Auto Reply (all comments)</option>
                  <option value="keyword_reply">Keyword Reply (specific triggers)</option>
                  <option value="auto_like">Auto Like (all comments)</option>
                </select>
              </div>
            </div>

            {formType === 'keyword_reply' && (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Trigger Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="price, how much, link, tutorial"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            {formType !== 'auto_like' && (
              <>
                <div>
                  <label className="text-sm font-medium block mb-1">Reply Mode</label>
                  <select
                    value={formTemplate}
                    onChange={(e) => setFormTemplate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="ai">AI-Generated (uses Claude)</option>
                    <option value="custom">Custom Template</option>
                  </select>
                </div>
                {formTemplate === 'custom' && (
                  <div>
                    <label className="text-sm font-medium block mb-1">Reply Template</label>
                    <textarea
                      placeholder="Thanks for watching! 🙏 Check the link in bio for more..."
                      value={formCustomReply}
                      onChange={(e) => setFormCustomReply(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium block mb-1">Tone</label>
                    <select
                      value={formTone}
                      onChange={(e) => setFormTone(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="friendly">Friendly</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="humorous">Humorous</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Max Replies/Hour</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formMaxPerHour}
                      onChange={(e) => setFormMaxPerHour(Number(e.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <Button onClick={addRule} disabled={saving || !formAccountId}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              Create Rule
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Bot className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Rules</p>
              <p className="text-lg font-bold">{rules.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-full bg-green-500/10 p-2">
              <Power className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-bold">{rules.filter((r) => r.enabled).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-full bg-purple-500/10 p-2">
              <MessageCircle className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accounts Covered</p>
              <p className="text-lg font-bold">
                {new Set(rules.map((r) => r.account_id)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No bot rules yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first rule to start auto-engaging with comments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const meta = ruleTypeLabels[rule.rule_type];
            return (
              <Card key={rule.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleRule(rule.id, !rule.enabled)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          rule.enabled ? 'bg-green-500' : 'bg-muted'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            rule.enabled ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            @{getAccountName(rule.account_id)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {rule.reply_template === 'ai' ? 'AI-generated replies' : 'Custom template'}{' '}
                          · {rule.tone} tone · Max {rule.max_replies_per_hour}/hr
                          {rule.trigger_keywords?.length
                            ? ` · Keywords: ${rule.trigger_keywords.join(', ')}`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
