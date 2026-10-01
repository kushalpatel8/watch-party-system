'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import { Play, Users, Link2, ArrowRight, Tv2, Zap, Shield } from 'lucide-react';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

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
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch(`/api/rooms/${joinCode.trim().toUpperCase()}`);
      if (!res.ok) {
        setJoinError('Room not found. Check the code and try again.');
        setJoining(false);
        return;
      }
      router.push(`/room/${joinCode.trim().toUpperCase()}`);
    } catch {
      setJoinError('Something went wrong. Try again.');
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Tv2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            WatchParty
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isLoaded && (
            isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
                  Sign In
                </button>
              </SignInButton>
            )
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-8">
          <Zap className="w-3 h-3" />
          Real-time YouTube sync
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold mb-6 leading-tight">
          Watch Together,{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            In Sync
          </span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mb-12 leading-relaxed">
          Create a room, share the link, and enjoy YouTube videos in perfect sync with anyone in the world. 
          Full role-based controls for hosts and moderators.
        </p>

        {/* Action cards */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
          {/* Create room */}
          <div className="glass rounded-2xl p-6 flex-1 flex flex-col gap-4 hover:border-violet-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto">
              <Play className="w-6 h-6 text-violet-400 ml-0.5" />
            </div>
            <div>
              <h2 className="font-bold text-lg mb-1">Create a Room</h2>
              <p className="text-muted-foreground text-sm">Get a shareable link instantly. You're the host.</p>
            </div>
            {isSignedIn ? (
              <button
                id="create-room-btn"
                onClick={createRoom}
                disabled={creating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold transition-all flex items-center justify-center gap-2 glow-primary disabled:opacity-60"
              >
                {creating ? 'Creating…' : (
                  <>Create Room <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            ) : (
              <SignInButton mode="modal">
                <button
                  id="create-room-signin-btn"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold transition-all"
                >
                  Sign in to Create
                </button>
              </SignInButton>
            )}
          </div>

          {/* Join room */}
          <div className="glass rounded-2xl p-6 flex-1 flex flex-col gap-4 hover:border-cyan-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg mb-1">Join a Room</h2>
              <p className="text-muted-foreground text-sm">Enter a 6-character code to join your friends.</p>
            </div>
            <form onSubmit={joinRoom} className="flex flex-col gap-2">
              <input
                id="join-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-center text-xl font-mono font-bold tracking-widest text-cyan-400 placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
              />
              {joinError && <p className="text-red-400 text-xs">{joinError}</p>}
              {isSignedIn ? (
                <button
                  id="join-room-btn"
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold transition-all flex items-center justify-center gap-2 glow-accent disabled:opacity-60"
                >
                  {joining ? 'Joining…' : (
                    <>Join Room <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button
                    id="join-room-signin-btn"
                    type="button"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold"
                  >
                    Sign in to Join
                  </button>
                </SignInButton>
              )}
            </form>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-2xl">
          {[
            { icon: Zap, title: '< 300ms Sync', desc: 'Real-time playback kept perfectly in sync' },
            { icon: Shield, title: 'Role-Based Access', desc: 'Host, Moderator, Participant with enforced controls' },
            { icon: Link2, title: 'Shareable Links', desc: 'One-click invite with a room code or URL' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-4 text-left">
              <Icon className="w-5 h-5 text-violet-400 mb-2" />
              <p className="font-semibold text-sm mb-1">{title}</p>
              <p className="text-muted-foreground text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
