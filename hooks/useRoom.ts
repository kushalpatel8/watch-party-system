'use client';

import { useRoomStore } from '@/store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import type { ParticipantInfo } from '@/types/events';

/**
 * Derived helpers for the current user and room.
 */
export function useRoom() {
  const {
    participants,
    myUserId,
    syncState,
    pendingRequests,
    chatMessages,
    reactions,
    connected,
    roomId,
  } = useRoomStore(useShallow((s) => ({
    participants: s.participants,
    myUserId: s.myUserId,
    syncState: s.syncState,
    pendingRequests: s.pendingRequests,
    chatMessages: s.chatMessages,
    reactions: s.reactions,
    connected: s.connected,
    roomId: s.roomId,
  })));

  const me: ParticipantInfo | undefined = participants.find((p) => p.userId === myUserId);
  const myRole = me?.role ?? 'Participant';
  const isHost = myRole === 'Host';
  const isModerator = myRole === 'Moderator';
  const canControl = isHost || isModerator;

  return {
    participants,
    me,
    myUserId,
    myRole,
    isHost,
    isModerator,
    canControl,
    syncState,
    pendingRequests,
    chatMessages,
    reactions,
    connected,
    roomId,
  };
}
