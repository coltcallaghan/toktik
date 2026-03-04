'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Loader2,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient, type Content, type Account } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ScheduledContent = Content & {
  account?: Account;
  schedule_status?: string | null;
  auto_scheduled?: boolean;
};

type TimeSlot = {
  hour: number;
  label: string;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TIME_SLOTS: TimeSlot[] = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`,
}));

// Peak engagement hours for TikTok (in local time)
const PEAK_HOURS = [7, 8, 9, 12, 13, 17, 18, 19, 20, 21];

const statusColors: Record<string, string> = {
  pending: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  publishing: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  published: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SchedulerPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledContent[]>([]);
  const [unscheduled, setUnscheduled] = useState<ScheduledContent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [unscheduling, setUnscheduling] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(12);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  const [view, setView] = useState<'calendar' | 'queue'>('calendar');

  /* ── Load data ──────────────────────────────────────────────────── */

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();

    const [contentRes, accountsRes] = await Promise.all([
      supabase
        .from('content')
        .select('*')
        .order('scheduled_at', { ascending: true }),
      supabase.from('accounts').select('*'),
    ]);

    const allAccounts = accountsRes.data ?? [];
    setAccounts(allAccounts);

    const allContent = (contentRes.data ?? []).map((c: Content) => ({
      ...c,
      account: allAccounts.find((a) => a.id === c.account_id),
    }));

    setScheduled(
      allContent.filter(
        (c: ScheduledContent) => c.scheduled_at && (c.status === 'scheduled' || c.schedule_status)
      )
    );
    setUnscheduled(
      allContent.filter((c: ScheduledContent) => c.status === 'draft' && !c.scheduled_at)
    );

    setLoading(false);
  }

  /* ── Calendar helpers ───────────────────────────────────────────── */

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  }, [year, month]);

  function getItemsForDay(day: number): ScheduledContent[] {
    return scheduled.filter((item) => {
      if (!item.scheduled_at) return false;
      const d = new Date(item.scheduled_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function isToday(day: number) {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }

  function isSelected(day: number) {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  }

  function selectDay(day: number) {
    setSelectedDate(new Date(year, month, day));
  }

  /* ── Schedule / Unschedule ──────────────────────────────────────── */

  async function handleSchedule(contentId: string, date: Date, hour: number) {
    setScheduling(contentId);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hour, 0, 0, 0);

    const res = await fetch(`/api/content/${contentId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: scheduledAt.toISOString() }),
    });

    if (res.ok) {
      await loadAll();
    }
    setScheduling(null);
    setSelectedDraftId('');
  }

  async function handleAutoSchedule(contentId: string) {
    setScheduling(contentId);

    const res = await fetch(`/api/content/${contentId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto: true }),
    });

    if (res.ok) {
      await loadAll();
    }
    setScheduling(null);
  }

  async function handleUnschedule(contentId: string) {
    setUnscheduling(contentId);
    const supabase = createClient();
    await supabase
      .from('content')
      .update({
        scheduled_at: null,
        status: 'draft',
        schedule_status: null,
        auto_scheduled: false,
      })
      .eq('id', contentId);

    await loadAll();
    setUnscheduling(null);
  }

  /* ── Render helpers ─────────────────────────────────────────────── */

  const selectedDayItems = selectedDate
    ? getItemsForDay(selectedDate.getDate())
    : [];

  const upcomingQueue = scheduled
    .filter(
      (c) =>
        c.scheduled_at &&
        new Date(c.scheduled_at) > new Date() &&
        (c.schedule_status === 'pending' || !c.schedule_status)
    )
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduler</h1>
          <p className="text-muted-foreground">
            Schedule and auto-post content at optimal times
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            <CalendarIcon className="mr-1 h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={view === 'queue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('queue')}
          >
            <Clock className="mr-1 h-4 w-4" />
            Queue ({upcomingQueue.length})
          </Button>
        </div>
      </div>

      {/* ── Stats cards ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingQueue.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {scheduled.filter((c) => c.schedule_status === 'published').length}
              </p>
              <p className="text-sm text-muted-foreground">Auto-Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
              <Video className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unscheduled.length}</p>
              <p className="text-sm text-muted-foreground">Ready to Schedule</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {scheduled.filter((c) => c.schedule_status === 'failed').length}
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Calendar View ─────────────────────────────────────────── */}
      {view === 'calendar' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {MONTHS[month]} {year}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentDate(new Date());
                      setSelectedDate(new Date());
                    }}
                  >
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="h-20" />;
                  }

                  const items = getItemsForDay(day);
                  const today = isToday(day);
                  const selected = isSelected(day);

                  return (
                    <button
                      key={day}
                      onClick={() => selectDay(day)}
                      className={`h-20 rounded-lg border p-1.5 text-left transition-colors hover:bg-muted/50 ${
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border'
                      } ${today ? 'font-bold' : ''}`}
                    >
                      <div
                        className={`text-xs ${
                          today
                            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                            : ''
                        }`}
                      >
                        {day}
                      </div>
                      {items.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {items.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className={`truncate rounded px-1 py-0.5 text-[10px] font-medium border ${
                                statusColors[item.schedule_status ?? 'pending']
                              }`}
                            >
                              {new Date(item.scheduled_at!).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}{' '}
                              {item.title.slice(0, 12)}
                            </div>
                          ))}
                          {items.length > 2 && (
                            <div className="text-[10px] text-muted-foreground pl-1">
                              +{items.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Selected day detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Select a day'}
                </CardTitle>
                <CardDescription>
                  {selectedDate
                    ? `${selectedDayItems.length} scheduled post${selectedDayItems.length !== 1 ? 's' : ''}`
                    : 'Click on a day to see details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDayItems.length === 0 && selectedDate ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No posts scheduled for this day
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.account?.platform_username ?? 'Unknown'} ·{' '}
                              {new Date(item.scheduled_at!).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              statusColors[item.schedule_status ?? 'pending']
                            }`}
                          >
                            {item.schedule_status ?? 'pending'}
                          </span>
                        </div>
                        {item.auto_scheduled && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            Auto-scheduled at optimal time
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnschedule(item.id)}
                            disabled={
                              unscheduling === item.id ||
                              item.schedule_status === 'published'
                            }
                            className="text-xs h-7"
                          >
                            {unscheduling === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Unschedule
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick schedule */}
            {selectedDate && unscheduled.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Schedule a Draft</CardTitle>
                  <CardDescription>
                    Pick a draft and time to schedule for{' '}
                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Draft picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Content</label>
                    <select
                      value={selectedDraftId}
                      onChange={(e) => setSelectedDraftId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select a draft…</option>
                      {unscheduled.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.account?.platform_username ?? '?'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Time</label>
                    <select
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(Number(e.target.value))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot.hour} value={slot.hour}>
                          {slot.label}
                          {PEAK_HOURS.includes(slot.hour) ? ' ⚡ Peak' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      ⚡ = Peak social media engagement hours
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!selectedDraftId || scheduling === selectedDraftId}
                      onClick={() =>
                        selectedDraftId &&
                        selectedDate &&
                        handleSchedule(selectedDraftId, selectedDate, selectedHour)
                      }
                    >
                      {scheduling === selectedDraftId ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={!selectedDraftId || scheduling === selectedDraftId}
                      onClick={() => selectedDraftId && handleAutoSchedule(selectedDraftId)}
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      Auto (Best Time)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Queue View ────────────────────────────────────────────── */}
      {view === 'queue' && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Queue</CardTitle>
            <CardDescription>
              Posts will be auto-published at their scheduled time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingQueue.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No upcoming scheduled posts
                </p>
                <p className="text-xs text-muted-foreground">
                  Go to the calendar view and schedule some drafts
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingQueue.map((item) => {
                  const schedDate = new Date(item.scheduled_at!);
                  const now = new Date();
                  const hoursUntil = Math.round(
                    (schedDate.getTime() - now.getTime()) / (1000 * 60 * 60)
                  );

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                          <Play className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{item.account?.platform_username ?? 'Unknown'}</span>
                            <span>·</span>
                            <span>
                              {schedDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at{' '}
                              {schedDate.toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                            {item.auto_scheduled && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Zap className="h-3 w-3" />
                                  Auto
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {hoursUntil <= 0
                            ? 'Due now'
                            : hoursUntil < 24
                            ? `${hoursUntil}h`
                            : `${Math.round(hoursUntil / 24)}d`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnschedule(item.id)}
                          disabled={unscheduling === item.id}
                        >
                          {unscheduling === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Drafts ready to schedule ──────────────────────────────── */}
      {unscheduled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drafts Ready to Schedule</CardTitle>
            <CardDescription>
              These drafts have no scheduled time yet. Auto-schedule them or pick a time on the
              calendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unscheduled.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Video className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.account?.platform_username ?? 'Unknown'}
                        {item.video_url ? ' · Video attached' : ' · No video yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAutoSchedule(item.id)}
                      disabled={scheduling === item.id}
                    >
                      {scheduling === item.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="mr-1 h-3 w-3" />
                      )}
                      Auto-Schedule
                    </Button>
                  </div>
                </div>
              ))}
              {unscheduled.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{unscheduled.length - 10} more drafts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
