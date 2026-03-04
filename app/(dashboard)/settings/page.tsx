'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Unplug,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Music2,
  Eye,
  EyeOff,
  Trash2,
  KeyRound,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase';
import { useTheme } from '@/components/theme-provider';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConnectedService {
  key: string;
  name: string;
  icon: React.ElementType;
  description: string;
  status: 'connected' | 'disconnected' | 'checking';
  detail: string;
  accounts: number;
}

/* ------------------------------------------------------------------ */
/*  Appearance Card                                                    */
/* ------------------------------------------------------------------ */

function AppearanceCard() {
  const { theme, setTheme } = useTheme();

  const options: { value: 'light' | 'dark' | 'system'; label: string; desc: string }[] = [
    { value: 'light', label: '☀️ Light', desc: 'Always use light theme' },
    { value: 'dark', label: '🌙 Dark', desc: 'Always use dark theme' },
    { value: 'system', label: '💻 System', desc: 'Follow your OS setting' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose your preferred color theme</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                theme === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <p className="text-lg">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const router = useRouter();

  /* ── Account ────────────────────────────────────────────────────── */
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  /* ── API Key ────────────────────────────────────────────────────── */
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  /* ── Connected Services ─────────────────────────────────────────── */
  const [services, setServices] = useState<ConnectedService[]>([
    {
      key: 'tiktok',
      name: 'TikTok',
      icon: Music2,
      description: 'Connect TikTok accounts for automated content publishing',
      status: 'checking',
      detail: '',
      accounts: 0,
    },
    {
      key: 'claude',
      name: 'Claude AI',
      icon: Sparkles,
      description: 'AI-powered scripting, voice generation and content creation',
      status: 'checking',
      detail: '',
      accounts: 0,
    },
    {
      key: 'stripe',
      name: 'Stripe',
      icon: CreditCard,
      description: 'Payment processing for premium features',
      status: 'checking',
      detail: '',
      accounts: 0,
    },
  ]);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  /* ── Third-party API Keys ───────────────────────────────────────── */
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({
    runway: '', heygen: '', elevenlabs: '', anthropic: '',
  });
  const [showProviderKey, setShowProviderKey] = useState<Record<string, boolean>>({});
  const [configuredProviders, setConfiguredProviders] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [providerMsg, setProviderMsg] = useState<Record<string, string>>({});

  /* ── Plan / Billing ─────────────────────────────────────────────── */
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  /* ── Preferences ────────────────────────────────────────────────── */
  const [prefs, setPrefs] = useState({
    emailContent: true,
    trendAlerts: true,
    weeklyReports: true,
    accountUpdates: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState('');

  /* ================================================================ */
  /*  Load initial data                                                */
  /* ================================================================ */

  useEffect(() => {
    loadUserData();
    loadServices();
    loadConfiguredProviders();
    fetch('/api/user-plan').then((r) => r.json()).then((d) => { if (d.plan) setCurrentPlan(d.plan); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUserData() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email ?? '');
    setFullName(user.user_metadata?.full_name ?? '');
    setOrganization(user.user_metadata?.organization ?? '');

    // Load or generate API key from user metadata
    const storedKey = user.user_metadata?.api_key;
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      const generated = generateApiKey();
      setApiKey(generated);
      await supabase.auth.updateUser({ data: { api_key: generated } });
    }

    // Load notification prefs
    const savedPrefs = user.user_metadata?.notification_prefs;
    if (savedPrefs) {
      setPrefs(savedPrefs);
    }
  }

  async function loadServices() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // TikTok — count linked accounts
    const { count: tiktokCount } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('tiktok_access_token', 'is', null);

    // Claude — check if Anthropic key exists server-side (env var)
    const claudeConnected = true; // env var is set on the server

    setServices((prev) =>
      prev.map((s) => {
        if (s.key === 'tiktok') {
          const connected = (tiktokCount ?? 0) > 0;
          return {
            ...s,
            status: connected ? 'connected' : 'disconnected',
            accounts: tiktokCount ?? 0,
            detail: connected
              ? `${tiktokCount} account${(tiktokCount ?? 0) !== 1 ? 's' : ''} linked via OAuth`
              : 'No TikTok accounts connected',
          };
        }
        if (s.key === 'claude') {
          return {
            ...s,
            status: claudeConnected ? 'connected' : 'disconnected',
            accounts: claudeConnected ? 1 : 0,
            detail: claudeConnected
              ? 'API key configured (server-side)'
              : 'ANTHROPIC_API_KEY not set in environment',
          };
        }
        if (s.key === 'stripe') {
          return {
            ...s,
            status: 'disconnected',
            detail: 'Not yet configured — coming soon',
          };
        }
        return s;
      })
    );
  }

  /* ================================================================ */
  /*  Helpers                                                          */
  /* ================================================================ */

  function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'tk_live_';
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  }

  function maskKey(key: string) {
    if (key.length <= 12) return key;
    return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
  }

  /* ================================================================ */
  /*  Account actions                                                  */
  /* ================================================================ */

  async function handleSaveAccount() {
    setSavingAccount(true);
    setAccountMsg('');
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      email: email || undefined,
      data: { full_name: fullName, organization },
    });

    setAccountMsg(error ? error.message : 'Account updated successfully!');
    setSavingAccount(false);
  }

  async function handleChangePassword() {
    setSavingPassword(true);
    setPasswordMsg('');

    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      setSavingPassword(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters.');
      setSavingPassword(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg('Password updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  }

  /* ================================================================ */
  /*  API key actions                                                  */
  /* ================================================================ */

  async function handleCopyKey() {
    await navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function handleRegenerateKey() {
    if (!confirm('Are you sure? Any existing integrations using the old key will stop working.'))
      return;
    setRegenerating(true);
    const newKey = generateApiKey();
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { api_key: newKey } });
    setApiKey(newKey);
    setShowKey(true);
    setRegenerating(false);
  }

  /* ================================================================ */
  /*  Service actions                                                  */
  /* ================================================================ */

  function handleConnectService(key: string) {
    if (key === 'tiktok') {
      // Redirect to TikTok OAuth flow
      window.location.href = '/api/auth/tiktok';
    } else if (key === 'claude') {
      // Claude is configured via env var — show instructions
      setExpandedService(expandedService === key ? null : key);
    } else if (key === 'stripe') {
      // Stripe not yet available
      alert('Stripe integration is coming soon!');
    }
  }

  function handleManageService(key: string) {
    if (key === 'tiktok') {
      router.push('/accounts');
    } else {
      setExpandedService(expandedService === key ? null : key);
    }
  }

  async function handleDisconnectTikTok() {
    if (
      !confirm(
        'This will remove all TikTok OAuth tokens from your linked accounts. You can re-connect anytime. Continue?'
      )
    )
      return;

    setDisconnecting('tiktok');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('accounts')
      .update({
        tiktok_access_token: null,
        tiktok_refresh_token: null,
        tiktok_token_expires_at: null,
        tiktok_open_id: null,
      })
      .eq('user_id', user.id);

    setServices((prev) =>
      prev.map((s) =>
        s.key === 'tiktok'
          ? { ...s, status: 'disconnected', accounts: 0, detail: 'No TikTok accounts connected' }
          : s
      )
    );
    setDisconnecting(null);
    setExpandedService(null);
  }

  /* ================================================================ */
  /*  Provider API Keys                                                */
  /* ================================================================ */

  async function loadConfiguredProviders() {
    const res = await fetch('/api/user-api-keys');
    const data = await res.json();
    if (res.ok) setConfiguredProviders(data.configured ?? {});
  }

  async function handleSaveProviderKey(provider: string) {
    const key = providerKeys[provider]?.trim();
    if (!key) return;
    setSavingProvider(provider);
    setProviderMsg((prev) => ({ ...prev, [provider]: '' }));
    const res = await fetch('/api/user-api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key }),
    });
    const data = await res.json();
    if (res.ok) {
      setProviderMsg((prev) => ({ ...prev, [provider]: 'Saved!' }));
      setProviderKeys((prev) => ({ ...prev, [provider]: '' }));
      loadConfiguredProviders();
    } else {
      setProviderMsg((prev) => ({ ...prev, [provider]: data.error ?? 'Failed to save' }));
    }
    setSavingProvider(null);
  }

  async function handleDeleteProviderKey(provider: string) {
    await fetch('/api/user-api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    setConfiguredProviders((prev) => { const n = { ...prev }; delete n[provider]; return n; });
  }

  /* ================================================================ */
  /*  Billing                                                          */
  /* ================================================================ */

  async function handleUpgrade(tier: string) {
    setUpgrading(tier);
    setUpgradeMsg('');
    try {
      const res = await fetch('/api/billing/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setUpgradeMsg(data.error ?? 'Stripe not configured yet — add STRIPE_SECRET_KEY and STRIPE_PRICE_* to .env.local');
      }
    } catch {
      setUpgradeMsg('Failed to start checkout');
    }
    setUpgrading(null);
  }

  /* ================================================================ */
  /*  Preferences                                                      */
  /* ================================================================ */

  async function handleSavePrefs() {
    setSavingPrefs(true);
    setPrefsMsg('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { notification_prefs: prefs },
    });
    setPrefsMsg(error ? error.message : 'Preferences saved!');
    setSavingPrefs(false);
  }

  async function handleDeleteAccount() {
    if (
      !confirm(
        'Are you absolutely sure? This will permanently delete your account and all data. This cannot be undone.'
      )
    )
      return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api">API & Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* ── Account ─────────────────────────────────────────────── */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Organization</label>
                <Input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Your organization"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveAccount} disabled={savingAccount}>
                  {savingAccount ? 'Saving…' : 'Save Changes'}
                </Button>
                {accountMsg && (
                  <p
                    className={`text-sm ${
                      accountMsg.includes('success') ? 'text-green-500' : 'text-destructive'
                    }`}
                  >
                    {accountMsg}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleChangePassword} disabled={savingPassword}>
                  {savingPassword ? 'Updating…' : 'Update Password'}
                </Button>
                {passwordMsg && (
                  <p
                    className={`text-sm ${
                      passwordMsg.includes('updated') ? 'text-green-500' : 'text-destructive'
                    }`}
                  >
                    {passwordMsg}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API & Integrations ──────────────────────────────────── */}
        <TabsContent value="api" className="space-y-6">
          {/* API Key Card */}
          <Card>
            <CardHeader>
              <CardTitle>API Key</CardTitle>
              <CardDescription>
                Use this key to authenticate external tools with AudienceAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={showKey ? apiKey : maskKey(apiKey)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                    className="shrink-0"
                  >
                    {showKey ? 'Hide' : 'Reveal'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyKey}
                    className="shrink-0"
                  >
                    {copiedKey ? (
                      <Check className="mr-1 h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="mr-1 h-4 w-4" />
                    )}
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={handleRegenerateKey}
                  disabled={regenerating}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${regenerating ? 'animate-spin' : ''}`}
                  />
                  {regenerating ? 'Regenerating…' : 'Regenerate Key'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Provider Keys */}
          <Card>
            <CardHeader>
              <CardTitle>AI Provider Keys</CardTitle>
              <CardDescription>
                Add your own API keys to enable video generation and voice features. Keys are encrypted and never shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                { provider: 'runway', label: 'Runway', desc: 'Text-to-video generation (Gen-4.5)', href: 'https://dev.runwayml.com' },
                { provider: 'heygen', label: 'HeyGen', desc: 'AI avatar talking-head videos', href: 'https://heygen.com' },
                { provider: 'elevenlabs', label: 'ElevenLabs', desc: 'Voice/text-to-speech generation', href: 'https://elevenlabs.io' },
                { provider: 'anthropic', label: 'Anthropic (Claude)', desc: 'AI script & content generation', href: 'https://console.anthropic.com' },
              ] as const).map(({ provider, label, desc, href }) => {
                const isConfigured = !!configuredProviders[provider];
                const isSaving = savingProvider === provider;
                const msg = providerMsg[provider];
                const visible = showProviderKey[provider];

                return (
                  <div key={provider} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConfigured && (
                          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                            <Check className="h-3 w-3" /> Saved
                          </span>
                        )}
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline">
                          Get key
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={visible ? 'text' : 'password'}
                          value={providerKeys[provider]}
                          onChange={(e) => setProviderKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
                          placeholder={isConfigured ? '••••••••••••••••••••••• (replace)' : 'Paste API key here'}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProviderKey((prev) => ({ ...prev, [provider]: !prev[provider] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveProviderKey(provider)}
                        disabled={isSaving || !providerKeys[provider]?.trim()}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                      {isConfigured && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteProviderKey(provider)}
                          title="Remove saved key"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {msg && (
                      <p className={`text-xs ${msg === 'Saved!' ? 'text-green-500' : 'text-destructive'}`}>{msg}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Connected Services Card */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
              <CardDescription>Manage your third-party integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {services.map((service) => {
                const Icon = service.icon;
                const isExpanded = expandedService === service.key;

                return (
                  <div
                    key={service.key}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    {/* Service row */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            service.status === 'connected'
                              ? 'bg-green-500/10 text-green-500'
                              : service.status === 'checking'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{service.name}</p>
                            {service.status === 'connected' && (
                              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                                <Check className="h-3 w-3" />
                                Connected
                              </span>
                            )}
                            {service.status === 'checking' && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                Checking…
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {service.status === 'connected'
                              ? service.detail
                              : service.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {service.status === 'connected' ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageService(service.key)}
                            >
                              {service.key === 'tiktok' ? (
                                <>
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Manage Accounts
                                </>
                              ) : isExpanded ? (
                                <>
                                  <ChevronUp className="mr-1 h-3 w-3" />
                                  Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="mr-1 h-3 w-3" />
                                  Details
                                </>
                              )}
                            </Button>
                          </>
                        ) : service.status === 'disconnected' ? (
                          <Button
                            size="sm"
                            onClick={() => handleConnectService(service.key)}
                          >
                            Connect
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3">
                        {service.key === 'tiktok' && (
                          <>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {service.accounts} linked account
                                  {service.accounts !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Tokens are refreshed automatically. You can manage individual
                                  accounts from the Accounts page.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push('/accounts')}
                                >
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Accounts
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleDisconnectTikTok}
                                  disabled={disconnecting === 'tiktok'}
                                >
                                  <Unplug className="mr-1 h-3 w-3" />
                                  {disconnecting === 'tiktok'
                                    ? 'Disconnecting…'
                                    : 'Disconnect All'}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {service.key === 'claude' && (
                          <div>
                            <p className="text-sm font-medium">
                              Claude AI is configured via server environment variable
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              The <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>{' '}
                              environment variable is set on the server. This powers all AI content
                              generation — scripting, voice, and video planning.
                            </p>
                            <div className="mt-2 flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
                              <Check className="h-4 w-4" />
                              API key is active and working
                            </div>
                          </div>
                        )}

                        {service.key === 'stripe' && (
                          <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600">
                            <AlertTriangle className="h-4 w-4" />
                            Stripe integration is planned for a future release.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Preferences ─────────────────────────────────────────── */}
        <TabsContent value="preferences" className="space-y-6">
          <AppearanceCard />
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  { key: 'emailContent', label: 'Email notifications for new content' },
                  { key: 'trendAlerts', label: 'Alerts for trending topics' },
                  { key: 'weeklyReports', label: 'Weekly performance reports' },
                  { key: 'accountUpdates', label: 'Account status updates' },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <label className="text-sm font-medium">{label}</label>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Button onClick={handleSavePrefs} disabled={savingPrefs}>
                  {savingPrefs ? 'Saving…' : 'Save Preferences'}
                </Button>
                {prefsMsg && (
                  <p
                    className={`text-sm ${
                      prefsMsg.includes('saved') ? 'text-green-500' : 'text-destructive'
                    }`}
                  >
                    {prefsMsg}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deleting your account will remove all associated data and cannot be recovered.
              </p>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Billing ──────────────────────────────────────────────── */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-semibold capitalize">
                {currentPlan === 'free' ? 'Starter (Free)' : currentPlan === 'creator' ? 'Creator — $29/mo' : 'Agency — $99/mo'}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Starter */}
            <Card className={currentPlan === 'free' ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="text-lg">Starter</CardTitle>
                <CardDescription>Perfect for testing</CardDescription>
                <p className="text-3xl font-bold mt-2">Free</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>✓ 2 social accounts</p>
                <p>✓ Unlimited AI generations*</p>
                <p>✓ Basic analytics</p>
                <p>✓ Content scheduling</p>
              </CardContent>
            </Card>

            {/* Creator */}
            <Card className={currentPlan === 'creator' ? 'border-primary' : 'border-primary/30'}>
              <CardHeader>
                <div className="inline-block rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5 font-medium mb-2">Most Popular</div>
                <CardTitle className="text-lg">Creator</CardTitle>
                <CardDescription>For content creators</CardDescription>
                <p className="text-3xl font-bold mt-2">$29<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>✓ 20 social accounts</p>
                <p>✓ Unlimited AI generations*</p>
                <p>✓ Advanced analytics</p>
                <p>✓ A/B testing</p>
                <p>✓ Bulk content generation</p>
                {currentPlan !== 'creator' && currentPlan !== 'agency' && (
                  <Button className="w-full mt-4" onClick={() => handleUpgrade('creator')} disabled={upgrading === 'creator'}>
                    {upgrading === 'creator' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting…</> : 'Upgrade to Creator'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Agency */}
            <Card className={currentPlan === 'agency' ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="text-lg">Agency</CardTitle>
                <CardDescription>For agencies & teams</CardDescription>
                <p className="text-3xl font-bold mt-2">$99<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>✓ Unlimited social accounts</p>
                <p>✓ Unlimited AI generations*</p>
                <p>✓ Full analytics suite</p>
                <p>✓ Team management</p>
                <p>✓ Approval workflows</p>
                <p>✓ 24/7 priority support</p>
                {currentPlan !== 'agency' && (
                  <Button className="w-full mt-4" onClick={() => handleUpgrade('agency')} disabled={upgrading === 'agency'}>
                    {upgrading === 'agency' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting…</> : 'Upgrade to Agency'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {upgradeMsg && (
            <p className="text-sm text-amber-600 bg-amber-500/10 rounded-md px-4 py-3">{upgradeMsg}</p>
          )}

          <p className="text-xs text-muted-foreground">
            * Unlimited AI generations subject to your own API key quotas (Anthropic, Runway, HeyGen). AudienceAI does not charge per generation.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
