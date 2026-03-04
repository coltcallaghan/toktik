'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarClock, Share2 } from 'lucide-react';
import SchedulerPage from '../scheduler/page';
import DistributePageWrapper from '../distribute/page';

function PublishInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') ?? 'schedule';

  const tabs = [
    { key: 'schedule', label: 'Schedule', icon: CalendarClock },
    { key: 'distribute', label: 'Distribute & Repurpose', icon: Share2 },
  ];

  return (
    <div>
      {/* Tab bar injected above each page's own header */}
      <div className="flex gap-1 border-b border-border px-6 bg-background sticky top-0 z-10">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => router.replace(`/publish?tab=${key}`)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && <SchedulerPage />}
      {tab === 'distribute' && <DistributePageWrapper />}
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense>
      <PublishInner />
    </Suspense>
  );
}
