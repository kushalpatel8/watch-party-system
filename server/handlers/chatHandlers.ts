import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/events';
import { RoomManager } from '../RoomManager';

type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerChatHandlers(
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

  let lastMessageText = '';
  let lastMessageTime = 0;

  socket.on('chat_message', ({ text }) => {
    const ctx = getContext();
    if (!ctx) return;
    const trimmed = text?.trim();
    if (!trimmed || trimmed.length > 500) return;

    const now = Date.now();
    if (trimmed === lastMessageText && now - lastMessageTime < 800) {
      return; // Ignore duplicate rapid submission
    }
    lastMessageText = trimmed;
    lastMessageTime = now;

    ctx.room.broadcast('chat_message', {
      userId: ctx.participant.userId,
      username: ctx.participant.username,
      text: trimmed,
      timestamp: now,
    });
  });

  socket.on('reaction', ({ emoji }) => {
    const ctx = getContext();
    if (!ctx) return;
    if (!emoji) return;

    ctx.room.broadcast('reaction', {
      userId: ctx.participant.userId,
      username: ctx.participant.username,
      emoji,
      timestamp: Date.now(),
    });
  });
}
