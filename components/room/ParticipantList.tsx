'use client';

import { useRoom } from '@/hooks/useRoom';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket-client';
import { Crown, Star, Plus, X, UserMinus, Shield, LogOut } from 'lucide-react';
import type { ParticipantInfo } from '@/types/events';
import type { Role } from '@/types/roles';

interface ParticipantListProps {
  onLeave?: () => void;
}

export function ParticipantList({ onLeave }: ParticipantListProps) {
  const { participants, me, isHost, isModerator, roomId } = useRoom();
  const socket = getSocket();

  function assignRole(userId: string, role: Role) {
    try {
      socket.emit('assign_role', { userId, role });
    } catch (_) {}

    if (roomId) {
      fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignRole: role, targetUserId: userId }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data?.participants) {
              useRoomStore.getState().setParticipants(data.participants);
            }
          }
        })
        .catch(() => {});
    }
  }

  function removeParticipant(userId: string) {
    try {
      socket.emit('remove_participant', { userId });
    } catch (_) {}

    if (roomId) {
      fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeUserId: userId }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data?.participants) {
              useRoomStore.getState().setParticipants(data.participants);
            }
          }
        })
        .catch(() => {});
    }
  }

  function transferHost(userId: string) {
    try {
      socket.emit('transfer_host', { userId });
    } catch (_) {}

    if (roomId) {
      fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferHostTo: userId }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data?.participants) {
              useRoomStore.getState().setParticipants(data.participants);
            }
          }
        })
        .catch(() => {});
    }
  }

  // Sort: Host first, then Moderators, then Participants
  const sortedParticipants = [...participants].sort((a, b) => {
    const score = (r: string) => (r === 'Host' ? 3 : r === 'Moderator' ? 2 : 1);
    return score(b.role) - score(a.role);
  });

  return (
    <div className="flex flex-col h-full min-h-0 text-stone-900 dark:text-white">
      <div className="flex items-center justify-between mb-1 sm:mb-2 px-1 flex-shrink-0">
        <h3 className="text-xs sm:text-base font-extrabold text-stone-900 dark:text-white tracking-wide">
          Participants <span className="text-stone-500 dark:text-white/50 font-normal text-[11px] sm:text-sm">({participants.length})</span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1.5 sm:gap-2 pr-0.5 sm:pr-1">
        {sortedParticipants.map((p: ParticipantInfo, idx: number) => {
          const isMe = p.userId === me?.userId;
          const isUserHost = p.role === 'Host';
          const isUserMod = p.role === 'Moderator';
          const rank = idx + 1;

          if (isUserHost) {
            return (
              <div key={p.userId} className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-4 text-center text-xs font-mono text-[#b45309] dark:text-amber-400 font-bold shrink-0">{rank}</span>
                <div className="flex-1 min-w-0 rounded-xl p-2 sm:p-2.5 border border-amber-300/90 dark:border-amber-500/30 bg-amber-50/75 dark:bg-amber-500/10 shadow-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#e8890c] to-[#d97706] border-2 border-amber-300 dark:border-amber-400/50 flex items-center justify-center text-white text-xs font-extrabold shadow-xs">
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                      <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500 absolute -top-1.5 -right-1 drop-shadow-xs" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-[#b45309] dark:text-amber-400 tracking-wider uppercase block leading-none mb-0.5 sm:mb-1">
                        HOST
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate leading-tight">
                        {p.username} {isMe && <span className="text-stone-500 dark:text-white/50 text-[10px] sm:text-[11px] font-normal">(you)</span>}
                      </p>
                      <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 leading-none mt-0.5 sm:mt-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                      </span>
                    </div>
                  </div>

                  {/* Actions for Host */}
                  {isHost && !isMe && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => removeParticipant(p.userId)}
                        className="flex flex-col items-center gap-0.5 p-1 sm:p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-all text-[9px] sm:text-[10px] cursor-pointer active:scale-95"
                        title="Kick"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Kick</span>
                      </button>
                      <button
                        onClick={() => assignRole(p.userId, 'Moderator')}
                        className="flex flex-col items-center gap-0.5 p-1 sm:p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 text-[#b45309] dark:text-amber-300 transition-all text-[9px] sm:text-[10px] cursor-pointer active:scale-95"
                        title="Promote"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Promote</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (isUserMod) {
            return (
              <div key={p.userId} className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-4 text-center text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{rank}</span>
                <div className="flex-1 min-w-0 rounded-xl p-2 sm:p-2.5 border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 shadow-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border-2 border-indigo-300 dark:border-indigo-400/50 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase block leading-none mb-0.5 sm:mb-1">
                        MODERATOR
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate leading-tight">
                        {p.username} {isMe && <span className="text-stone-500 dark:text-white/50 text-[10px] sm:text-[11px] font-normal">(you)</span>}
                      </p>
                      <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 leading-none mt-0.5 sm:mt-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                      </span>
                    </div>
                  </div>

                  {/* Actions on Moderator */}
                  {isHost && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => removeParticipant(p.userId)}
                        className="flex flex-col items-center gap-0.5 p-1 sm:p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 text-amber-700 dark:text-amber-300 transition-all text-[9px] sm:text-[10px] cursor-pointer active:scale-95"
                        title="Kick"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        <span>Kick</span>
                      </button>
                      <button
                        onClick={() => assignRole(p.userId, 'Participant')}
                        className="flex flex-col items-center gap-0.5 p-1 sm:p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all text-[9px] sm:text-[10px] cursor-pointer active:scale-95"
                        title="Demote"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Demote</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Participant / Viewer
          return (
            <div key={p.userId} className="flex items-center gap-1.5 sm:gap-2 group">
              <span className="w-4 text-center text-xs font-mono text-stone-400 dark:text-white/40 shrink-0">{rank}</span>
              <div className="flex-1 min-w-0 rounded-xl p-2 sm:p-2.5 border border-stone-200/80 dark:border-white/5 bg-[#faf8f4] dark:bg-[#1e293b] hover:bg-[#f5f2eb] dark:hover:bg-[#253248] transition-all flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-300 dark:bg-slate-700 border border-stone-400 dark:border-slate-600 flex items-center justify-center text-stone-800 dark:text-slate-200 text-xs font-bold shrink-0">
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-stone-500 dark:text-white/50 tracking-wider uppercase block leading-none mb-0.5 sm:mb-1">
                      PARTICIPANT
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white truncate leading-tight">
                      {p.username} {isMe && <span className="text-stone-500 dark:text-white/50 text-[10px] sm:text-[11px] font-normal">(you)</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Host controls on participant: always accessible on touch devices, hover on desktop */}
                  {isHost && (
                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => assignRole(p.userId, 'Moderator')}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 text-stone-600 dark:text-white/70 hover:text-amber-700 dark:hover:text-amber-400 transition-all cursor-pointer active:scale-90"
                        title="Promote to Moderator"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => transferHost(p.userId)}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 text-stone-600 dark:text-white/70 hover:text-amber-700 dark:hover:text-amber-400 transition-all cursor-pointer active:scale-90"
                        title="Transfer Host"
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeParticipant(p.userId)}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-stone-600 dark:text-white/70 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer active:scale-90"
                        title="Remove"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 leading-none font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onLeave && (
        <div className="pt-2 sm:pt-2.5 border-t border-stone-200 dark:border-white/10 mt-auto flex-shrink-0">
          <button
            onClick={onLeave}
            className="w-full py-2 sm:py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 hover:border-rose-300 dark:hover:border-rose-500/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Leave Watch Party</span>
          </button>
        </div>
      )}
    </div>
  );
}
