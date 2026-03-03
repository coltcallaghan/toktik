'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2, Loader2, RefreshCw, CheckCircle2, AlertCircle, Palette, KeyRound,
  Plus, Search, ExternalLink, Youtube, Instagram, Twitter, Linkedin, Facebook, X,
  Link2 as LinkIcon, Upload,
} from 'lucide-react';
import { createClient, type Account } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { isOAuthConnected as checkOAuthConnected, isTokenExpiredCheck } from '@/lib/platform-helpers';
import Image from 'next/image';
import { AccountThemePanel } from '@/components/account-theme-panel';
import { AccountCredentialsPanel } from '@/components/account-credentials-panel';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/*  Platform config                                                    */
/* ------------------------------------------------------------------ */

const PLATFORMS = {
  tiktok: {
    label: 'TikTok',
    color: 'text-foreground',
    bg: 'bg-foreground/10',
    accent: 'border-foreground/30',
    icon: TikTokIcon,
    connectUrl: '/api/auth/tiktok',
    signupUrl: 'https://www.tiktok.com/signup',
    hasOAuth: true,
  },
  youtube: {
    label: 'YouTube',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    accent: 'border-red-500/30',
    icon: Youtube,
    connectUrl: '/api/auth/youtube',
    signupUrl: 'https://www.youtube.com',
    hasOAuth: true,
  },
  instagram: {
    label: 'Instagram',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    accent: 'border-pink-500/30',
    icon: Instagram,
    connectUrl: '/api/auth/instagram',
    signupUrl: 'https://www.instagram.com',
    hasOAuth: true,
  },
  twitter: {
    label: 'X / Twitter',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    accent: 'border-sky-500/30',
    icon: Twitter,
    connectUrl: '/api/auth/twitter',
    signupUrl: 'https://twitter.com',
    hasOAuth: true,
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'text-blue-700',
    bg: 'bg-blue-700/10',
    accent: 'border-blue-700/30',
    icon: Linkedin,
    connectUrl: '/api/auth/linkedin',
    signupUrl: 'https://www.linkedin.com',
    hasOAuth: true,
  },
  facebook: {
    label: 'Facebook',
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    accent: 'border-blue-600/30',
    icon: Facebook,
    connectUrl: '/api/auth/facebook',
    signupUrl: 'https://www.facebook.com',
    hasOAuth: true,
  },
} as const;

type PlatformKey = keyof typeof PLATFORMS;
const ALL_PLATFORMS = Object.keys(PLATFORMS) as PlatformKey[];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsPageInner />
    </Suspense>
  );
}

