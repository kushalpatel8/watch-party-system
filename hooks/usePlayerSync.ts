'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { toast } from '@/store/toastStore';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

const DRIFT_THRESHOLD = 1.5; // seconds

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    // Polling fallback to ensure promise resolves if event already fired
    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        resolve();
      }
    }, 50);

    const existing = document.getElementById('yt-iframe-api');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      clearInterval(interval);
      resolve();
    };
  });
}

interface UsePlayerSyncOptions {
  containerId: string;
  canControl: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
}

export function usePlayerSync({ containerId, canControl, onPlay, onPause, onSeek }: UsePlayerSyncOptions) {
  const playerRef = useRef<any>(null);
  const suppressRef = useRef(false);
  const readyRef = useRef(false);
  const syncState = useRoomStore((s) => s.syncState);
  const prevVideoId = useRef<string | null>(null);
  const pendingSyncRef = useRef<typeof syncState>(null);

  // Keep references updated without triggering player re-creation
  const canControlRef = useRef(canControl);
  canControlRef.current = canControl;

  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;

  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;

  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  // ── Init player ───────────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    async function init() {
      await loadYTApi();
      if (destroyed) return;

      const container = document.getElementById(containerId);
      if (!container) return;

      // Clean existing inner node without destroying the React container
      container.innerHTML = '';
      const innerDiv = document.createElement('div');
      innerDiv.style.width = '100%';
      innerDiv.style.height = '100%';
      container.appendChild(innerDiv);

      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
        readyRef.current = false;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;

      playerRef.current = new window.YT.Player(innerDiv, {
        height: '100%',
        width: '100%',
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          disablekb: 1,
          fs: 0,
          origin,
          widget_referrer: origin,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            readyRef.current = true;

            // Apply active syncState from store or queue
            const state = useRoomStore.getState().syncState || pendingSyncRef.current;
            if (state?.videoId) {
              prevVideoId.current = state.videoId;
              suppressRef.current = true;

              const livePos =
                state.playState === 'playing'
                  ? state.currentTime + (Date.now() - state.updatedAt) / 1000
                  : state.currentTime;

              try {
                playerRef.current?.loadVideoById({
                  videoId: state.videoId,
                  startSeconds: Math.max(0, livePos),
                });
              } catch (_) {}

              if (state.playState === 'playing') {
                try {
                  playerRef.current?.playVideo();
                } catch (_) {}
                setTimeout(() => {
                  suppressRef.current = false;
                }, 500);
              } else {
                setTimeout(() => {
                  try {
                    playerRef.current?.pauseVideo();
                  } catch (_) {}
                  suppressRef.current = false;
                }, 800);
              }
              pendingSyncRef.current = null;
            }
          },
          onStateChange: (e: any) => {
            if (suppressRef.current) return;
            if (!canControlRef.current) return;

            const YT = window.YT;
            if (e.data === YT?.PlayerState?.PLAYING) {
              onPlayRef.current?.();
            } else if (e.data === YT?.PlayerState?.PAUSED) {
              onPauseRef.current?.();
            } else if (e.data === YT?.PlayerState?.ENDED) {
              onPauseRef.current?.();
            }
          },
          onError: (e: any) => {
            const code = e?.data;
            if (code === 101 || code === 150) {
              toast.error(
                'Embedding Disabled',
                'The owner of this video has disabled playback on external websites. Please try another video.'
              );
            } else if (code === 100) {
              toast.error('Video Not Found', 'This video has been removed or is marked as private.');
            } else if (code === 2) {
              toast.error('Invalid Video ID', 'The requested YouTube video ID is invalid.');
            } else {
              console.warn('[YouTube Player] Error event:', code);
            }
          },
        },
      });
    }

    init();

    return () => {
      destroyed = true;
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
        readyRef.current = false;
      }
    };
  }, [containerId]);

  // ── Apply sync_state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!syncState) return;

    // Player not ready yet — queue it; onReady will apply it
    if (!readyRef.current || !playerRef.current) {
      pendingSyncRef.current = syncState;
      return;
    }

    const player = playerRef.current;

    const livePos =
      syncState.playState === 'playing'
        ? syncState.currentTime + (Date.now() - syncState.updatedAt) / 1000
        : syncState.currentTime;

    // Video changed
    if (syncState.videoId && syncState.videoId !== prevVideoId.current) {
      prevVideoId.current = syncState.videoId;
      suppressRef.current = true;
      try {
        player.loadVideoById({
          videoId: syncState.videoId,
          startSeconds: Math.max(0, livePos),
        });
      } catch (_) {}

      if (syncState.playState === 'playing') {
        try {
          player.playVideo();
        } catch (_) {}
        setTimeout(() => {
          suppressRef.current = false;
        }, 500);
      } else {
        setTimeout(() => {
          try {
            player.pauseVideo();
          } catch (_) {}
          suppressRef.current = false;
        }, 800);
      }
      return;
    }

    // Drift correction and playback state sync
    const current = player.getCurrentTime?.() ?? 0;
    const drift = Math.abs(current - livePos);

    suppressRef.current = true;
    if (drift > DRIFT_THRESHOLD) {
      try {
        player.seekTo(livePos, true);
      } catch (_) {}
    }

    if (syncState.playState === 'playing') {
      try {
        player.playVideo();
      } catch (_) {}
    } else {
      try {
        player.pauseVideo();
      } catch (_) {}
    }

    setTimeout(() => {
      suppressRef.current = false;
    }, 300);
  }, [syncState]);

  const getCurrentTime = useCallback(() => playerRef.current?.getCurrentTime?.() ?? 0, []);

  return { playerRef, getCurrentTime, readyRef };
}

