'use client';

import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket-client';
import { useRoomStore } from '@/store/roomStore';
import { toast } from '@/store/toastStore';

/**
 * Connects the socket with a fresh Clerk token and wires all global store updates.
 * Call this once at the room page level.
 */
export function useSocket(roomId: string) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const store = useRoomStore();
  const joined = useRef(false);

  useEffect(() => {
    if (!userId || !roomId) return;
    store.setMyUserId(userId);

    let isMounted = true;
    let socket = getSocket();

    function removeListeners() {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('sync_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('host_transferred');
      socket.off('change_requested');
      socket.off('request_sent');
      socket.off('request_resolved');
      socket.off('chat_message');
      socket.off('reaction');
      socket.off('error');
    }

    async function connect() {
      let token: string | null = null;
      try {
        token = await getToken();
      } catch (tokenErr) {
        console.warn('[useSocket] Failed to retrieve Clerk token:', tokenErr);
      }
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

      socket.on('connect_error', (err) => {
        if (!isMounted) return;
        console.warn('[useSocket] Socket connect_error:', err?.message || err);
        store.setConnected(false);
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
        if (!isMounted) return;
        store.addRequest(req);
        // Notify host / mod
        const label = req.type === 'change_video' ? 'change the video' : req.type;
        toast.request(
          'New Request Received',
          `${req.requesterUsername} requested to ${label}.`
        );
      });
      socket.on('request_sent', ({ type }) => {
        if (!isMounted) return;
        const label = type === 'change_video' ? 'Video change' : `${type}`;
        toast.request(
          'Request Sent 📨',
          `${label} request submitted to the host.`
        );
      });
      socket.on('request_resolved', ({ requestId, approve, resolverUsername, requesterUserId, requesterUsername, type }) => {
        if (!isMounted) return;
        store.removeRequest(requestId);

        const isMeRequester = requesterUserId === userId;
        const label = type === 'change_video' ? 'video change' : 'change';

        if (isMeRequester) {
          if (approve) {
            toast.success(
              'Request Accepted! 🎉',
              `Your ${label} request was approved by ${resolverUsername}.`
            );
          } else {
            toast.error(
              'Request Declined ✕',
              `Your ${label} request was rejected by ${resolverUsername}.`
            );
          }
        } else if (approve) {
          toast.info(
            'Request Approved',
            `${resolverUsername} accepted ${requesterUsername ? `${requesterUsername}'s` : 'a'} ${label} request.`
          );
        }
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
      socket.on('error', ({ message }) => {
        if (isMounted && message) {
          toast.error('Notice', message);
        }
      });

      if (socket.connected && !joined.current) {
        store.setConnected(true);
        socket.emit('join_room', { roomId });
        joined.current = true;
      }
    }

    store.setRoomId(roomId);
    connect();

    // Fallback polling for REST-based sync if WebSockets are unavailable or in serverless environments
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      if (!socket.connected) {
        try {
          const uname = user?.username || user?.firstName || 'User';
          const imgUrl = user?.imageUrl || '';
          const res = await fetch(
            `/api/rooms/${roomId}?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(uname)}&imageUrl=${encodeURIComponent(imgUrl)}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.participants && Array.isArray(data.participants)) {
              store.setParticipants(data.participants);
            }
            if (data?.syncState) {
              const currentSync = useRoomStore.getState().syncState;
              const incoming = data.syncState;
              const isVideoDiff = incoming.videoId && incoming.videoId !== currentSync?.videoId;
              const isPlayStateDiff = incoming.playState !== currentSync?.playState;
              const isNewer = (incoming.updatedAt || 0) >= (currentSync?.updatedAt || 0);

              if (isVideoDiff || isPlayStateDiff || isNewer) {
                store.setSyncState(incoming);
              }
            } else if (data?.currentVideoId) {
              const currentSync = useRoomStore.getState().syncState;
              if (!currentSync?.videoId || currentSync.videoId !== data.currentVideoId) {
                store.setSyncState({
                  videoId: data.currentVideoId,
                  playState: 'paused',
                  currentTime: 0,
                  updatedAt: Date.now(),
                });
              }
            }
          }
        } catch (_) {}
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      removeListeners();
      try {
        socket.emit('leave_room', { roomId });
      } catch (_) {}
      disconnectSocket();
      store.reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roomId, user]);
}
