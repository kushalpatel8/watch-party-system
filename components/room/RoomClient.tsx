'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useSocket } from '@/hooks/useSocket';
import { useRoom } from '@/hooks/useRoom';
import { YouTubePlayer } from '@/components/room/YouTubePlayer';
import { PlayerControls } from '@/components/room/PlayerControls';
import { VideoUrlInput } from '@/components/room/VideoUrlInput';
import { ParticipantList } from '@/components/room/ParticipantList';
import { ChangeRequestPanel } from '@/components/room/ChangeRequestPanel';
import { Chat } from '@/components/room/Chat';
import { ReactionBar } from '@/components/room/ReactionBar';
import { getSocket } from '@/lib/socket-client';
import { Copy, Check, Wifi, WifiOff, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

interface RoomClientProps {
  roomId: string;
}

export function RoomClient({ roomId }: RoomClientProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'requests'>('chat');

  // Connect socket and sync store
  useSocket(roomId);

  const { connected, canControl, myRole, pendingRequests, syncState } = useRoom();

  function copyLink() {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to join this room.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-white/5 glass sticky top-0 z-10">
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2 font-mono font-bold text-lg tracking-widest text-violet-400">
          {roomId}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {connected ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3.5 h-3.5" /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400">
              <WifiOff className="w-3.5 h-3.5" /> Connecting…
            </span>
          )}
        </div>

        <div className="flex-1" />

        <span className="hidden sm:inline text-xs text-muted-foreground capitalize">{myRole}</span>

        <button
          id="copy-link-btn"
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass hover:bg-white/10 text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>

        <UserButton />
      </header>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Player area */}
        <div className="flex-1 flex flex-col p-4 gap-4">
          <YouTubePlayer roomId={roomId} />

          {/* Controls */}
          <div className="glass rounded-2xl p-4 flex flex-col gap-4">
            <PlayerControls />
            {canControl && <VideoUrlInput />}
            {!canControl && syncState?.videoId && (
              <div className="flex items-center justify-center">
                <button
                  id="request-change-btn"
                  onClick={() => {
                    const url = prompt('YouTube URL to request:');
                    if (!url) return;
                    getSocket().emit('request_change', { type: 'change_video', payload: { videoId: url } });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-muted-foreground hover:text-foreground transition-all border border-white/10"
                >
                  <Send className="w-3.5 h-3.5" />
                  Request a video change
                </button>
              </div>
            )}

            {/* Reactions */}
            <div className="border-t border-white/5 pt-4">
              <ReactionBar />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-white/5">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {[
              { key: 'chat', label: 'Chat' },
              { key: 'participants', label: 'Viewers' },
              ...(pendingRequests.length > 0 ? [{ key: 'requests', label: `Requests ${pendingRequests.length}` }] : []),
            ].map(({ key, label }) => (
              <button
                key={key}
                id={`tab-${key}`}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 py-3 text-xs font-semibold transition-all ${
                  activeTab === key
                    ? 'text-violet-400 border-b-2 border-violet-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'chat' && <Chat />}
            {activeTab === 'participants' && <ParticipantList />}
            {activeTab === 'requests' && <ChangeRequestPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
