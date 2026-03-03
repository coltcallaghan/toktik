'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollText,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Video,
  Users,
  TrendingUp,
  Webhook,
  ShieldCheck,
  Bot,
  Settings,
  UserPlus,
  Trash2,
  Edit,
  Eye,
  Upload,
  Send,
  Clock,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  content: Video,
  account: Users,
  trend: TrendingUp,
  webhook: Webhook,
  approval: ShieldCheck,
  comment_bot: Bot,
  team: Users,
  settings: Settings,
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  created: Edit,
  published: Send,
  deleted: Trash2,
  updated: Edit,
  viewed: Eye,
  uploaded: Upload,
  invited: UserPlus,
  scheduled: Clock,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-500/10 text-green-600',
  published: 'bg-blue-500/10 text-blue-600',
  deleted: 'bg-red-500/10 text-red-600',
  updated: 'bg-yellow-500/10 text-yellow-600',
  viewed: 'bg-gray-500/10 text-gray-600',
  uploaded: 'bg-purple-500/10 text-purple-600',
  invited: 'bg-indigo-500/10 text-indigo-600',
  scheduled: 'bg-orange-500/10 text-orange-600',
  approved: 'bg-green-500/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-600',
};

const RESOURCE_TYPES = ['content', 'account', 'team', 'trend', 'webhook', 'approval', 'comment_bot', 'settings'];

function getActionVerb(action: string): string {
  const parts = action.split('.');
  return parts[parts.length - 1] || action;
}

function getResourceIcon(type: string) {
  return RESOURCE_ICONS[type] || ScrollText;
}

function getActionColor(action: string): string {
  const verb = getActionVerb(action);
  return ACTION_COLORS[verb] || 'bg-muted text-muted-foreground';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 30;

  const fetchLog = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));
    if (filterAction) params.set('action', filterAction);
    if (filterResource) params.set('resource_type', filterResource);

    const res = await fetch(`/api/audit-log?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [page, filterAction, filterResource]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Log</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track all activity across your workspace ({total} total entries)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              showFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={fetchLog}
            className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Resource Type</label>
              <select
                value={filterResource}
                onChange={(e) => { setFilterResource(e.target.value); setPage(0); }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Resources</option>
                {RESOURCE_TYPES.map(rt => (
                  <option key={rt} value={rt}>{rt.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Action Contains</label>
              <input
                type="text"
                placeholder="e.g. published, created"
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilterAction(''); setFilterResource(''); setPage(0); }}
                className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ScrollText className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No audit entries yet</p>
            <p className="text-sm mt-1">Activity will appear here as you use the platform</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => {
              const ResourceIcon = getResourceIcon(entry.resource_type);
              const verb = getActionVerb(entry.action);
              const ActionIcon = ACTION_ICONS[verb] || ScrollText;
              const colorClass = getActionColor(entry.action);
              const meta = entry.metadata as Record<string, string>;

              return (
                <div key={entry.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <ActionIcon className="h-5 w-5" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{entry.action}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                        <ResourceIcon className="h-3 w-3" />
                        {entry.resource_type}
                      </span>
                    </div>

                    {/* Metadata */}
                    {meta && Object.keys(meta).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(meta).slice(0, 4).map(([key, val]) => (
                          <span key={key} className="text-xs text-muted-foreground">
                            <span className="font-medium">{key}:</span> {String(val).slice(0, 60)}
                          </span>
                        ))}
                      </div>
                    )}

                    {entry.resource_id && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        ID: {entry.resource_id}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right shrink-0">
                    <p className="text-sm text-muted-foreground">{formatRelativeTime(entry.created_at)}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {new Date(entry.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
