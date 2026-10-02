'use client';

import { useState } from 'react';
import { getSocket } from '@/lib/socket-client';
import { parseYouTubeUrl } from '@/lib/youtube';
import { Link, Check } from 'lucide-react';

import { useRoomStore } from '@/store/roomStore';
import { toast } from '@/store/toastStore';

interface VideoUrlInputProps {
  disabled?: boolean;
}

export function VideoUrlInput({ disabled }: VideoUrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const roomId = useRoomStore((s) => s.roomId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a YouTube video URL or ID.');
      return;
    }
    const videoId = parseYouTubeUrl(trimmed);
    if (!videoId) {
      setError('Invalid YouTube link or ID. Please check the URL.');
      return;
    }

    // 1. Immediately apply to local store & player for instant response
    useRoomStore.getState().setSyncState({
      videoId,
      playState: 'playing',
      currentTime: 0,
      updatedAt: Date.now(),
    });

    // 2. Emit WebSocket event if connected
    try {
      const socket = getSocket();
      socket.emit('change_video', { videoId });
    } catch (_) {}

    // 3. Persist to MongoDB via REST API as fallback
    if (roomId) {
      fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      }).catch((err) => console.warn('[VideoUrlInput] REST update error:', err));
    }

    toast.success('Video Loaded! 🎬', 'Video playback starting...');
    setUrl('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex-1 min-w-0">
          <Link className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-400 dark:text-white/40 pointer-events-none" />
          <input
            id="video-url-input"
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="Paste YouTube Video URL or ID…"
            disabled={disabled}
            className="w-full pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-1.5 sm:py-2 rounded-xl bg-[#f8f6f0] dark:bg-[#1e293b] border border-stone-300/90 dark:border-white/10 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-white/40 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:shadow-[0_0_12px_rgba(232,137,12,0.2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:to-amber-500 text-white dark:text-slate-950 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-[0_4px_14px_rgba(232,137,12,0.3)] dark:shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95 shrink-0"
        >
          {success ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : 'Load Video'}
        </button>
      </div>
      {error && <p className="text-rose-600 dark:text-rose-400 text-[10px] sm:text-[11px] px-1 font-medium">{error}</p>}
    </form>
  );
}
