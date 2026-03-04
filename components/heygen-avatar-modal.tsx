'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Play, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Avatar {
  avatar_id: string;
  name: string;
  gender: string;
  preview_image: string;
  preview_video: string;
}

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  preview_audio: string;
}

interface Props {
  onClose: () => void;
  onGenerate: (avatarId: string, voiceId: string) => void;
  generating: boolean;
  statusText: string;
}

export default function HeyGenAvatarModal({ onClose, onGenerate, generating, statusText }: Props) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [previewingVideo, setPreviewingVideo] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/heygen?type=avatars')
      .then((r) => r.json())
      .then((d) => { setAvatars(d.avatars ?? []); setLoadingAvatars(false); });
    fetch('/api/heygen?type=voices')
      .then((r) => r.json())
      .then((d) => { setVoices(d.voices ?? []); setLoadingVoices(false); });
  }, []);

  function previewAudio(url: string) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
  }

  const filteredAvatars = genderFilter === 'all'
    ? avatars
    : avatars.filter((a) => a.gender === genderFilter);

  const filteredVoices = selectedAvatar
    ? voices.filter((v) => v.gender === selectedAvatar.gender)
    : voices;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Generate AI Avatar Video</h2>
            <p className="text-sm text-muted-foreground">Pick an avatar and voice — your script will be read aloud</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Avatar picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Choose Avatar {selectedAvatar && <span className="text-muted-foreground font-normal">— {selectedAvatar.name}</span>}</h3>
              <div className="flex gap-1">
                {(['all', 'female', 'male'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                      genderFilter === g
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {loadingAvatars ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {filteredAvatars.map((avatar) => (
                  <div
                    key={avatar.avatar_id}
                    onClick={() => { setSelectedAvatar(avatar); setSelectedVoice(null); }}
                    className={`relative rounded-lg overflow-hidden aspect-[3/4] border-2 transition-all group cursor-pointer ${
                      selectedAvatar?.avatar_id === avatar.avatar_id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-transparent hover:border-border'
                    }`}
                    title={avatar.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar.preview_image}
                      alt={avatar.name}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    {/* Play button — bottom-right corner only, not full overlay */}
                    <button
                      className="absolute bottom-5 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      onClick={(e) => { e.stopPropagation(); setPreviewingVideo(avatar.preview_video); }}
                      title="Preview video"
                    >
                      <Play className="h-3 w-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-1">
                      <p className="text-white text-[9px] leading-tight truncate">{avatar.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voice picker — only shown once avatar is selected */}
          {selectedAvatar && (
            <div>
              <h3 className="text-sm font-medium mb-3">
                Choose Voice {selectedVoice && <span className="text-muted-foreground font-normal">— {selectedVoice.name}</span>}
              </h3>
              {loadingVoices ? (
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredVoices.map((voice) => (
                    <button
                      key={voice.voice_id}
                      onClick={() => setSelectedVoice(voice)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedVoice?.voice_id === voice.voice_id
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className="truncate text-left">{voice.name}</span>
                      {voice.preview_audio && (
                        <button
                          onClick={(e) => { e.stopPropagation(); previewAudio(voice.preview_audio); }}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          title="Preview voice"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">
            {generating
              ? statusText
              : !selectedAvatar
              ? 'Step 1: select an avatar above'
              : !selectedVoice
              ? '↓ Step 2: scroll down and pick a voice'
              : 'Ready — click Generate Video'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
            <Button
              onClick={() => selectedAvatar && selectedVoice && onGenerate(selectedAvatar.avatar_id, selectedVoice.voice_id)}
              disabled={!selectedAvatar || !selectedVoice || generating}
            >
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{statusText}</>
                : 'Generate Video'
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Avatar video preview overlay */}
      {previewingVideo && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/90"
          style={{ zIndex: 9999 }}
          onClick={(e) => { e.stopPropagation(); setPreviewingVideo(null); }}
        >
          <video
            src={previewingVideo}
            autoPlay
            loop
            className="max-h-[70vh] rounded-lg"
            style={{ aspectRatio: '3/4', maxWidth: '240px' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setPreviewingVideo(null); }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
