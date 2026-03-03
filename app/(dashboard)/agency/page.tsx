'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Plus,
  Users,
  Video,
  Mail,
  MoreHorizontal,
  Archive,
  Pause,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  StickyNote,
  RefreshCw,
  Search,
} from 'lucide-react';
import clsx from 'clsx';

interface AgencyClient {
  id: string;
  client_name: string;
  client_email: string | null;
  status: 'active' | 'paused' | 'archived';
  notes: string | null;
  account_count: number;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600',
  paused: 'bg-yellow-500/10 text-yellow-600',
  archived: 'bg-gray-500/10 text-gray-500',
};

export default function AgencyPage() {
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form, setForm] = useState({ client_name: '', client_email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/agency?${params}`);
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients || []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleAdd() {
    if (!form.client_name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/agency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ client_name: '', client_email: '', notes: '' });
      setShowAdd(false);
      fetchClients();
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/agency', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchClients();
  }

  async function deleteClient(id: string) {
    if (!confirm('Delete this client? Their accounts will be unlinked.')) return;
    await fetch(`/api/agency?id=${id}`, { method: 'DELETE' });
    fetchClients();
  }

  const filtered = clients.filter(c =>
    c.client_name.toLowerCase().includes(filter.toLowerCase()) ||
    (c.client_email || '').toLowerCase().includes(filter.toLowerCase())
  );

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    accounts: clients.reduce((s, c) => s + c.account_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agency Mode</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage multiple clients and their TikTok accounts from one dashboard
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Clients</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active Clients</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.accounts}</p>
              <p className="text-sm text-muted-foreground">Managed Accounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Client Form */}
      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">New Client</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Client Name *</label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={form.client_name}
                onChange={(e) => setForm(f => ({ ...f, client_name: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contact Email</label>
              <input
                type="email"
                placeholder="contact@acme.com"
                value={form.client_email}
                onChange={(e) => setForm(f => ({ ...f, client_email: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea
                placeholder="Internal notes about this client..."
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !form.client_name.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add Client'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-md bg-muted px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">No clients yet</p>
          <p className="text-sm mt-1">Add your first client to get started with agency mode</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => {
            const isExpanded = expandedId === client.id;
            return (
              <div key={client.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : client.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                      {client.client_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{client.client_name}</h4>
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[client.status])}>
                          {client.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                        {client.client_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.client_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          {client.account_count} accounts
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/10">
                    {client.notes && (
                      <div className="mb-4 flex items-start gap-2 text-sm">
                        <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <p>{client.notes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        Added {new Date(client.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex gap-2">
                        {client.status === 'active' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(client.id, 'paused'); }}
                            className="flex items-center gap-1 text-yellow-600 hover:underline"
                          >
                            <Pause className="h-3.5 w-3.5" /> Pause
                          </button>
                        ) : client.status === 'paused' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(client.id, 'active'); }}
                            className="flex items-center gap-1 text-green-600 hover:underline"
                          >
                            <Play className="h-3.5 w-3.5" /> Activate
                          </button>
                        ) : null}
                        {client.status !== 'archived' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(client.id, 'archived'); }}
                            className="flex items-center gap-1 text-muted-foreground hover:underline"
                          >
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteClient(client.id); }}
                          className="flex items-center gap-1 text-red-500 hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
