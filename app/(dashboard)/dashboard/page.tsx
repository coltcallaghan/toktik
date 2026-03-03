'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Video, TrendingUp, Activity, Loader2, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient, type Account, type Content } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const supabase = createClient();
      const [accountsRes, contentRes] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('content').select('id, status, engagement_metrics, account_id').order('created_at', { ascending: false }),
      ]);
      if (!accountsRes.error && accountsRes.data) setAccounts(accountsRes.data);
      if (!contentRes.error && contentRes.data) setContent(contentRes.data as Content[]);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const publishedCount = content.filter((c) => c.status === 'published').length;
  const draftCount = content.filter((c) => c.status === 'draft').length;
  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers_count ?? 0), 0);

  // Bar chart data — accounts with follower counts
  const chartData = accounts
    .filter((a) => (a.followers_count ?? 0) > 0)
    .map((a) => ({ username: a.platform_username, followers: a.followers_count ?? 0 }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Here's your account performance overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <div className="text-2xl font-bold">{accounts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {accounts.filter((a) => a.tiktok_access_token).length} connected to TikTok
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <div className="text-2xl font-bold">
                  {totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(1)}K` : totalFollowers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">across all accounts</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <div className="text-2xl font-bold">{publishedCount}</div>
                <p className="text-xs text-muted-foreground">{draftCount} drafts pending</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <>
                <div className="text-2xl font-bold">{content.length}</div>
                <p className="text-xs text-muted-foreground">all time</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Followers chart — only shown if any accounts have follower data */}
      {!loading && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Account Performance</CardTitle>
            <CardDescription>Followers by account</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="username" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="followers" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Accounts list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Accounts</CardTitle>
              <CardDescription>Connected TikTok accounts</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://www.tiktok.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Create TikTok account
              </a>
              <a
                href="/api/auth/tiktok"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <TikTokIcon className="h-3.5 w-3.5" />
                Connect TikTok
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No TikTok accounts connected yet.</p>
              <a
                href="/api/auth/tiktok"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <TikTokIcon className="h-3.5 w-3.5" />
                Connect your first account
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    {account.avatar_url ? (
                      <Image src={account.avatar_url} alt={account.platform_username} width={32} height={32}
                        className="rounded-full object-cover" unoptimized />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {account.platform_username.replace('@', '').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{account.platform_username}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.niche ? `${account.niche} · ` : ''}
                        {account.followers_count > 0 ? `${account.followers_count.toLocaleString()} followers` : 'No followers data'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      account.tiktok_access_token
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {account.tiktok_access_token ? 'Connected' : 'Manual'}
                    </span>
                    <Link
                      href="/accounts"
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
    </svg>
  );
}
