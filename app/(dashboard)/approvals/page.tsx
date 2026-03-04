'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  ShieldCheck,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient, type Team } from '@/lib/supabase';

type Workflow = {
  id: string;
  team_id: string;
  name: string;
  steps: { role: string; action: string }[];
  require_all_approvals: boolean;
  auto_publish: boolean;
  enabled: boolean;
  created_at: string;
};

type ApprovalRequest = {
  id: string;
  workflow_id: string;
  content_id: string;
  requested_by: string;
  current_step: number;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  approvals: { user_id: string; action: string; comment?: string; at: string }[];
  content?: { title: string; status: string };
  created_at: string;
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'bg-yellow-500/10 text-yellow-600', icon: <Clock className="h-3.5 w-3.5" />, label: 'Pending' },
  approved: { color: 'bg-green-500/10 text-green-600', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Approved' },
  rejected: { color: 'bg-red-500/10 text-red-600', icon: <XCircle className="h-3.5 w-3.5" />, label: 'Rejected' },
  changes_requested: { color: 'bg-orange-500/10 text-orange-600', icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Changes Requested' },
};

export default function ApprovalsPage() {
  const [planAllowed, setPlanAllowed] = useState<boolean | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  // Form
  const [formName, setFormName] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
  const [formAutoPublish, setFormAutoPublish] = useState(false);

  useEffect(() => {
    fetch('/api/user-plan').then(r => r.json()).then(d => {
      setPlanAllowed(!!d.config?.features?.approvalWorkflows);
    }).catch(() => setPlanAllowed(false));
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [approvalRes, teamRes] = await Promise.all([
      fetch('/api/approvals').then((r) => r.json()),
      supabase.from('teams').select('*'),
    ]);
    setWorkflows(approvalRes.workflows ?? []);
    setRequests(approvalRes.requests ?? []);
    setTeams(teamRes.data ?? []);
    if (teamRes.data?.length) setFormTeamId(teamRes.data[0].id);
    setLoading(false);
  }

  async function createWorkflow() {
    if (!formName.trim() || !formTeamId) return;
    setSaving(true);
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'workflow',
        team_id: formTeamId,
        name: formName,
        auto_publish: formAutoPublish,
      }),
    });
    if (res.ok) {
      const wf = await res.json();
      setWorkflows((prev) => [wf, ...prev]);
      setFormName('');
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleReview(requestId: string, action: 'approve' | 'reject' | 'request_changes') {
    const res = await fetch('/api/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action, comment: reviewComment }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, ...updated } : r)));
      setReviewComment('');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

  if (planAllowed === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Agency Feature</h2>
        <p className="text-muted-foreground max-w-sm">Approval workflows are available on the Agency plan. Upgrade to manage content sign-off across your team and clients.</p>
        <a href="/settings?tab=billing" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          <Zap className="h-4 w-4" /> Upgrade to Agency
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-muted-foreground">Review and approve content before publishing</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Workflow'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Workflows</p><p className="text-2xl font-bold">{workflows.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Pending Review</p><p className="text-2xl font-bold text-yellow-600">{pending.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{requests.filter((r) => r.status === 'approved').length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-red-600">{requests.filter((r) => r.status === 'rejected').length}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Approval Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1">Workflow Name</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Content Review Pipeline" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Team</label>
                <select value={formTeamId} onChange={(e) => setFormTeamId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formAutoPublish} onChange={(e) => setFormAutoPublish(e.target.checked)} className="rounded border-border" />
              Auto-publish when approved
            </label>
            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Default Steps:</p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/10 text-blue-600 px-2 py-0.5 text-xs">Editor creates</span>
                <span>→</span>
                <span className="rounded bg-purple-500/10 text-purple-600 px-2 py-0.5 text-xs">Admin reviews</span>
                <span>→</span>
                <span className="rounded bg-yellow-500/10 text-yellow-600 px-2 py-0.5 text-xs">Owner approves</span>
              </div>
            </div>
            <Button onClick={createWorkflow} disabled={saving || !formName.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending reviews */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pending Review</h2>
          {pending.map((req) => {
            const s = statusConfig[req.status];
            return (
              <Card key={req.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{req.content?.title ?? 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">Submitted {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}>{s.icon}{s.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add a comment (optional)..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} className="flex-1" />
                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleReview(req.id, 'approve')}>
                      <Check className="mr-1 h-3.5 w-3.5" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-orange-600" onClick={() => handleReview(req.id, 'request_changes')}>
                      <MessageSquare className="mr-1 h-3.5 w-3.5" />Changes
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleReview(req.id, 'reject')}>
                      <X className="mr-1 h-3.5 w-3.5" />Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Workflows list */}
      {workflows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Workflows</h2>
          {workflows.map((wf) => (
            <Card key={wf.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {wf.steps.length} steps · {wf.auto_publish ? 'Auto-publish on approval' : 'Manual publish'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${wf.enabled ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    {wf.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">History</h2>
          {resolved.map((req) => {
            const s = statusConfig[req.status];
            return (
              <Card key={req.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{req.content?.title ?? 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}>{s.icon}{s.label}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {workflows.length === 0 && requests.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No approval workflows yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Create a workflow to require content review before publishing.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
