'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerSync } from '@/hooks/usePlayerSync';
import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket-client';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Share2, MonitorPlay } from 'lucide-react';
import { copyToClipboard } from '@/lib/permissions';

interface YouTubePlayerProps {
  roomId: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function YouTubePlayer({ roomId }: YouTubePlayerProps) {
  const { canControl, syncState } = useRoom();
  const [autoplayClicked, setAutoplayClicked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const socket = getSocket();
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const { playerRef, readyRef } = usePlayerSync({
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

  const isPlaying = syncState?.playState === 'playing';
  const noVideo = !syncState?.videoId;

  // Periodic poll for time & duration
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && readyRef.current) {
        try {
          const cur = playerRef.current.getCurrentTime?.() || 0;
          const dur = playerRef.current.getDuration?.() || 0;
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        } catch (_) {}
      }
    }, 500);
    return () => clearInterval(timer);
  }, [playerRef, readyRef]);

  function handleTogglePlay() {
    setAutoplayClicked(true);
    if (!canControl) return;
    if (isPlaying) {
      socket.emit('pause', {});
    } else {
      socket.emit('play', {});
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    setAutoplayClicked(true);
    if (!canControl) return;
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    socket.emit('seek', { time: target });
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(val);
      if (val > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  }

  function toggleMute() {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute?.();
      setIsMuted(false);
    } else {
      playerRef.current.mute?.();
      setIsMuted(true);
    }
  }

  function toggleFullscreen() {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/room/${roomId}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={playerContainerRef}
      className="relative aspect-video w-full max-w-full h-auto max-h-[36dvh] lg:max-h-full rounded-xl sm:rounded-2xl overflow-hidden bg-black cyber-player-frame flex flex-col justify-between group select-none shrink-0 lg:shrink"
    >
      {/* The IFrame API target */}
      <div id="yt-player" className={`absolute inset-0 w-full h-full ${!canControl ? 'pointer-events-none' : ''}`} />

      {/* Top overlay bar */}
      <div className="relative z-10 p-2.5 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/30 text-[10px] sm:text-xs font-mono font-medium text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-white/40'}`} />
            <span className="truncate">{syncState?.videoId ? (isPlaying ? 'SYNCING PLAYBACK' : 'PAUSED') : 'NO VIDEO LOADED'}</span>
          </span>
        </div>
        <button
          onClick={handleShare}
          className="p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white/80 hover:text-amber-300 transition-all pointer-events-auto backdrop-blur-sm cursor-pointer active:scale-95"
          title="Share Video Link"
        >
          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Center: No video placeholder */}
      {noVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-4 text-muted-foreground pointer-events-none z-10 p-4 text-center">
          <MonitorPlay className="w-10 h-10 sm:w-16 sm:h-16 opacity-30 text-amber-400" />
          <p className="text-xs sm:text-sm opacity-60 max-w-xs sm:max-w-md">
            {canControl ? 'Paste a YouTube URL below to start watching' : 'Waiting for the host to load a video…'}
          </p>
        </div>
      )}

      {/* Center: Click to join playback overlay */}
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
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-3 bg-black/60 z-20 group transition-all hover:bg-black/50 cursor-pointer"
        >
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center group-hover:scale-110 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] animate-pulse-ring">
            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-amber-300 ml-0.5 sm:ml-1 fill-amber-300" />
          </div>
          <p className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">Click to join playback</p>
        </button>
      )}

      {/* Bottom Controls Bar */}
      <div className="relative z-10 p-2 sm:p-3 pt-4 sm:pt-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-1.5 sm:gap-2 opacity-95 group-hover:opacity-100 transition-opacity">
        {/* Scrubber Progress Bar */}
        <div className="relative w-full flex items-center h-3 sm:h-2 group/scrub cursor-pointer">
          <div className="absolute left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Draggable slider */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!canControl}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
          />
          {/* Thumb circle */}
          <div
            className="absolute w-3.5 h-3.5 bg-amber-300 border border-white rounded-full shadow-[0_0_8px_#f59e0b] -translate-x-1/2 pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Buttons and Time */}
        <div className="flex items-center justify-between text-white/90">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause */}
            <button
              onClick={handleTogglePlay}
              disabled={!canControl}
              className={`p-1 sm:p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-white/10 transition-all active:scale-90 ${
                !canControl ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400" />}
            </button>

            {/* Time */}
            <span className="text-[10px] sm:text-xs font-mono font-medium text-white/80 whitespace-nowrap">
              <span className="text-amber-300 font-bold">{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </span>
          </div>

          {/* Right actions: Volume, Settings, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Volume */}
            <div className="flex items-center gap-1 sm:gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1 sm:p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-90"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="hidden sm:block w-14 sm:w-16 h-1 accent-amber-400 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>

            {/* Settings */}
            <button
              className="hidden xs:flex p-1 sm:p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 rounded-lg text-white/70 hover:text-amber-300 hover:bg-white/10 transition-all cursor-pointer active:scale-90"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
