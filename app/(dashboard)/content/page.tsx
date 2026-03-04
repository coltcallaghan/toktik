'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Play, Eye, Trash2, Loader2, Sparkles, Share2,
  Upload, Video, Bot, CheckCircle2, AlertCircle, ExternalLink, Captions, X, CalendarClock,
} from 'lucide-react';
import { createClient, type Content, type Account } from '@/lib/supabase';
import Image from 'next/image';
import HeyGenAvatarModal from '@/components/heygen-avatar-modal';

type ContentWithAccount = Content & { account?: Account };

export default function ContentPage() {
  const [content, setContent] = useState<ContentWithAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Per-item states
  const [uploading, setUploading] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [captioning, setCaptioning] = useState<string | null>(null);
  const [captionProgress, setCaptionProgress] = useState<Record<string, number>>({});
  const [captionResult, setCaptionResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  // Video preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewCaptioned, setPreviewCaptioned] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [heygenGenerating, setHeygenGenerating] = useState<string | null>(null);
  const [heygenStatus, setHeygenStatus] = useState<Record<string, string>>({});
  const [heygenModalTarget, setHeygenModalTarget] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const supabase = createClient();
    const [contentRes, accountsRes] = await Promise.all([
      supabase.from('content').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*'),
    ]);
    if (!accountsRes.error && accountsRes.data) setAccounts(accountsRes.data);
    if (!contentRes.error && contentRes.data) {
      setContent(contentRes.data.map((c) => ({
        ...c,
        account: accountsRes.data?.find((a) => a.id === c.account_id),
      })));
    }
    setLoading(false);
  }

  async function handleGenerateScript() {
    if (!title) return;
    setGenerating(true);
    const account = accounts.find((a) => a.id === accountId);
    const res = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: title, niche: account?.niche }),
    });
    const data = await res.json();
    if (data.script) setScript(data.script);
    setGenerating(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('content').insert({
      account_id: accountId, team_id: null, title, script,
      status: 'draft', video_url: null, scheduled_at: null,
      published_at: null, engagement_metrics: null,
    });
    if (!error) { setTitle(''); setScript(''); setAccountId(''); setShowForm(false); fetchAll(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from('content').delete().eq('id', id);
    setContent((prev) => prev.filter((c) => c.id !== id));
  }

  function triggerUpload(contentId: string) {
    setUploadTarget(contentId);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    e.target.value = '';

    setUploading(uploadTarget);
    const formData = new FormData();
    formData.append('video', file);

    const res = await fetch(`/api/content/${uploadTarget}/upload-video`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      setContent((prev) => prev.map((c) =>
        c.id === uploadTarget ? { ...c, video_url: data.video_url } : c
      ));
    }
    setUploading(null);
    setUploadTarget(null);
  }

  async function handlePublish(id: string) {
    setPublishing(id);
    setPublishResult((prev) => { const n = { ...prev }; delete n[id]; return n; });

    const res = await fetch(`/api/content/${id}/publish`, { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      setPublishResult((prev) => ({ ...prev, [id]: { ok: true, msg: 'Posted to TikTok!' } }));
      setContent((prev) => prev.map((c) =>
        c.id === id ? { ...c, status: 'published', published_at: new Date().toISOString() } : c
      ));
    } else {
      setPublishResult((prev) => ({ ...prev, [id]: { ok: false, msg: data.error ?? 'Publish failed' } }));
    }
    setPublishing(null);
  }

  async function handleCaption(id: string) {
    setCaptioning(id);
    setCaptionResult((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setCaptionProgress((prev) => ({ ...prev, [id]: 0 }));

    // Start the render
    const res = await fetch(`/api/content/${id}/caption`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      setCaptionResult((prev) => ({ ...prev, [id]: { ok: false, msg: data.error ?? 'Caption render failed' } }));
      setCaptioning(null);
      return;
    }

    // Poll status every 3 seconds
    const poll = async () => {
      const statusRes = await fetch(`/api/content/${id}/caption/status`);
      const status = await statusRes.json();

      if (status.status === 'done') {
        setCaptionResult((prev) => ({ ...prev, [id]: { ok: true, msg: 'Captions added! Video updated.' } }));
        setCaptioning(null);
        // Update video_url in local state
        setContent((prev) => prev.map((c) =>
          c.id === id ? { ...c, video_url: status.captioned_url } : c
        ));
      } else if (status.status === 'failed') {
        setCaptionResult((prev) => ({ ...prev, [id]: { ok: false, msg: status.error ?? 'Render failed' } }));
        setCaptioning(null);
      } else {
        setCaptionProgress((prev) => ({ ...prev, [id]: Math.round((status.progress ?? 0) * 100) }));
        setTimeout(poll, 3000);
      }
    };

    setTimeout(poll, 3000);
  }

  async function handleHeyGen(id: string, avatarId: string, voiceId: string) {
    setHeygenModalTarget(null);
    setHeygenGenerating(id);
    setHeygenStatus((prev) => ({ ...prev, [id]: 'Generating video...' }));

    try {
      const res = await fetch(`/api/content/${id}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'heygen', avatar_id: avatarId, voice_id: voiceId }),
      });
      const data = await res.json();

      if (!res.ok || !data.video_id) {
        setHeygenStatus((prev) => ({ ...prev, [id]: data.error ?? 'Generation failed' }));
        setHeygenGenerating(null);
        return;
      }

      const videoId = data.video_id;
      setHeygenStatus((prev) => ({ ...prev, [id]: 'Processing avatar...' }));

      // Poll until complete or failed
      const poll = async () => {
        const pollRes = await fetch(`/api/content/${id}/video-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'heygen', video_id: videoId }),
        });
        const pollData = await pollRes.json();

        if (pollData.status === 'completed') {
          setHeygenStatus((prev) => ({ ...prev, [id]: 'Done!' }));
          setHeygenGenerating(null);
          fetchAll(); // refresh content list to show new video
        } else if (pollData.status === 'failed') {
          setHeygenStatus((prev) => ({ ...prev, [id]: pollData.error ?? 'Generation failed' }));
          setHeygenGenerating(null);
        } else {
          setHeygenStatus((prev) => ({ ...prev, [id]: `Processing... (${pollData.status})` }));
          setTimeout(poll, 5000);
        }
      };

      setTimeout(poll, 5000);
    } catch {
      setHeygenStatus((prev) => ({ ...prev, [id]: 'Request failed' }));
      setHeygenGenerating(null);
    }
  }

  async function handleRunway(id: string) {
    setHeygenGenerating(id);
    setHeygenStatus((prev) => ({ ...prev, [id]: 'Writing prompt...' }));

    try {
      const res = await fetch(`/api/content/${id}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'runway' }),
      });
      const data = await res.json();

      if (!res.ok || !data.task_id) {
        setHeygenStatus((prev) => ({ ...prev, [id]: data.error ?? 'Generation failed' }));
        setHeygenGenerating(null);
        return;
      }

      const taskId = data.task_id;
      setHeygenStatus((prev) => ({ ...prev, [id]: 'Generating scenes...' }));

      const poll = async () => {
        const pollRes = await fetch(`/api/content/${id}/video-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'runway', task_id: taskId }),
        });
        const pollData = await pollRes.json();

        if (pollData.status === 'SUCCEEDED') {
          setHeygenStatus((prev) => ({ ...prev, [id]: 'Done!' }));
          setHeygenGenerating(null);
          fetchAll();
        } else if (pollData.status === 'FAILED' || pollData.status === 'CANCELLED') {
          setHeygenStatus((prev) => ({ ...prev, [id]: pollData.error ?? 'Generation failed' }));
          setHeygenGenerating(null);
        } else {
          setHeygenStatus((prev) => ({ ...prev, [id]: `Generating... (${pollData.status})` }));
          setTimeout(poll, 8000);
        }
      };

      setTimeout(poll, 8000);
    } catch {
      setHeygenStatus((prev) => ({ ...prev, [id]: 'Request failed' }));
      setHeygenGenerating(null);
    }
  }

  async function handlePreview(id: string) {
    setPreviewLoading(id);
    const res = await fetch(`/api/content/${id}/video-url`);
    const data = await res.json();
    setPreviewLoading(null);
    if (res.ok && data.url) {
      setPreviewUrl(data.url);
      setPreviewCaptioned(data.captioned ?? false);
    }
  }

  const byStatus = (status: Content['status']) => content.filter((c) => c.status === status);

  function ContentList({ items, emptyMsg }: { items: ContentWithAccount[]; emptyMsg: string }) {
    if (loading) return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
    if (items.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMsg}</p>;

    return (
      <div className="space-y-3">
        {items.map((item) => {
          const acc = item.account;
          const caption = (item.engagement_metrics as { caption?: string } | null)?.caption;
          const hasVideo = !!item.video_url;
          const result = publishResult[item.id];
          const capResult = captionResult[item.id];
          const capProgress = captionProgress[item.id] ?? 0;
          const isCaptioning = captioning === item.id;
          const metrics = item.engagement_metrics as Record<string, unknown> | null;
          const hasCaptions = metrics?.caption_status === 'done';
          const canPublish = item.status === 'draft' && hasVideo && acc?.tiktok_access_token;

          return (
            <div key={item.id} className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                {/* Account avatar */}
                {acc?.avatar_url ? (
                  <Image src={acc.avatar_url} alt={acc.platform_username} width={36} height={36}
                    className="rounded-full object-cover shrink-0 mt-0.5" unoptimized />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    {acc ? acc.platform_username.replace('@', '').slice(0, 1).toUpperCase() : '?'}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm text-muted-foreground">{acc?.platform_username ?? 'Unknown'}</span>
                        {acc?.niche && (
                          <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">{acc.niche}</span>
                        )}
                        {acc?.tone && (
                          <span className="rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5 capitalize">{acc.tone}</span>
                        )}
                        <span className="text-xs text-muted-foreground">· {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 gap-1.5 flex-wrap justify-end">
                      {item.status === 'draft' && (
                        <>
                          {/* Upload video */}
                          <Button
                            size="sm"
                            variant={hasVideo ? 'outline' : 'secondary'}
                            onClick={() => triggerUpload(item.id)}
                            disabled={uploading === item.id}
                            title={hasVideo ? 'Replace video' : 'Upload video'}
                          >
                            {uploading === item.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Upload className="h-3.5 w-3.5" />
                            }
                            <span className="ml-1.5 text-xs">{hasVideo ? 'Replace' : 'Upload video'}</span>
                          </Button>

                          {/* Runway AI Video */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => heygenGenerating === item.id ? null : handleRunway(item.id)}
                            disabled={heygenGenerating === item.id}
                            title="Generate AI video from script (Runway Gen-4)"
                          >
                            {heygenGenerating === item.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Sparkles className="h-3.5 w-3.5" />
                            }
                            <span className="ml-1.5 text-xs">
                              {heygenGenerating === item.id ? (heygenStatus[item.id] ?? 'Generating...') : 'AI Video'}
                            </span>
                          </Button>

                          {/* HeyGen Avatar */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => heygenGenerating === item.id ? null : setHeygenModalTarget(item.id)}
                            disabled={heygenGenerating === item.id}
                            title="Generate talking-head avatar video (HeyGen)"
                          >
                            <Bot className="h-3.5 w-3.5" />
                            <span className="ml-1.5 text-xs">Avatar</span>
                          </Button>

                          {/* Schedule */}
                          {hasVideo && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.location.href = '/scheduler';
                              }}
                              title="Schedule for auto-posting"
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              <span className="ml-1.5 text-xs">Schedule</span>
                            </Button>
                          )}

                          {/* Repurpose for other platforms */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              window.location.href = `/distribute?content=${item.id}`;
                            }}
                            title="Repurpose for YouTube Shorts, Instagram Reels, etc."
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="ml-1.5 text-xs">Repurpose</span>
                          </Button>

                          {/* Add Captions */}
                          {hasVideo && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCaption(item.id)}
                              disabled={isCaptioning}
                              title={hasCaptions ? 'Re-render captions' : 'Burn subtitles into video'}
                            >
                              {isCaptioning
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="ml-1.5 text-xs">{capProgress > 0 ? `${capProgress}%` : 'Starting…'}</span></>
                                : <><Captions className="h-3.5 w-3.5" /><span className="ml-1.5 text-xs">{hasCaptions ? 'Re-caption' : 'Add Captions'}</span></>
                              }
                            </Button>
                          )}

                          {/* Preview video */}
                          {hasVideo && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(item.id)}
                              disabled={previewLoading === item.id}
                              title="Preview video"
                            >
                              {previewLoading === item.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Eye className="h-3.5 w-3.5" />
                              }
                              <span className="ml-1.5 text-xs">Preview</span>
                            </Button>
                          )}

                          {/* Publish */}
                          <Button
                            size="sm"
                            onClick={() => handlePublish(item.id)}
                            disabled={publishing === item.id || !canPublish}
                            title={!hasVideo ? 'Upload a video first' : !acc?.tiktok_access_token ? 'Connect TikTok first' : 'Post to TikTok'}
                          >
                            {publishing === item.id
                              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              : <Play className="mr-1.5 h-3.5 w-3.5" />
                            }
                            <span className="text-xs">Publish</span>
                          </Button>
                        </>
                      )}

                      {item.status === 'published' && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Published
                        </span>
                      )}

                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Video status */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {hasVideo ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <Video className="h-3.5 w-3.5" />
                        Video attached
                      </span>
                    ) : item.status === 'draft' ? (
                      <span className="text-xs text-amber-600">No video — upload or generate one to publish</span>
                    ) : null}

                    {!acc?.tiktok_access_token && item.status === 'draft' && (
                      <span className="text-xs text-muted-foreground">· TikTok not connected</span>
                    )}
                  </div>

                  {/* Publish result feedback */}
                  {result && (
                    <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${result.ok ? 'text-green-600' : 'text-destructive'}`}>
                      {result.ok
                        ? <><CheckCircle2 className="h-3.5 w-3.5" />{result.msg}</>
                        : <><AlertCircle className="h-3.5 w-3.5" />{result.msg}</>
                      }
                    </div>
                  )}

                  {/* Caption result feedback */}
                  {capResult && (
                    <div className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${capResult.ok ? 'text-green-600' : 'text-destructive'}`}>
                      {capResult.ok
                        ? <><CheckCircle2 className="h-3.5 w-3.5" />{capResult.msg}</>
                        : <><AlertCircle className="h-3.5 w-3.5" />{capResult.msg}</>
                      }
                    </div>
                  )}
                  {hasCaptions && !capResult && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <Captions className="h-3.5 w-3.5" />
                      Captions burned in
                    </div>
                  )}

                  {item.script && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.script}</p>
                  )}
                  {caption && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1 italic">{caption}</p>
                  )}
                  {(item.engagement_metrics as { views?: number } | null)?.views != null && (
                    <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {((item.engagement_metrics as { views?: number })?.views ?? 0).toLocaleString()} views
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HeyGen avatar picker modal */}
      {heygenModalTarget && (
        <HeyGenAvatarModal
          onClose={() => setHeygenModalTarget(null)}
          onGenerate={(avatarId, voiceId) => handleHeyGen(heygenModalTarget, avatarId, voiceId)}
          generating={heygenGenerating === heygenModalTarget}
          statusText={heygenStatus[heygenModalTarget] ?? 'Generating...'}
        />
      )}

      {/* Video preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Label + close */}
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-white text-sm font-medium">
                {previewCaptioned ? 'Captioned preview' : 'Video preview'}
                {previewCaptioned && (
                  <span className="ml-2 rounded-full bg-green-500/20 text-green-400 text-xs px-2 py-0.5">Captions burned in</span>
                )}
              </span>
              <button
                className="text-white/70 hover:text-white transition-colors ml-4"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Phone shell */}
            <div
              className="relative bg-black rounded-[3rem] shadow-2xl"
              style={{
                width: '300px',
                aspectRatio: '9/19.5',
                border: '8px solid #1a1a1a',
                boxShadow: '0 0 0 2px #333, 0 30px 80px rgba(0,0,0,0.8)',
              }}
            >
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />

              {/* Side buttons */}
              <div className="absolute -left-3 top-20 w-1.5 h-8 bg-[#333] rounded-l-sm" />
              <div className="absolute -left-3 top-32 w-1.5 h-10 bg-[#333] rounded-l-sm" />
              <div className="absolute -left-3 top-44 w-1.5 h-10 bg-[#333] rounded-l-sm" />
              <div className="absolute -right-3 top-28 w-1.5 h-14 bg-[#333] rounded-r-sm" />

              {/* Screen */}
              <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-black">
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-muted-foreground">Manage your TikTok content</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Content
        </Button>
      </div>

      {/* Info banner about video publishing */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-4 pb-4">
          <ExternalLink className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-primary/80">
            To publish to TikTok: upload a video to a draft, then click <strong>Publish</strong>.
            AI captions & hashtags are sent automatically. Videos post as <strong>private</strong> by default — change visibility in the TikTok app.
          </p>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Content</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                    required
                  >
                    <option value="">Select account...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.platform_username}{a.niche ? ` — ${a.niche}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Script</label>
                  <Button type="button" variant="outline" size="sm" onClick={handleGenerateScript} disabled={generating || !title}>
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate with AI
                  </Button>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Write or paste your script here..."
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Draft
                </Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Content Library</CardTitle>
          <CardDescription>Total: {content.length} pieces of content</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="draft">
            <TabsList>
              <TabsTrigger value="draft">Drafts ({byStatus('draft').length})</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled ({byStatus('scheduled').length})</TabsTrigger>
              <TabsTrigger value="published">Published ({byStatus('published').length})</TabsTrigger>
            </TabsList>
            <TabsContent value="draft">
              <ContentList items={byStatus('draft')} emptyMsg="No drafts yet. Generate content from the Trends page." />
            </TabsContent>
            <TabsContent value="scheduled">
              <ContentList items={byStatus('scheduled')} emptyMsg="No scheduled content." />
            </TabsContent>
            <TabsContent value="published">
              <ContentList items={byStatus('published')} emptyMsg="No published content yet." />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
