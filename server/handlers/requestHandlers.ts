import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData, ChangeRequest } from '../../types/events';
import { RoomManager } from '../RoomManager';
import { PermissionPolicy } from '../PermissionPolicy';
import { parseYouTubeUrl } from '../../lib/youtube';
import { nanoid } from 'nanoid';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerRequestHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: Sock
) {
  const manager = RoomManager.getInstance();

  function getContext() {
    const roomId = socket.data.roomId;
    if (!roomId) return null;
    const room = manager.get(roomId);
    if (!room) return null;
    const participant = room.getParticipant(socket.data.userId);
    if (!participant) return null;
    return { room, participant };
  }

  // ── request_change ────────────────────────────────────────────────────────
  socket.on('request_change', ({ type, payload }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'request_change')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Only participants can make change requests.' });
      return;
    }
    const request: ChangeRequest = {
      requestId: nanoid(),
      requesterUserId: ctx.participant.userId,
      requesterUsername: ctx.participant.username,
      type,
      payload,
      createdAt: Date.now(),
    };
    ctx.room.pendingRequests.set(request.requestId, request);

    // Notify only Host and Moderators
    ctx.room.broadcastToRoles(['Host', 'Moderator'], 'change_requested', request);

    // Notify the requester that their request was successfully submitted
    socket.emit('request_sent', {
      requestId: request.requestId,
      type: request.type,
      payload: request.payload,
    });
  });

  // ── resolve_request ───────────────────────────────────────────────────────
  socket.on('resolve_request', ({ requestId, approve }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'approve_request')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Not allowed to resolve requests.' });
      return;
    }
    const request = ctx.room.pendingRequests.get(requestId);
    if (!request) {
      socket.emit('error', { code: 'NOT_FOUND', message: 'Request not found or already resolved.' });
      return;
    }
    ctx.room.pendingRequests.delete(requestId);

    // Broadcast resolution to the entire room with full metadata
    ctx.room.broadcast('request_resolved', {
      requestId,
      approve,
      resolverUsername: ctx.participant.username,
      requesterUserId: request.requesterUserId,
      requesterUsername: request.requesterUsername,
      type: request.type,
      payload: request.payload,
    });

    // If approved, execute the action
    if (approve) {
      switch (request.type) {
        case 'play': {
          ctx.room.applyPlay(ctx.room.getLivePosition());
          ctx.room.broadcast('sync_state', ctx.room.getSyncState());
          break;
        }
        case 'pause': {
          ctx.room.applyPause(ctx.room.getLivePosition());
          ctx.room.broadcast('sync_state', ctx.room.getSyncState());
          break;
        }
        case 'seek': {
          const time = Number(request.payload.time ?? 0);
          ctx.room.applySeek(time);
          ctx.room.broadcast('sync_state', ctx.room.getSyncState());
          break;
        }
        case 'change_video': {
          const raw = String(request.payload.videoId ?? '');
          const videoId = parseYouTubeUrl(raw);
          if (videoId) {
            ctx.room.applyChangeVideo(videoId);
            ctx.room.broadcast('sync_state', ctx.room.getSyncState());
          }
          break;
        }
      }
    }
  });
}
