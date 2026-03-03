'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Video,
  Users,
  TrendingUp,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface ProfileStats {
  totalAccounts: number;
  totalTeams: number;
  totalContent: number;
  publishedContent: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalAccounts: 0,
    totalTeams: 0,
    totalContent: 0,
    publishedContent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push('/login');
      return;
    }

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
      created_at: user.created_at,
    };

    setProfile(userProfile);
    setFullName(userProfile.full_name);

    // Fetch stats in parallel
    const [accountsRes, teamsRes, contentRes, publishedRes] = await Promise.all([
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('teams').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('content').select('id', { count: 'exact', head: true }),
      supabase
        .from('content')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
    ]);

    setStats({
      totalAccounts: accountsRes.count ?? 0,
      totalTeams: teamsRes.count ?? 0,
      totalContent: contentRes.count ?? 0,
      publishedContent: publishedRes.count ?? 0,
    });

    setLoading(false);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (error) {
      setMessage('Failed to update profile. Please try again.');
    } else {
      setProfile({ ...profile, full_name: fullName });
      setMessage('Profile updated successfully!');
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account information and activity</p>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Avatar */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
              <User className="h-12 w-12 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="max-w-xs text-lg font-bold"
                    placeholder="Your name"
                  />
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="mr-1 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setFullName(profile.full_name);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {memberSince}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Admin
                </span>
              </div>

              {message && (
                <p
                  className={`mt-2 text-sm ${
                    message.includes('success') ? 'text-green-500' : 'text-destructive'
                  }`}
                >
                  {message}
                </p>
              )}
            </div>

            <Button variant="outline" onClick={() => router.push('/settings')}>
              Account Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAccounts}</p>
              <p className="text-sm text-muted-foreground">TikTok Accounts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTeams}</p>
              <p className="text-sm text-muted-foreground">AI Teams</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <Video className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalContent}</p>
              <p className="text-sm text-muted-foreground">Total Content</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.publishedContent}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentActivity />
        </CardContent>
      </Card>
    </div>
  );
}

function RecentActivity() {
  const [activities, setActivities] = useState<
    { id: string; title: string; status: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('content')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setActivities(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No recent activity yet. Start creating content!
      </p>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-500/10 text-yellow-500',
    scheduled: 'bg-blue-500/10 text-blue-500',
    published: 'bg-green-500/10 text-green-500',
    failed: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center justify-between rounded-lg border border-border p-3"
        >
          <div className="flex items-center gap-3">
            <Video className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{activity.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(activity.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              statusColors[activity.status] ?? ''
            }`}
          >
            {activity.status}
          </span>
        </div>
      ))}
    </div>
  );
}
