import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@/types/events';
import { RoomManager } from '../RoomManager';
import { PermissionPolicy } from '../PermissionPolicy';
import { parseYouTubeUrl } from '@/lib/youtube';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerPlaybackHandlers(
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

  // ── play ──────────────────────────────────────────────────────────────────
  socket.on('play', (data) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'play')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Not allowed to play.' });
      return;
    }
    const currentTime = ctx.room.getLivePosition();
    ctx.room.applyPlay(currentTime);
    ctx.room.broadcast('sync_state', ctx.room.getSyncState());
  });

  // ── pause ─────────────────────────────────────────────────────────────────
  socket.on('pause', (data) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'pause')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Not allowed to pause.' });
      return;
    }
    const currentTime = ctx.room.getLivePosition();
    ctx.room.applyPause(currentTime);
    ctx.room.broadcast('sync_state', ctx.room.getSyncState());
  });

  // ── seek ──────────────────────────────────────────────────────────────────
  socket.on('seek', ({ time }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'seek')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Not allowed to seek.' });
      return;
    }
    ctx.room.applySeek(time);
    ctx.room.broadcast('sync_state', ctx.room.getSyncState());
  });

  // ── change_video ──────────────────────────────────────────────────────────
  socket.on('change_video', ({ videoId }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!PermissionPolicy.can(ctx.participant.role, 'change_video')) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Not allowed to change video.' });
      return;
    }
    const parsed = parseYouTubeUrl(videoId);
    if (!parsed) {
      socket.emit('error', { code: 'INVALID_VIDEO', message: 'Invalid YouTube URL or video ID.' });
      return;
    }
    ctx.room.applyChangeVideo(parsed);
    ctx.room.broadcast('sync_state', ctx.room.getSyncState());
  });
}