function AccountsPageInner() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [themeAccount, setThemeAccount] = useState<Account | null>(null);
  const [credsAccount, setCredsAccount] = useState<Account | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformKey | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [addPlatform, setAddPlatform] = useState<PlatformKey>('tiktok');
  const [addUsername, setAddUsername] = useState('');
  const [addNiche, setAddNiche] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const searchParams = useSearchParams();

  const justConnected = searchParams.get('connected') === 'true';
  const connectedPlatform = searchParams.get('platform') as PlatformKey | null;
  const connectedPlatformLabel = connectedPlatform ? PLATFORMS[connectedPlatform]?.label ?? 'Platform' : 'Platform';
  const oauthError = searchParams.get('error');

  useEffect(() => { fetchAccounts(); }, []);

  async function fetchAccounts() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAccounts(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return;
    const supabase = createClient();
    await supabase.from('accounts').delete().eq('id', id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleToggleStatus(account: Account) {
    const supabase = createClient();
    const newStatus = account.status === 'active' ? 'paused' : 'active';
    await supabase.from('accounts').update({ status: newStatus }).eq('id', account.id);
    setAccounts((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, status: newStatus } : a))
    );
  }

  async function handleSync(account: Account) {
    const connected = checkOAuthConnected(account);
    if (!connected) return;
    setSyncing(account.id);
    const res = await fetch(`/api/accounts/${account.id}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) await fetchAccounts();
    setSyncing(null);
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      platform: addPlatform,
      platform_username: addUsername.startsWith('@') ? addUsername : `@${addUsername}`,
      platform_id: addUsername.replace('@', '').toLowerCase(),
      niche: addNiche || null,
      team_id: null,
      followers_count: 0,
      status: 'active',
    });
    if (!error) {
      setAddUsername('');
      setAddNiche('');
      setShowAdd(false);
      fetchAccounts();
    }
    setSaving(false);
  }

  function isTokenExpired(account: Account) {
    return isTokenExpiredCheck(account);
  }

  function handleThemeSaved(updated: Partial<Account>) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === themeAccount?.id ? { ...a, ...updated } : a))
    );
  }

  const filtered = accounts.filter((a) => {
    const matchSearch = a.platform_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.display_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchPlatform = platformFilter === 'all' || a.platform === platformFilter;
    return matchSearch && matchPlatform;
  });

  // Count per platform
  const platformCounts = ALL_PLATFORMS.reduce((acc, p) => {
    acc[p] = accounts.filter((a) => a.platform === p).length;
    return acc;
  }, {} as Record<PlatformKey, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Manage your social media accounts across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConnect(!showConnect)}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LinkIcon className="h-4 w-4" />
            Connect Platform
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Manually
          </button>
        </div>
      </div>

      {/* Banners */}
      {justConnected && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-400">
              {connectedPlatformLabel} account connected! Set up its theme so AI generates content in its voice.
            </p>
          </CardContent>
        </Card>
      )}
      {oauthError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Connection failed: {decodeURIComponent(oauthError)}</p>
          </CardContent>
        </Card>
      )}

      {/* Connect Platform OAuth */}
      {showConnect && (
        <Card>
          <CardHeader>
            <CardTitle>Connect a Platform</CardTitle>
            <CardDescription>Link your account via OAuth so TokTik can publish, sync stats, and manage content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {ALL_PLATFORMS.map((p) => {
                const cfg = PLATFORMS[p];
                const Icon = cfg.icon;
                return (
                  <a
                    key={p}
                    href={cfg.connectUrl}
                    className={clsx(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:shadow-md',
                      cfg.accent, 'hover:' + cfg.bg
                    )}
                  >
                    <Icon className={clsx('h-7 w-7', cfg.color)} />
                    <span className="text-sm font-medium">{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground">OAuth Connect</span>
                  </a>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              You&apos;ll be redirected to each platform to authorize TokTik. Tokens are stored securely and used for publishing &amp; syncing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Account Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add Social Account</CardTitle>
            <CardDescription>Manually add an account from any supported platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAccount} className="space-y-4">
              {/* Platform selector */}
              <div>
                <label className="mb-2 block text-sm font-medium">Platform</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {ALL_PLATFORMS.map((p) => {
                    const cfg = PLATFORMS[p];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAddPlatform(p)}
                        className={clsx(
                          'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all',
                          addPlatform === p
                            ? `${cfg.accent} ${cfg.bg} ring-1 ring-primary/20`
                            : 'border-border hover:bg-muted/50'
                        )}
                      >
                        <Icon className={clsx('h-5 w-5', cfg.color)} />
                        <span className="text-xs font-medium">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <Input
                    placeholder={`@username`}
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Niche (optional)</label>
                  <Input
                    placeholder="e.g. Fitness, Tech, Cooking"
                    value={addNiche}
                    onChange={(e) => setAddNiche(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !addUsername.trim()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Account
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Platform tabs + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setPlatformFilter('all')}
            className={clsx(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              platformFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All ({accounts.length})
          </button>
          {ALL_PLATFORMS.map((p) => {
            const cfg = PLATFORMS[p];
            const Icon = cfg.icon;
            const count = platformCounts[p];
            if (count === 0 && platformFilter !== p) return null;
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                  platformFilter === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Icon className="h-3 w-3" />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Account cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="flex justify-center gap-3 text-muted-foreground">
              <TikTokIcon className="h-8 w-8" />
              <Youtube className="h-8 w-8" />
              <Instagram className="h-8 w-8" />
            </div>
            <div>
              <p className="font-semibold">No accounts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect a platform via OAuth or manually add your social accounts.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowConnect(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Connect Platform
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Manually
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((account) => {
            const platform = (account.platform || 'tiktok') as PlatformKey;
            const cfg = PLATFORMS[platform] || PLATFORMS.tiktok;
            const Icon = cfg.icon;
            const expired = isTokenExpired(account);
            const isConnected = checkOAuthConnected(account);
            const hasTheme = !!(account.niche || account.tone);

            return (
              <div
                key={account.id}
                className={clsx(
                  'rounded-lg border-2 bg-card p-4 transition-all hover:shadow-md',
                  cfg.accent
                )}
              >
                {/* Top row: avatar + info */}
                <div className="flex items-start gap-3">
                  {account.avatar_url ? (
                    <Image
                      src={account.avatar_url}
                      alt={account.platform_username}
                      width={44}
                      height={44}
                      className="rounded-full object-cover shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className={clsx(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                      cfg.bg
                    )}>
                      <Icon className={clsx('h-5 w-5', cfg.color)} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{account.platform_username}</p>
                      <span className={clsx(
                        'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        cfg.bg, cfg.color
                      )}>
                        <Icon className="h-2.5 w-2.5" />
                        {cfg.label}
                      </span>
                    </div>
                    {account.display_name && (
                      <p className="text-xs text-muted-foreground truncate">{account.display_name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{account.followers_count.toLocaleString()} followers</span>
                      {account.niche && <span className="truncate">· {account.niche}</span>}
                    </div>
                  </div>
                </div>

                {/* Status + connection badges */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => handleToggleStatus(account)}
                    className={clsx(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors',
                      account.status === 'active'
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                    )}
                  >
                    {account.status}
                  </button>

                  {isConnected && !expired && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  )}
                  {isConnected && expired && (
                    <a href={cfg.connectUrl} className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-500/20 transition-colors">
                      <AlertCircle className="h-3 w-3" /> Expired — Reconnect
                    </a>
                  )}
                  {!isConnected && (
                    <a href={cfg.connectUrl} className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                      cfg.bg, cfg.color, 'hover:opacity-80'
                    )}>
                      <LinkIcon className="h-3 w-3" /> Connect
                    </a>
                  )}

                  {hasTheme && account.tone && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                      {account.tone}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => setCredsAccount(account)} title="Credentials">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setThemeAccount(account)} title="Theme & voice">
                    <Palette className="h-4 w-4" />
                  </Button>
                  {isConnected && !expired && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(account)}
                      disabled={syncing === account.id}
                      title={`Sync from ${cfg.label}`}
                    >
                      <RefreshCw className={clsx('h-4 w-4', syncing === account.id && 'animate-spin')} />
                    </Button>
                  )}
                  <a
                    href={cfg.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                    title={`Open ${cfg.label}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Panels */}
      {themeAccount && (
        <AccountThemePanel
          account={themeAccount}
          onClose={() => setThemeAccount(null)}
          onSaved={handleThemeSaved}
        />
      )}
      {credsAccount && (
        <AccountCredentialsPanel
          account={credsAccount}
          onClose={() => setCredsAccount(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TikTok SVG icon                                                    */
/* ------------------------------------------------------------------ */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
    </svg>
  );
}
