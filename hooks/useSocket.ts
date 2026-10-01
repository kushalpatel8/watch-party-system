'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket-client';
import { useRoomStore } from '@/store/roomStore';

/**
 * Connects the socket with a fresh Clerk token and wires all global store updates.
 * Call this once at the room page level.
 */
export function useSocket(roomId: string) {
  const { getToken, userId } = useAuth();
  const store = useRoomStore();
  const joined = useRef(false);

  useEffect(() => {
    if (!userId || !roomId) return;
    store.setMyUserId(userId);

    let isMounted = true;
    let socket = getSocket();

    function removeListeners() {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sync_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('host_transferred');
      socket.off('change_requested');
      socket.off('request_resolved');
      socket.off('chat_message');
      socket.off('reaction');
    }

    async function connect() {
      const token = await getToken();
      if (!token || !isMounted) return;

      socket = connectSocket(token);

      // Clean up previous listeners first
      removeListeners();

      socket.on('connect', () => {
        if (!isMounted) return;
        store.setConnected(true);
        if (!joined.current) {
          socket.emit('join_room', { roomId });
          joined.current = true;
        }
      });

      socket.on('disconnect', () => {
        if (!isMounted) return;
        store.setConnected(false);
        joined.current = false;
      });

      socket.on('sync_state', (data) => {
        if (isMounted) store.setSyncState(data);
      });
      socket.on('user_joined', ({ participants }) => {
        if (isMounted) store.setParticipants(participants);
      });
      socket.on('user_left', ({ participants }) => {
        if (isMounted) store.setParticipants(participants);
      });
      socket.on('role_assigned', ({ participants }) => {
        if (isMounted) store.setParticipants(participants);
      });
      socket.on('participant_removed', ({ participants }) => {
        if (isMounted) store.setParticipants(participants);
      });
      socket.on('host_transferred', ({ participants }) => {
        if (isMounted) store.setParticipants(participants);
      });
      socket.on('change_requested', (req) => {
        if (isMounted) store.addRequest(req);
      });
      socket.on('request_resolved', ({ requestId }) => {
        if (isMounted) store.removeRequest(requestId);
      });
      socket.on('chat_message', (m) => {
        if (isMounted) store.addChatMessage(m);
      });
      socket.on('reaction', (r) => {
        if (!isMounted) return;
        store.addReaction(r);
        setTimeout(() => {
          if (isMounted) store.removeReaction(`${r.userId}-${r.timestamp}`);
        }, 3000);
      });

      if (socket.connected && !joined.current) {
        store.setConnected(true);
        socket.emit('join_room', { roomId });
        joined.current = true;
      }
    }

    connect();

    return () => {
      isMounted = false;
      removeListeners();
      socket.emit('leave_room', { roomId });
      disconnectSocket();
      store.reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roomId]);
}
