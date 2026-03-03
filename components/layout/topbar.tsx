'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Accounts',
  '/content': 'Content',
  '/distribute': 'Cross-Platform Distribution',
  '/scheduler': 'Scheduler',
  '/ab-testing': 'A/B Testing',
  '/bulk-generate': 'Bulk Generate',
  '/engagement': 'Engagement',
  '/teams': 'Teams',
  '/trends': 'Trends',
  '/trend-prediction': 'Trend Prediction',
  '/competitors': 'Competitors',
  '/comment-bot': 'Comment Bot',
  '/approvals': 'Approvals',
  '/webhooks': 'Webhooks & Alerts',
  '/audit-log': 'Audit Log',
  '/billing': 'Usage & Billing',
  '/agency': 'Agency Mode',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

export function Topbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Dashboard';

  return (
    <header className="fixed right-0 top-0 z-40 h-16 border-b border-border bg-card pl-64 pr-6">
      <div className="flex h-full items-center justify-between">
        <div className="text-lg font-semibold">{title}</div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
            title="Your Profile"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
