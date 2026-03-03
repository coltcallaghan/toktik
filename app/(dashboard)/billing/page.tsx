'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Zap,
  Check,
  TrendingUp,
  Video,
  Mic,
  Users,
  UserPlus,
  ArrowUpRight,
  RefreshCw,
  Crown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';

interface TierConfig {
  name: string;
  price: number;
  limits: Record<string, number>;
}

interface UsageData {
  tier: string;
  tierConfig: TierConfig;
  tiers: Record<string, TierConfig>;
  usage: Record<string, number>;
  dailyUsage: { date: string; credits: number }[];
  totalCredits: number;
}

const USAGE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  ai_generation: { label: 'AI Generations', icon: Zap },
  video_upload: { label: 'Video Uploads', icon: Video },
  tts_generation: { label: 'Voice (TTS)', icon: Mic },
  accounts: { label: 'Accounts', icon: Users },
  team_members: { label: 'Team Members', icon: UserPlus },
};

const TIER_FEATURES: Record<string, string[]> = {
  free: [
    '20 AI generations/mo',
    '5 video uploads/mo',
    '10 TTS generations/mo',
    '2 TikTok accounts',
    'Basic analytics',
  ],
  pro: [
    '200 AI generations/mo',
    '50 video uploads/mo',
    '100 TTS generations/mo',
    '10 TikTok accounts',
    '5 team members',
    'A/B testing',
    'Scheduler',
    'Priority support',
  ],
  business: [
    '1,000 AI generations/mo',
    '250 video uploads/mo',
    '500 TTS generations/mo',
    '50 TikTok accounts',
    '25 team members',
    'Approval workflows',
    'Webhooks & API',
    'Competitor tracking',
    'Custom branding',
  ],
  enterprise: [
    'Unlimited everything',
    'Unlimited accounts',
    'Unlimited team members',
    'Agency mode',
    'Dedicated support',
    'Custom integrations',
    'SLA guarantee',
    'Onboarding assistance',
  ],
};

const TIER_COLORS: Record<string, string> = {
  free: 'border-border',
  pro: 'border-blue-500',
  business: 'border-purple-500',
  enterprise: 'border-amber-500',
};

export default function BillingPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/billing');
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  async function handleUpgrade(tier: string) {
    setUpgrading(tier);
    const res = await fetch('/api/billing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    });
    if (res.ok) {
      await fetchBilling();
    }
    setUpgrading(null);
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tierOrder = ['free', 'pro', 'business', 'enterprise'];
  const currentTierIdx = tierOrder.indexOf(data.tier);

  return (
    <div className="space-y-8">
      {/* Current Plan Banner */}
      <div className="rounded-lg border-2 border-primary bg-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {data.tierConfig.name} Plan
              </h2>
              <p className="text-sm text-muted-foreground">
                {data.tierConfig.price === 0
                  ? 'Free forever'
                  : `$${data.tierConfig.price}/month`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{data.totalCredits}</p>
            <p className="text-sm text-muted-foreground">credits used this month</p>
          </div>
        </div>
      </div>

      {/* Usage Meters */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Current Usage</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(USAGE_LABELS).map(([key, { label, icon: Icon }]) => {
            const used = data.usage[key] || 0;
            const limit = data.tierConfig.limits[key] || 0;
            const isUnlimited = limit === -1;
            const pct = isUnlimited ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
            const isNearLimit = pct >= 80;
            const isAtLimit = pct >= 100;

            return (
              <div key={key} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {used} / {isUnlimited ? '∞' : limit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-primary'
                    )}
                    style={{ width: isUnlimited ? '5%' : `${pct}%` }}
                  />
                </div>
                {isAtLimit && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">Limit reached – upgrade to continue</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Chart */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Usage (Last 30 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} className="text-xs" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="credits"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Plans & Pricing</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tierOrder.map((tierKey, idx) => {
            const tier = data.tiers[tierKey];
            const isCurrent = tierKey === data.tier;
            const isDowngrade = idx < currentTierIdx;
            const features = TIER_FEATURES[tierKey] || [];

            return (
              <div
                key={tierKey}
                className={clsx(
                  'relative rounded-lg border-2 bg-card p-6 transition-shadow hover:shadow-lg',
                  isCurrent ? 'border-primary shadow-md' : TIER_COLORS[tierKey]
                )}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Current Plan
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-lg font-bold">{tier.name}</h4>
                  <div className="mt-1">
                    {tier.price === 0 ? (
                      <span className="text-3xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">${tier.price}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : isDowngrade ? (
                  <button
                    disabled
                    className="w-full rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                  >
                    Downgrade
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tierKey)}
                    disabled={upgrading === tierKey}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {upgrading === tierKey ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                    Upgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Stripe integration ready — connect your Stripe keys in Settings → Services to enable real payments.
        </p>
      </div>
    </div>
  );
}
