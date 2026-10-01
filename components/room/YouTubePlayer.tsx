'use client';

import { useRef, useState } from 'react';
import { usePlayerSync } from '@/hooks/usePlayerSync';
import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket-client';
import { Play, Pause, SkipBack, Volume2, MonitorPlay } from 'lucide-react';

interface YouTubePlayerProps {
  roomId: string;
}

export function YouTubePlayer({ roomId }: YouTubePlayerProps) {
  const { canControl, syncState } = useRoom();
  const [autoplayClicked, setAutoplayClicked] = useState(false);
  const socket = getSocket();

  const { playerRef, getCurrentTime, readyRef } = usePlayerSync({
    containerId: 'yt-player',
    canControl,
    onPlay: () => {
      if (canControl) socket.emit('play', {});
    },
    onPause: () => {
      if (canControl) socket.emit('pause', {});
    },
    onSeek: (time) => {
      if (canControl) socket.emit('seek', { time });
    },
  });

  const noVideo = !syncState?.videoId;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10">
      {/* The IFrame API target */}
      <div id="yt-player" className={`absolute inset-0 w-full h-full ${!canControl ? 'pointer-events-none' : ''}`} />

      {/* No video placeholder */}
      {noVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground pointer-events-none">
          <MonitorPlay className="w-16 h-16 opacity-30" />
          <p className="text-sm opacity-60">
            {canControl ? 'Paste a YouTube URL to get started' : 'Waiting for the host to load a video…'}
          </p>
        </div>
      )}

      {/* Click to join playback overlay (autoplay policy) */}
      {!autoplayClicked && syncState?.videoId && (
        <button
          onClick={() => {
            setAutoplayClicked(true);
            if (syncState.playState === 'playing') {
              playerRef.current?.playVideo?.();
            } else {
              playerRef.current?.pauseVideo?.();
            }
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 z-10 group transition-all hover:bg-black/40"
        >
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all animate-pulse-ring">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
          <p className="text-white/80 text-sm">Click to join playback</p>
        </button>
      )}
    </div>
  );
}
