'use client';

import { useRoom } from '@/hooks/useRoom';
import { RoleBadge } from './RoleBadge';
import { getSocket } from '@/lib/socket-client';
import { MoreVertical, UserMinus, Crown, Shield } from 'lucide-react';
import type { ParticipantInfo } from '@/types/events';
import type { Role } from '@/types/roles';

export function ParticipantList() {
  const { participants, me, isHost } = useRoom();
  const socket = getSocket();

  function assignRole(userId: string, role: Role) {
    socket.emit('assign_role', { userId, role });
  }

  function removeParticipant(userId: string) {
    socket.emit('remove_participant', { userId });
  }

  function transferHost(userId: string) {
    socket.emit('transfer_host', { userId });
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
        Viewers · {participants.length}
      </p>
      {participants.map((p: ParticipantInfo) => {
        const isMe = p.userId === me?.userId;
        return (
          <div
            key={p.userId}
            className="group flex items-center gap-3 px-3 py-2 rounded-xl glass hover:bg-white/5 transition-all"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {p.username.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">
                {p.username} {isMe && <span className="text-muted-foreground text-xs">(you)</span>}
              </p>
            </div>

            <RoleBadge role={p.role} />

            {/* Host actions */}
            {isHost && !isMe && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {p.role !== 'Host' && (
                  <>
                    {p.role !== 'Moderator' && (
                      <button
                        title="Promote to Moderator"
                        onClick={() => assignRole(p.userId, 'Moderator')}
                        className="p-1 rounded hover:bg-violet-500/20 text-muted-foreground hover:text-violet-400 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {p.role === 'Moderator' && (
                      <button
                        title="Demote to Participant"
                        onClick={() => assignRole(p.userId, 'Participant')}
                        className="p-1 rounded hover:bg-slate-500/20 text-muted-foreground hover:text-slate-400 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 opacity-50" />
                      </button>
                    )}
                    <button
                      title="Transfer Host"
                      onClick={() => transferHost(p.userId)}
                      className="p-1 rounded hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400 transition-colors"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Remove"
                      onClick={() => removeParticipant(p.userId)}
                      className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
