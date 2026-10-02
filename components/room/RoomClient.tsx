'use client';

import { useState } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useRoom } from '@/hooks/useRoom';
import { YouTubePlayer } from '@/components/room/YouTubePlayer';
import { VideoUrlInput } from '@/components/room/VideoUrlInput';
import { ParticipantList } from '@/components/room/ParticipantList';
import { ChangeRequestPanel } from '@/components/room/ChangeRequestPanel';
import { Chat } from '@/components/room/Chat';
import { ReactionBar } from '@/components/room/ReactionBar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { toast } from '@/store/toastStore';
import { getSocket } from '@/lib/socket-client';
import {
  Copy,
  Check,
  Play,
  Share2,
  Info,
  X,
  Send,
  Users,
  MessageSquare,
  LogOut,
  AlertTriangle,
} from 'lucide-react';

import { useEffect } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { copyToClipboard } from '@/lib/permissions';
import type { ParticipantInfo, SyncState } from '@/types/events';

interface RoomClientProps {
  roomId: string;
  initialHostId?: string;
  initialVideoId?: string | null;
  initialSyncState?: SyncState;
  initialParticipants?: ParticipantInfo[];
  isCreator?: boolean;
  currentUserId?: string;
}

export function RoomClient({
  roomId,
  initialHostId,
  initialVideoId,
  initialSyncState,
  initialParticipants,
  isCreator,
  currentUserId,
}: RoomClientProps) {
  const { isSignedIn, userId: authUserId } = useAuth();
  const router = useRouter();
  const [linkCopied, setLinkCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'viewers'>('chat');

  // Seed initial room data from SSR so all participants, host privileges & video are instant
  useEffect(() => {
    const store = useRoomStore.getState();
    const effectiveUserId = currentUserId || authUserId;
    if (effectiveUserId) {
      store.setMyUserId(effectiveUserId);
    }
    if (initialParticipants && initialParticipants.length > 0) {
      store.setParticipants(initialParticipants);
    } else if (store.participants.length === 0 && effectiveUserId) {
      const isUserHost = isCreator || (effectiveUserId && initialHostId === effectiveUserId);
      store.setParticipants([
        {
          userId: effectiveUserId,
          username: isUserHost ? 'You (Host)' : 'You',
          role: isUserHost ? 'Host' : 'Participant',
          joinedAt: Date.now(),
        },
      ]);
    }
    if (initialSyncState) {
      store.setSyncState(initialSyncState);
    } else if (!store.syncState?.videoId) {
      const vid = initialVideoId || 'VuG7ge_8I2Y';
      store.setSyncState({
        videoId: vid,
        playState: 'paused',
        currentTime: 0,
        updatedAt: Date.now(),
      });
    }
  }, [roomId, initialHostId, initialVideoId, initialSyncState, isCreator, currentUserId, authUserId, initialParticipants]);

  // Connect socket and sync store
  useSocket(roomId);

  const { connected, canControl: hookCanControl, myRole, isHost: hookIsHost, isModerator: hookIsMod, pendingRequests, syncState, participants } = useRoom();
  const effectiveUserId = currentUserId || authUserId;
  const me = participants.find((p) => p.userId === effectiveUserId);
  const isEffectiveHost = me
    ? me.role === 'Host'
    : isCreator || (Boolean(effectiveUserId) && initialHostId === effectiveUserId) || hookIsHost;
  const isEffectiveModerator = me ? me.role === 'Moderator' : hookIsMod;

  // STRICT RULE: Only Host and Moderator can control playback and load videos
  const canControl = isEffectiveHost || isEffectiveModerator;
  const effectiveRole = isEffectiveHost ? 'Host' : isEffectiveModerator ? 'Moderator' : 'Participant';

  // Send leave notification on tab/window close
  useEffect(() => {
    const handleUnload = () => {
      if (effectiveUserId && roomId) {
        try {
          fetch(`/api/rooms/${roomId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leaveUserId: effectiveUserId }),
            keepalive: true,
          }).catch(() => {});
        } catch (_) {}
      }
    };
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [roomId, effectiveUserId]);

  async function handleCopyRoomId() {
    const success = await copyToClipboard(roomId);
    if (success) {
      setIdCopied(true);
      toast.success('Room Code Copied!', `Room #${roomId} copied to clipboard.`);
      setTimeout(() => setIdCopied(false), 2000);
    }
  }

  async function handleCopyShareLink() {
    const url = `${window.location.origin}/room/${roomId}`;
    const success = await copyToClipboard(url);
    if (success) {
      setLinkCopied(true);
      toast.success('Invite Link Copied!', 'Room invite link copied to clipboard.');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  async function handleLeaveRoom() {
    try {
      const socket = getSocket();
      socket.emit('leave_room', { roomId });
    } catch (err) {
      console.error('Error emitting leave_room:', err);
    }
    if (effectiveUserId && roomId) {
      try {
        fetch(`/api/rooms/${roomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leaveUserId: effectiveUserId }),
          keepalive: true,
        }).catch(() => {});
      } catch (_) {}
    }
    router.push('/');
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#fcfaf7] dark:bg-[#1e293b] text-stone-900 dark:text-white p-4">
        <p className="text-stone-600 dark:text-white/60 text-sm">Please sign in to join this room.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-hidden bg-[#fcfaf7] dark:bg-[#1e293b] text-stone-900 dark:text-white flex flex-col font-sans transition-colors duration-200 select-none">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="h-12 sm:h-14 px-2.5 sm:px-5 border-b border-stone-200/80 dark:border-white/5 bg-[#fcfaf7]/90 dark:bg-[#1e293b]/90 backdrop-blur-md flex-shrink-0 z-30 flex items-center justify-between transition-colors duration-200 gap-2">
        {/* Left: Brand / Logo */}
        <button
          onClick={() => setShowLeaveModal(true)}
          className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 active:scale-95 transition-all text-left cursor-pointer group shrink-0"
          title="Return to Home (Leave Room)"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-[#1c1917] to-[#292524] dark:from-amber-500 dark:to-yellow-400 flex items-center justify-center shadow-xs border border-stone-700/50 dark:border-transparent shrink-0">
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 dark:text-slate-950 fill-amber-400 dark:fill-slate-950 ml-0.5" />
          </div>
          <span className="font-black text-xs sm:text-base tracking-wide text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors uppercase">
            SyncTube
          </span>
        </button>

        {/* Center: Room ID Pill (Adaptive for mobile & desktop) */}
        <button
          onClick={handleCopyRoomId}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white dark:bg-[#253248] border border-stone-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/40 hover:bg-amber-50/40 dark:hover:bg-[#2d3c56] cursor-pointer transition-all group shadow-xs active:scale-95 shrink-0"
          title="Click to copy Room Code"
        >
          <span className="text-[11px] sm:text-xs font-mono font-medium text-stone-700 dark:text-white/80 group-hover:text-stone-900 dark:group-hover:text-amber-300 transition-colors">
            <span className="hidden sm:inline">Room ID: </span>
            <span className="text-stone-900 dark:text-white font-bold">#{roomId}</span>
          </span>
          {idCopied ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Check className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copied!</span>
            </span>
          ) : (
            <Copy className="w-3.5 h-3.5 text-stone-400 dark:text-white/40 group-hover:text-amber-600 dark:group-hover:text-amber-300" />
          )}
        </button>

        {/* Right: Actions (Theme Toggle, Room Info, Share Link, Leave Room, User Profile) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white dark:bg-[#253248] hover:bg-stone-50 dark:hover:bg-[#2d3c56] border border-stone-200 dark:border-white/10 text-xs font-medium text-stone-800 dark:text-white/80 hover:text-stone-900 dark:hover:text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            title="Room Information"
          >
            <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Room Info</span>
          </button>

          <button
            onClick={handleCopyShareLink}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white dark:bg-[#253248] hover:bg-stone-50 dark:hover:bg-[#2d3c56] border border-stone-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/30 text-xs font-medium text-stone-800 dark:text-white/80 hover:text-stone-900 dark:hover:text-white transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
            title="Copy Shareable Link"
          >
            {linkCopied ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <Check className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copied!</span>
              </span>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* 🚪 Leave Room Button */}
          <button
            id="leave-room-btn"
            onClick={() => setShowLeaveModal(true)}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 hover:border-rose-300 dark:hover:border-rose-500/50 text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
            title="Leave this watch party"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="hidden sm:inline">Leave</span>
          </button>

          <div className="flex items-center pl-0.5">
            <UserButton />
          </div>
        </div>
      </header>

      {/* ── Main Workspace Body (Fit to Screen - Responsive Across All Resolutions) ────────── */}
      <main className="flex-1 min-h-0 max-w-[1920px] w-full mx-auto p-1.5 sm:p-2.5 lg:p-3 xl:p-3.5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_250px_250px] xl:grid-cols-[minmax(0,1fr)_290px_290px] 2xl:grid-cols-[minmax(0,1fr)_330px_330px] gap-1.5 sm:gap-2.5 lg:gap-3 xl:gap-3.5 items-stretch overflow-hidden">
        {/* Left Column (Video Player + Bottom Controls & Reactions) */}
        <div className="flex flex-col justify-between gap-1.5 sm:gap-2 h-full min-h-0 overflow-hidden">
          {/* Video Player (Responsive Screen-Fit Frame) */}
          <div className="w-full shrink-0 flex items-center justify-center lg:flex-1 lg:min-h-0 overflow-hidden">
            <YouTubePlayer roomId={roomId} canControl={canControl} />
          </div>

          {/* Underneath Player: Controls, URL input & reactions (Aligned to Bottom) */}
          <div className="mt-auto bg-white/95 dark:bg-[#253248]/95 border border-stone-200/90 dark:border-white/5 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col gap-1 sm:gap-1.5 flex-shrink-0 shadow-xs dark:shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-colors">
            {/* Connection status indicator when connecting */}
            {!connected && (
              <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Connecting to live room sync...
                </span>
                <span className="text-[10px] text-stone-500 dark:text-white/40">Syncing WebSocket</span>
              </div>
            )}

            {/* Video URL Input for Host/Moderator, or Request Change for Viewers */}
            {canControl ? (
              <VideoUrlInput />
            ) : (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-stone-100/80 dark:bg-[#1e293b]/80 rounded-xl border border-stone-200 dark:border-white/10 text-xs">
                <span className="text-[11px] font-medium text-stone-600 dark:text-white/60 truncate">
                  Playback controlled by Host & Moderators ({effectiveRole})
                </span>
                <button
                  id="request-change-btn"
                  onClick={() => {
                    const url = prompt('Paste YouTube URL to request:');
                    if (!url) return;
                    try {
                      getSocket().emit('request_change', {
                        type: 'change_video',
                        payload: { videoId: url.trim() },
                      });
                    } catch (_) {}
                    toast.request('Request Sent 📨', 'Your video change request was sent to the Host.');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#253248] hover:bg-stone-200 dark:hover:bg-[#2d3c56] text-[11px] font-semibold text-stone-800 dark:text-white transition-all border border-stone-200 dark:border-white/10 cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <Send className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Request Video
                </button>
              </div>
            )}

            {/* Change request review (for Host/Moderator) */}
            {canControl && pendingRequests.length > 0 && (
              <div className="border-t border-stone-200 dark:border-white/5 pt-1">
                <ChangeRequestPanel />
              </div>
            )}

            {/* Reactions bar (Aligned to Bottom) */}
            <div className="border-t border-stone-200 dark:border-white/5 pt-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-bold text-stone-500 dark:text-white/50 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <span>Reactions</span>
              </span>
              <ReactionBar />
            </div>
          </div>

          {/* ── Mobile Viewers & Chat Section (Below Reactions, Fills Remaining Space, No Page Scroll) ── */}
          <div className="lg:hidden flex-1 min-h-0 overflow-hidden flex flex-col gap-1 sm:gap-1.5">
            {/* Section Switcher (Live Chat / Viewers) */}
            <div className="flex items-center p-0.5 bg-stone-200/70 dark:bg-[#1e293b] rounded-xl border border-stone-300/60 dark:border-white/10 shadow-inner shrink-0">
              <button
                onClick={() => setMobileTab('chat')}
                className={`flex-1 py-1 sm:py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileTab === 'chat'
                    ? 'bg-white dark:bg-[#253248] text-[#b45309] dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-white/60 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Chat</span>
              </button>

              <button
                onClick={() => setMobileTab('viewers')}
                className={`flex-1 py-1 sm:py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileTab === 'viewers'
                    ? 'bg-white dark:bg-[#253248] text-[#b45309] dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-white/60 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Viewers ({participants.length})</span>
              </button>
            </div>

            {/* Active Panel (Fills Remaining Screen Height - Internal Scrolling Only) */}
            <div className="flex-1 min-h-0 overflow-hidden bg-white/95 dark:bg-[#253248]/95 border border-stone-200/90 dark:border-white/5 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col shadow-xs dark:shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-colors">
              {mobileTab === 'chat' ? (
                <Chat />
              ) : (
                <ParticipantList onLeave={() => setShowLeaveModal(true)} />
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: Participants (Identical Equal Size Sidebar) */}
        <div className="hidden lg:flex w-full bg-white/95 dark:bg-[#253248]/95 border border-stone-200/90 dark:border-white/5 rounded-2xl p-3 flex-col h-full min-h-0 overflow-hidden shadow-xs dark:shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-colors">
          <ParticipantList onLeave={() => setShowLeaveModal(true)} />
        </div>

        {/* Right Column: Live Chat (Identical Equal Size Sidebar) */}
        <div className="hidden lg:flex w-full bg-white/95 dark:bg-[#253248]/95 border border-stone-200/90 dark:border-white/5 rounded-2xl p-3 flex-col h-full min-h-0 overflow-hidden shadow-xs dark:shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-colors">
          <Chat />
        </div>
      </main>

      {/* ── Room Info Modal ────────────────────────────────────────────────── */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#253248] border border-stone-200 dark:border-white/10 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 text-stone-900 dark:text-white max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-[#d97706] dark:text-amber-400 shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">Room Information</h3>
                <p className="text-xs text-stone-500 dark:text-white/50 font-mono">#{roomId}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#faf8f4] dark:bg-[#1e293b]/80 border border-stone-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-stone-600 dark:text-white/60">Room ID</span>
                <button
                  onClick={handleCopyRoomId}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#253248] hover:bg-amber-50 dark:hover:bg-amber-500/20 text-[#b45309] dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-mono font-bold transition-all cursor-pointer shadow-xs"
                >
                  <span>#{roomId}</span>
                  {idCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-[#faf8f4] dark:bg-[#1e293b]/80 border border-stone-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-stone-600 dark:text-white/60">Total Viewers</span>
                <span className="font-bold text-stone-900 dark:text-white font-mono">{participants.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf8f4] dark:bg-[#1e293b]/80 border border-stone-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-stone-600 dark:text-white/60">Your Role</span>
                <span className="font-bold text-[#d97706] dark:text-amber-400">{myRole}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf8f4] dark:bg-[#1e293b]/80 border border-stone-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-stone-600 dark:text-white/60">Connection</span>
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" /> Live WebSocket
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf8f4] dark:bg-[#1e293b]/80 border border-stone-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-stone-600 dark:text-white/60">Playback Status</span>
                <span className="capitalize font-semibold text-stone-900 dark:text-white/90">
                  {syncState?.playState ?? 'Idle'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setShowLeaveModal(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Room</span>
              </button>
              <button
                onClick={() => setShowInfoModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:via-amber-500 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 text-white dark:text-slate-950 text-xs font-bold transition-all shadow-sm dark:shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave Room Confirmation Modal ───────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#253248] border border-rose-200 dark:border-rose-500/30 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 text-stone-900 dark:text-white max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 flex items-center justify-center shadow-xs dark:shadow-[0_0_15px_rgba(244,63,94,0.3)] shrink-0">
                <LogOut className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">Leave Watch Party?</h3>
                <p className="text-xs text-stone-500 dark:text-white/50 font-mono">Room #{roomId}</p>
              </div>
            </div>

            <div className="text-xs text-stone-600 dark:text-white/70 leading-relaxed mb-6">
              {isEffectiveHost ? (
                <div className="text-amber-800 dark:text-amber-300/90 flex items-start gap-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-[#d97706] dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    You are currently the <strong>Host</strong>. When you leave, host privileges will automatically transfer to Moderator 1 (or the next viewer in line).
                  </span>
                </div>
              ) : (
                <p>
                  Are you sure you want to leave this watch party? You can rejoin anytime using the room code or invite link.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-[#1e293b] hover:bg-stone-200 dark:hover:bg-[#2d3c56] text-stone-800 dark:text-white/80 hover:text-white text-xs font-semibold transition-all border border-stone-200 dark:border-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveRoom}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition-all shadow-md dark:shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Leave Room</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
