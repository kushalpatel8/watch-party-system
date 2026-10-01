'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/store/roomStore';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

const DRIFT_THRESHOLD = 1.5; // seconds

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById('yt-iframe-api');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    // Chain callbacks in case something else registered first
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
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

      playerRef.current = new window.YT.Player(innerDiv, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
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

              playerRef.current?.loadVideoById({
                videoId: state.videoId,
                startSeconds: Math.max(0, livePos),
              });

              if (state.playState === 'playing') {
                playerRef.current?.playVideo();
                setTimeout(() => {
                  suppressRef.current = false;
                }, 500);
              } else {
                setTimeout(() => {
                  playerRef.current?.pauseVideo();
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
      player.loadVideoById({
        videoId: syncState.videoId,
        startSeconds: Math.max(0, livePos),
      });

      if (syncState.playState === 'playing') {
        player.playVideo();
        setTimeout(() => {
          suppressRef.current = false;
        }, 500);
      } else {
        setTimeout(() => {
          player.pauseVideo();
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
      player.seekTo(livePos, true);
    }

    if (syncState.playState === 'playing') {
      player.playVideo();
    } else {
      player.pauseVideo();
    }

    setTimeout(() => {
      suppressRef.current = false;
    }, 300);
  }, [syncState]);

  const getCurrentTime = useCallback(() => playerRef.current?.getCurrentTime?.() ?? 0, []);

  return { playerRef, getCurrentTime, readyRef };
}

