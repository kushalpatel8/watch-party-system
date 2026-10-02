import { create } from 'zustand';
import type { ParticipantInfo, SyncState, ChangeRequest } from '@/types/events';

interface RoomStore {
  // Connection
  connected: boolean;
  setConnected: (v: boolean) => void;

  // Room state
  roomId: string | null;
  setRoomId: (id: string | null) => void;

  // Participants
  participants: ParticipantInfo[];
  setParticipants: (p: ParticipantInfo[]) => void;

  // Current user
  myUserId: string | null;
  setMyUserId: (id: string | null) => void;

  // Sync / playback
  syncState: SyncState | null;
  setSyncState: (s: SyncState | null) => void;

  // Pending requests
  pendingRequests: ChangeRequest[];
  addRequest: (r: ChangeRequest) => void;
  removeRequest: (id: string) => void;

  // Chat
  chatMessages: { id?: string; userId: string; username: string; text: string; timestamp: number }[];
  addChatMessage: (m: { id?: string; userId: string; username: string; text: string; timestamp: number }) => void;
  setChatMessages: (msgs: { id?: string; userId: string; username: string; text: string; timestamp: number }[]) => void;

  // Reactions (ephemeral)
  reactions: { userId: string; username: string; emoji: string; timestamp: number; id: string }[];
  addReaction: (r: { userId: string; username: string; emoji: string; timestamp: number }) => void;
  removeReaction: (id: string) => void;

  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),

  roomId: null,
  setRoomId: (id) => set({ roomId: id }),

  participants: [],
  setParticipants: (p) => set({ participants: p }),

  myUserId: null,
  setMyUserId: (id) => set({ myUserId: id }),

  syncState: null,
  setSyncState: (s) => set({ syncState: s }),

  pendingRequests: [],
  addRequest: (r) => set((state) => ({ pendingRequests: [...state.pendingRequests, r] })),
  removeRequest: (id) =>
    set((state) => ({ pendingRequests: state.pendingRequests.filter((r) => r.requestId !== id) })),

  chatMessages: [],
  addChatMessage: (m) =>
    set((state) => {
      const isDuplicate = state.chatMessages.some(
        (msg) =>
          (Boolean(m.id && msg.id) && m.id === msg.id) ||
          (msg.userId === m.userId &&
            msg.text === m.text &&
            Math.abs(msg.timestamp - m.timestamp) < 5000)
      );
      if (isDuplicate) return state;
      return {
        chatMessages: [...state.chatMessages.slice(-199), m],
      };
    }),
  setChatMessages: (msgs) =>
    set((state) => {
      if (!msgs || msgs.length === 0) return state;
      const combined = [...state.chatMessages];

      for (const incoming of msgs) {
        const isExisting = combined.some(
          (m) =>
            (Boolean(incoming.id && m.id) && incoming.id === m.id) ||
            (m.userId === incoming.userId &&
              m.text === incoming.text &&
              Math.abs(m.timestamp - incoming.timestamp) < 5000)
        );

        if (!isExisting) {
          combined.push(incoming);
        }
      }

      combined.sort((a, b) => a.timestamp - b.timestamp);
      return { chatMessages: combined.slice(-200) };
    }),

  reactions: [],
  addReaction: (r) =>
    set((state) => ({
      reactions: [
        ...state.reactions,
        { ...r, id: `${r.userId}-${r.timestamp}` },
      ],
    })),
  removeReaction: (id) =>
    set((state) => ({ reactions: state.reactions.filter((r) => r.id !== id) })),

  reset: () =>
    set({
      connected: false,
      roomId: null,
      participants: [],
      myUserId: null,
      syncState: null,
      pendingRequests: [],
      chatMessages: [],
      reactions: [],
    }),
}));
