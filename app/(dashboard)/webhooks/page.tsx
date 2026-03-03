'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Globe,
  Hash,
  Loader2,
  Plus,
  Power,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type WebhookItem = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  platform: 'webhook' | 'slack' | 'discord';
  enabled: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
};

const ALL_EVENTS = [
  { id: 'content_published', label: 'Content Published' },
  { id: 'content_failed', label: 'Content Failed' },
  { id: 'content_scheduled', label: 'Content Scheduled' },
  { id: 'trend_detected', label: 'Trend Detected' },
  { id: 'approval_requested', label: 'Approval Requested' },
  { id: 'approval_completed', label: 'Approval Completed' },
  { id: 'account_status', label: 'Account Status Change' },
];

const platformIcons: Record<string, React.ReactNode> = {
  webhook: <Globe className="h-4 w-4" />,
  slack: <Hash className="h-4 w-4" />,
  discord: <Bell className="h-4 w-4" />,
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPlatform, setFormPlatform] = useState<'webhook' | 'slack' | 'discord'>('webhook');
  const [formEvents, setFormEvents] = useState<Set<string>>(new Set(['content_published']));

  useEffect(() => { loadWebhooks(); }, []);

  async function loadWebhooks() {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch { setWebhooks([]); }
    setLoading(false);
  }

  async function createWebhook() {
    if (!formName.trim() || !formUrl.trim()) return;
    setSaving(true);
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName,
        url: formUrl,
        platform: formPlatform,
        events: Array.from(formEvents),
      }),
    });
    if (res.ok) {
      const wh = await res.json();
      setWebhooks((prev) => [wh, ...prev]);
      setFormName(''); setFormUrl(''); setFormEvents(new Set(['content_published'])); setShowForm(false);
    }
    setSaving(false);
  }

  async function toggleWebhook(id: string, enabled: boolean) {
    await fetch('/api/webhooks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, enabled } : w)));
  }

  async function deleteWebhook(id: string) {
    await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  function toggleEvent(eventId: string) {
    setFormEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks & Alerts</h1>
          <p className="text-muted-foreground">Send notifications to Slack, Discord, or custom webhooks</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Webhook'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Webhooks</p><p className="text-2xl font-bold">{webhooks.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{webhooks.filter((w) => w.enabled).length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-red-600">{webhooks.filter((w) => w.failure_count > 0).length}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Webhook</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="My Slack Alert" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">URL</label>
                <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://hooks.slack.com/..." />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Platform</label>
                <select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value as 'webhook' | 'slack' | 'discord')} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="webhook">Custom Webhook</option>
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((ev) => (
                  <button key={ev.id} onClick={() => toggleEvent(ev.id)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${formEvents.has(ev.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={createWebhook} disabled={saving || !formName.trim() || !formUrl.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Webhook className="mr-2 h-4 w-4" />}
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Webhook className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No webhooks configured.</p>
            <p className="text-sm text-muted-foreground mt-1">Add a webhook to get real-time alerts in Slack, Discord, or any HTTP endpoint.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleWebhook(wh.id, !wh.enabled)} className={`relative h-6 w-11 rounded-full transition-colors ${wh.enabled ? 'bg-green-500' : 'bg-muted'}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${wh.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{wh.name}</span>
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {platformIcons[wh.platform]}{wh.platform}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {wh.url.slice(0, 50)}… · {wh.events.length} event{wh.events.length !== 1 ? 's' : ''}
                        {wh.failure_count > 0 && <span className="text-red-500 ml-2">({wh.failure_count} failures)</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteWebhook(wh.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
