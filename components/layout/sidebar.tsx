'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Activity,
  BarChart3,
  Binoculars,
  Bot,
  BrainCircuit,
  Building2,
  CalendarClock,
  CreditCard,
  FlaskConical,
  Flame,
  Layers,
  ScrollText,
  Share2,
  ShieldCheck,
  Users,
  Video,
  Webhook,
  Settings,
  LogOut,
  Home,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/accounts', label: 'Accounts', icon: Users },
    { href: '/content', label: 'Content', icon: Video },
    { href: '/distribute', label: 'Distribute', icon: Share2 },
    { href: '/scheduler', label: 'Scheduler', icon: CalendarClock },
    { href: '/ab-testing', label: 'A/B Testing', icon: FlaskConical },
    { href: '/bulk-generate', label: 'Bulk Generate', icon: Layers },
    { href: '/engagement', label: 'Engagement', icon: Activity },
    { href: '/teams', label: 'Teams', icon: BarChart3 },
    { href: '/trends', label: 'Trends', icon: TrendingUp },
    { href: '/trend-prediction', label: 'Predictions', icon: BrainCircuit },
    { href: '/competitors', label: 'Competitors', icon: Binoculars },
    { href: '/comment-bot', label: 'Comment Bot', icon: Bot },
    { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
    { href: '/webhooks', label: 'Webhooks', icon: Webhook },
    { href: '/audit-log', label: 'Audit Log', icon: ScrollText },
    { href: '/billing', label: 'Billing', icon: CreditCard },
    { href: '/agency', label: 'Agency', icon: Building2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col">
      <Link href="/dashboard" className="flex h-16 shrink-0 items-center border-b border-border px-6 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">AudienceAI</span>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-4">
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/');
          }}
          className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
