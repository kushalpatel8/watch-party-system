'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Play,
  Users,
  Link2,
  ArrowRight,
  Zap,
  Shield,
  History,
  Trash2,
  Clock,
  Sparkles,
  AlertTriangle,
  Crown,
  X,
  RefreshCw,
  MessageSquare,
  Globe,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';

interface PastRoom {
  id: string;
  code: string;
  role: 'Host' | 'Moderator' | 'Participant';
  lastActiveAt: string;
  membersCount: number;
  currentVideoId?: string;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Create & Join state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Past rooms state
  const [pastRooms, setPastRooms] = useState<PastRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Fetch past rooms on mount / sign-in
  useEffect(() => {
    if (!isSignedIn) {
      setPastRooms([]);
      return;
    }
    fetchPastRooms();
  }, [isSignedIn]);

  async function fetchPastRooms() {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setPastRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load past rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function createRoom() {
    if (!isSignedIn) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      router.push(`/room/${data.code}`);
    } catch {
      setCreating(false);
    }
  }

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        setJoinError('Room not found. Check the code and try again.');
        setJoining(false);
        return;
      }
      router.push(`/room/${code}`);
    } catch {
      setJoinError('Something went wrong. Try again.');
      setJoining(false);
    }
  }

  async function handleClearHistory() {
    setClearing(true);
    try {
      const res = await fetch('/api/rooms', { method: 'DELETE' });
      if (res.ok) {
        setPastRooms([]);
        setShowClearModal(false);
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#fcfaf7] dark:bg-[#1e293b] text-stone-900 dark:text-white flex flex-col font-sans selection:bg-amber-200 selection:text-stone-900 dark:selection:bg-amber-400 dark:selection:text-slate-950 transition-colors duration-200 overflow-x-hidden">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 lg:px-12 border-b border-stone-200/70 dark:border-white/5 bg-[#fcfaf7]/85 dark:bg-[#1e293b]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between flex-shrink-0 transition-colors duration-200">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#1c1917] to-[#292524] dark:from-amber-500 dark:to-yellow-400 flex items-center justify-center shadow-md dark:shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all group-hover:scale-105 border border-stone-700/50 dark:border-transparent shrink-0">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 dark:text-slate-950 fill-amber-400 dark:fill-slate-950 ml-0.5" />
            </div>
            <span className="font-black text-base sm:text-lg tracking-wider text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors uppercase">
              SyncTube
            </span>
          </Link>
        </div>

        {/* Right: Actions (Theme Toggle, Sign In, Get Started, UserButton) */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {isLoaded &&
            (isSignedIn ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={createRoom}
                  disabled={creating}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:via-amber-500 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 text-white dark:text-slate-950 font-bold text-xs transition-all shadow-[0_4px_14px_rgba(232,137,12,0.3)] dark:shadow-[0_0_18px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95"
                >
                  {creating ? 'Creating…' : 'Get Started'}
                </button>
                <ThemeToggle />
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <SignInButton mode="modal">
                  <button className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white dark:bg-[#253248] hover:bg-stone-50 dark:hover:bg-[#2d3c56] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-white font-semibold text-xs transition-all shadow-xs cursor-pointer">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:via-amber-500 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 text-white dark:text-slate-950 font-bold text-xs transition-all shadow-[0_4px_14px_rgba(232,137,12,0.3)] dark:shadow-[0_0_18px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95 whitespace-nowrap">
                    Get Started
                  </button>
                </SignInButton>
                <ThemeToggle />
              </div>
            ))}
        </div>
      </header>

      {/* ── Main Hero Section (Responsive Viewport Height) ─────────────────── */}
      <section
        id="hero-fold"
        className="min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 text-center max-w-5xl w-full mx-auto my-auto"
      >
        {/* Top Tag / Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#f5efe6] dark:bg-amber-500/15 border border-amber-500/30 text-[#b45309] dark:text-amber-400 text-[11px] sm:text-xs md:text-sm font-semibold mb-3 sm:mb-5 shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.12)] max-w-full">
          <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">Your Synchronized Watch Party Sanctuary</span>
        </div>

        {/* Hero Title with Dual Keyword Gradients */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 sm:mb-4 leading-[1.15] sm:leading-[1.12] tracking-tight text-[#2a1810] dark:text-white max-w-4xl">
          Watch Together With a{' '}
          <span className="bg-gradient-to-r from-[#db2777] via-[#e11d48] to-[#f43f5e] bg-clip-text text-transparent">
            Single
          </span>{' '}
          <span className="bg-gradient-to-r from-[#f59e0b] via-[#ea580c] to-[#d97706] dark:from-slate-200 dark:via-white dark:to-amber-400 bg-clip-text text-transparent drop-shadow-xs dark:drop-shadow-[0_0_30px_rgba(245,158,11,0.35)]">
            Sync
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-[#57534e] dark:text-white/75 text-xs sm:text-sm md:text-base max-w-2xl mb-5 sm:mb-6 leading-relaxed font-normal px-2">
          Experience a revolutionary watch party sanctuary. We blend the sub-300ms accuracy of real-time WebSocket sync with the excitement of live chat, reactions, and automated host controls.
        </p>

        {/* Hero CTA Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 w-full max-w-xs sm:max-w-md justify-center">
          {isSignedIn ? (
            <button
              onClick={createRoom}
              disabled={creating}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:via-amber-500 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-[0_4px_16px_rgba(232,137,12,0.35)] dark:shadow-[0_0_25px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{creating ? 'Creating…' : 'Start Journey'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:via-amber-500 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-[0_4px_16px_rgba(232,137,12,0.35)] dark:shadow-[0_0_25px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95 flex items-center justify-center gap-2">
                <span>Start Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignInButton>
          )}

          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-[#f5f2eb] dark:bg-[#253248] hover:bg-[#eae5db] dark:hover:bg-[#2d3c56] border border-stone-200/80 dark:border-white/10 text-stone-800 dark:text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer">
                Sign In
              </button>
            </SignInButton>
          ) : (
            <button
              onClick={() => {
                const el = document.getElementById('options-section');
                el?.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => document.getElementById('join-code-input')?.focus(), 400);
              }}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-[#f5f2eb] dark:bg-[#253248] hover:bg-[#eae5db] dark:hover:bg-[#2d3c56] border border-stone-200/80 dark:border-white/10 text-stone-800 dark:text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
            >
              Join Room
            </button>
          )}
        </div>

        {/* Outline Button */}
        <button
          onClick={() => {
            const el = document.getElementById('options-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-amber-500/40 hover:border-amber-500 bg-[#fdfbf7]/90 dark:bg-[#253248]/80 hover:bg-amber-50/80 dark:hover:bg-amber-500/10 text-[#b45309] dark:text-amber-300 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer group"
        >
          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 group-hover:rotate-45 transition-transform" />
          <span>Explore Watch Party Features</span>
          <ChevronDown className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-400/80 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </section>

      {/* ── Section 2: The 3 Main Options (Create, Join, Past Rooms) ──────── */}
      <section id="options-section" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl w-full mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white mb-2">
            Choose Your <span className="bg-gradient-to-r from-[#e8890c] to-[#d97706] dark:from-amber-400 dark:to-yellow-400 bg-clip-text text-transparent">Watch Mode</span>
          </h2>
          <p className="text-stone-600 dark:text-white/50 text-xs sm:text-sm max-w-lg mx-auto">
            Instantly host a new stream, join an ongoing watch party with a code, or return to past rooms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full text-left items-stretch mb-12 sm:mb-16">
          {/* Option 1: Create a Room */}
          <div className="rounded-3xl p-5 sm:p-7 bg-white/95 dark:bg-[#253248]/95 border border-stone-200/80 dark:border-white/10 hover:border-amber-400/60 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/30 flex items-center justify-center mb-4 sm:mb-5 text-[#d97706] dark:text-amber-400 shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-500/20 ml-0.5" />
              </div>
              <h3 className="font-black text-lg sm:text-xl text-stone-900 dark:text-white mb-2">Create Room</h3>
              <p className="text-stone-600 dark:text-white/60 text-xs leading-relaxed mb-5 sm:mb-6">
                Start a fresh watch party session. You will be assigned as the Host with full playback and permission controls.
              </p>
            </div>

            {isSignedIn ? (
              <button
                id="create-room-btn"
                onClick={createRoom}
                disabled={creating}
                className="w-full py-3 sm:py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:via-amber-500 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(232,137,12,0.3)] dark:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-60 cursor-pointer active:scale-95"
              >
                {creating ? 'Creating Room…' : (
                  <>
                    <span>Create Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <SignInButton mode="modal">
                <button
                  id="create-room-signin-btn"
                  className="w-full py-3 sm:py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#e8890c] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] dark:from-amber-400 dark:via-amber-500 dark:to-yellow-500 dark:hover:from-amber-300 dark:hover:to-yellow-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(232,137,12,0.3)] dark:shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  Sign In to Create
                </button>
              </SignInButton>
            )}
          </div>

          {/* Option 2: Join a Room */}
          <div className="rounded-3xl p-5 sm:p-7 bg-white/95 dark:bg-[#253248]/95 border border-stone-200/80 dark:border-white/10 hover:border-amber-400/60 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/30 flex items-center justify-center mb-4 sm:mb-5 text-[#d97706] dark:text-amber-400 shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="font-black text-lg sm:text-xl text-stone-900 dark:text-white mb-2">Join Room</h3>
              <p className="text-stone-600 dark:text-white/60 text-xs leading-relaxed mb-5">
                Enter an existing 6-character room code to instantly jump into a watch party with your friends.
              </p>
            </div>

            <form onSubmit={joinRoom} className="flex flex-col gap-2.5">
              <input
                id="join-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError('');
                }}
                placeholder="ROOM CODE"
                maxLength={6}
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-[#f8f6f0] dark:bg-[#1e293b] border border-stone-300/80 dark:border-white/10 text-center text-sm sm:text-base font-mono font-bold tracking-widest text-stone-900 dark:text-amber-300 placeholder:text-stone-400 dark:placeholder:text-white/20 focus:outline-none focus:border-amber-500 focus:shadow-[0_0_12px_rgba(232,137,12,0.2)] transition-all uppercase"
              />
              {joinError && <p className="text-rose-600 dark:text-rose-400 text-xs px-1 font-medium">{joinError}</p>}
              {isSignedIn ? (
                <button
                  id="join-room-btn"
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="w-full py-3 sm:py-3.5 px-5 rounded-xl bg-[#292524] dark:bg-[#1e293b] hover:bg-[#1c1917] dark:hover:bg-[#2d3c56] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95 border dark:border-white/10"
                >
                  {joining ? 'Joining…' : (
                    <>
                      <span>Join Room</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button
                    id="join-room-signin-btn"
                    type="button"
                    className="w-full py-3 sm:py-3.5 px-5 rounded-xl bg-[#292524] dark:bg-[#1e293b] hover:bg-[#1c1917] dark:hover:bg-[#2d3c56] text-white font-bold text-xs sm:text-sm cursor-pointer border dark:border-white/10"
                  >
                    Sign In to Join
                  </button>
                </SignInButton>
              )}
            </form>
          </div>

          {/* Option 3: Past Rooms & Clear History */}
          <div className="md:col-span-2 lg:col-span-1 rounded-3xl p-5 sm:p-7 bg-white/95 dark:bg-[#253248]/95 border border-stone-200/80 dark:border-white/10 hover:border-amber-400/60 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/30 flex items-center justify-center text-[#d97706] dark:text-amber-400 shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <History className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                {isSignedIn && pastRooms.length > 0 && (
                  <button
                    onClick={() => setShowClearModal(true)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    title="Clear your room history"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-black text-lg sm:text-xl text-stone-900 dark:text-white">Past Rooms</h3>
                {isSignedIn && (
                  <span className="text-xs font-mono text-[#b45309] dark:text-amber-300/80 bg-amber-100/70 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/20 font-bold">
                    {pastRooms.length}
                  </span>
                )}
              </div>
              <p className="text-stone-600 dark:text-white/60 text-xs leading-relaxed mb-3">
                Rejoin recent watch party sessions you previously hosted or participated in.
              </p>

              {/* Past Rooms List */}
              <div className="flex-1 overflow-y-auto max-h-[170px] sm:max-h-[160px] flex flex-col gap-2 pr-1 min-h-[120px]">
                {!isSignedIn ? (
                  <div className="flex flex-col items-center justify-center my-auto text-center py-4 text-stone-400 dark:text-white/40 text-xs">
                    <p>Sign in to view your past rooms.</p>
                  </div>
                ) : loadingRooms ? (
                  <div className="flex items-center justify-center my-auto py-4 text-stone-500 dark:text-white/40 text-xs gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                    <span>Loading history…</span>
                  </div>
                ) : pastRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center my-auto text-center py-4 text-stone-400 dark:text-white/40 text-xs">
                    <Clock className="w-6 h-6 mb-1 opacity-40 text-stone-400 dark:text-amber-400" />
                    <p>No past rooms found.</p>
                    <p className="text-[11px] text-stone-400 dark:text-white/30 mt-0.5">Created rooms will show here.</p>
                  </div>
                ) : (
                  pastRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-2.5 sm:p-3 rounded-xl bg-[#faf8f4] dark:bg-[#1e293b] border border-stone-200/80 dark:border-white/5 hover:border-amber-400/60 dark:hover:border-amber-500/30 flex items-center justify-between gap-2.5 transition-all group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-stone-900 dark:text-white">
                            #{room.code}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                              room.role === 'Host'
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                                : room.role === 'Moderator'
                                ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-800 dark:text-pink-300 border border-pink-300 dark:border-pink-500/30'
                                : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-white/60'
                            }`}
                          >
                            {room.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 dark:text-white/40 block mt-0.5">
                          {timeAgo(room.lastActiveAt)}
                        </span>
                      </div>

                      <button
                        onClick={() => router.push(`/room/${room.code}`)}
                        className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 border border-amber-300 dark:border-amber-500/30 text-[#b45309] dark:text-amber-300 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                        title="Rejoin this room"
                      >
                        <span>Rejoin</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 w-full">
          {[
            { icon: Zap, title: '< 300ms Video Sync', desc: 'Drift correction keeps all viewers in perfect synchronization' },
            { icon: Shield, title: 'Host & Mod Controls', desc: 'Automated host succession & role-based playback permissions' },
            { icon: Link2, title: 'Shareable Room Codes', desc: 'One-click invite links and clean 6-character room codes' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/90 dark:bg-[#253248]/90 border border-stone-200/80 dark:border-white/5 rounded-2xl p-4 sm:p-5 text-left shadow-xs dark:shadow-lg hover:border-amber-300 dark:hover:border-amber-500/30 transition-all">
              <Icon className="w-5 h-5 text-[#d97706] dark:text-amber-400 mb-2 sm:mb-2.5" />
              <p className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white mb-1">{title}</p>
              <p className="text-stone-600 dark:text-white/50 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Clear History Confirmation Modal ───────────────────────────────── */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#253248] border border-stone-200 dark:border-rose-500/30 rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 text-left text-stone-900 dark:text-white max-h-[90dvh] overflow-y-auto">
            <button
              onClick={() => setShowClearModal(false)}
              className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-xl text-stone-400 dark:text-white/40 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs dark:shadow-[0_0_15px_rgba(244,63,94,0.3)] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">Clear Room History?</h3>
                <p className="text-xs text-stone-500 dark:text-white/50">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-white/70 leading-relaxed mb-6">
              Are you sure you want to clear your past room history? You will still be able to join or create new rooms anytime.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-800 dark:text-white/80 hover:text-white text-xs sm:text-sm font-semibold transition-all border border-stone-200 dark:border-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs sm:text-sm font-bold transition-all shadow-md dark:shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearing ? 'Clearing…' : 'Yes, Clear'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200/80 dark:border-[#33415c]/60 bg-[#f5f2eb] dark:bg-[#182234] mt-auto transition-colors duration-200">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-10">
            {/* Column 1: Brand Info */}
            <div className="sm:col-span-2 lg:col-span-1 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-[#1c1917] to-[#292524] dark:from-amber-500 dark:to-yellow-400 flex items-center justify-center shadow-xs dark:shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 dark:text-slate-950 fill-amber-400 dark:fill-slate-950 ml-0.5" />
                </div>
                <span className="font-black text-sm sm:text-base tracking-wide text-stone-900 dark:text-white uppercase">
                  SyncTube
                </span>
              </div>
              <p className="text-stone-600 dark:text-slate-300/80 text-xs leading-relaxed max-w-sm">
                Real-time synchronized YouTube watch party sanctuary with sub-300ms drift correction, live chat, and automated role succession.
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold w-fit mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>All Systems Operational</span>
              </div>
            </div>

            {/* Mobile 2-column section for Navigation & Features */}
            <div className="grid grid-cols-2 sm:col-span-2 lg:col-span-2 gap-6 sm:gap-8">
              {/* Column 2: Quick Links */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#b45309] dark:text-amber-400 font-mono mb-3">
                  Navigation
                </h4>
                <ul className="flex flex-col gap-2.5 text-xs text-stone-600 dark:text-slate-300/80">
                  <li>
                    <button
                      onClick={createRoom}
                      className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer text-left font-medium active:scale-95"
                    >
                      Create a Room
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        const el = document.getElementById('options-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                        setTimeout(() => document.getElementById('join-code-input')?.focus(), 400);
                      }}
                      className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer text-left font-medium active:scale-95"
                    >
                      Join with Code
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer text-left font-medium active:scale-95"
                    >
                      Back to Top
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 3: Features */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#b45309] dark:text-amber-400 font-mono mb-3">
                  Features
                </h4>
                <ul className="flex flex-col gap-2.5 text-xs text-stone-600 dark:text-slate-300/80">
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#d97706] dark:text-amber-400 shrink-0" />
                    <span className="truncate">Video Sync</span>
                  </li>
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <Crown className="w-3.5 h-3.5 text-[#d97706] dark:text-amber-400 shrink-0" />
                    <span className="truncate">Host Succession</span>
                  </li>
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#d97706] dark:text-amber-400 shrink-0" />
                    <span className="truncate">Live Chat & Reactions</span>
                  </li>
                  <li className="flex items-center gap-1.5 sm:gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#d97706] dark:text-amber-400 shrink-0" />
                    <span className="truncate">Role Controls</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Column 4: Technology */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#b45309] dark:text-amber-400 font-mono mb-3">
                Powered By
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1e293b] border border-stone-200/90 dark:border-white/10 text-[11px] font-mono font-medium text-stone-700 dark:text-slate-300 shadow-2xs">
                  Next.js 16
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1e293b] border border-stone-200/90 dark:border-white/10 text-[11px] font-mono font-medium text-stone-700 dark:text-slate-300 shadow-2xs">
                  Socket.IO
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1e293b] border border-stone-200/90 dark:border-white/10 text-[11px] font-mono font-medium text-stone-700 dark:text-slate-300 shadow-2xs">
                  YouTube API
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1e293b] border border-stone-200/90 dark:border-white/10 text-[11px] font-mono font-medium text-stone-700 dark:text-slate-300 shadow-2xs">
                  Clerk Auth
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1e293b] border border-stone-200/90 dark:border-white/10 text-[11px] font-mono font-medium text-stone-700 dark:text-slate-300 shadow-2xs">
                  MongoDB Atlas
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1e293b] border border-stone-200/90 dark:border-white/10 text-[11px] font-mono font-medium text-stone-700 dark:text-slate-300 shadow-2xs">
                  Tailwind CSS
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Meta & Copyright */}
          <div className="pt-6 border-t border-stone-200/90 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 dark:text-slate-400 text-center sm:text-left pb-safe">
            <p>© {new Date().getFullYear()} SyncTube Watch Party. All rights reserved.</p>
            <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4">
              <span className="text-[11px] font-mono text-stone-500 dark:text-amber-400/80">
                Designed for synchronized shared viewing
              </span>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 dark:text-white/70 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                title="Scroll to top"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Top</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
