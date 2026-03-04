'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Binoculars,
  Bot,
  Flame,
  FlaskConical,
  Home,
  Layers,
  LogOut,
  Send,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/accounts', label: 'Accounts', icon: Users },
    ],
  },
  {
    label: 'Create',
    items: [
      { href: '/content', label: 'Content', icon: Video },
      { href: '/bulk-generate', label: 'Bulk Generate', icon: Layers },
      { href: '/ab-testing', label: 'A/B Testing', icon: FlaskConical },
    ],
  },
  {
    label: 'Publish',
    items: [
      { href: '/publish', label: 'Publish & Schedule', icon: Send },
      { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
    ],
  },
  {
    label: 'Grow',
    items: [
      { href: '/trends', label: 'Trends', icon: TrendingUp },
      { href: '/competitors', label: 'Competitors', icon: Binoculars },
      { href: '/comment-bot', label: 'Comment Bot', icon: Bot },
    ],
  },
  {
    label: null,
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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

      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
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
            </div>
          </div>
        ))}
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
