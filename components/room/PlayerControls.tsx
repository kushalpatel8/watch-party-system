'use client';

import { useState, useRef } from 'react';
import { getSocket } from '@/lib/socket-client';
import { useRoom } from '@/hooks/useRoom';
import { Play, Pause, SkipForward } from 'lucide-react';

interface PlayerControlsProps {
  getCurrentTime?: () => number;
}

export function PlayerControls({ getCurrentTime }: PlayerControlsProps) {
  const { canControl, myRole, syncState } = useRoom();
  const socket = getSocket();

  function play() {
    socket.emit('play', {});
  }
  function pause() {
    socket.emit('pause', {});
  }

  const isPlaying = syncState?.playState === 'playing';

  if (!canControl) {
    return (
      <p className="text-xs text-muted-foreground text-center py-1">
        Controls are available to Host and Moderators only.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        id="player-toggle-btn"
        onClick={isPlaying ? pause : play}
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 flex items-center justify-center text-slate-950 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 ml-0.5 fill-slate-950" />}
      </button>
    </div>
  );
}
